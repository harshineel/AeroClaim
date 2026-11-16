package com.aeroclaim.service;

import com.aeroclaim.config.AppProperties;
import com.aeroclaim.domain.*;
import com.aeroclaim.dto.Dtos.*;
import com.aeroclaim.repo.ClaimRepository;
import com.aeroclaim.repo.PaymentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.Year;
import java.util.*;

@Service
public class ClaimService {
    public static final String MAIN_PROCESS_ID = "parametric-claim-main";
    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    private final ClaimRepository claims;
    private final PaymentRepository payments;
    private final ProcessGateway gateway;
    private final EventLogService log;
    private final AppProperties props;
    private final SecureRandom random = new SecureRandom();

    public ClaimService(ClaimRepository claims, PaymentRepository payments, ProcessGateway gateway, EventLogService log, AppProperties props) {
        this.claims = claims;
        this.payments = payments;
        this.gateway = gateway;
        this.log = log;
        this.props = props;
    }

    /** Persist the claim, then start the Camunda process instance with the claim as the initial variable payload. */
    public ClaimView submit(ClaimRequest req) {
        Claim claim = persistNew(req);
        Map<String, Object> variables = buildStartPayload(claim);
        try {
            long key = gateway.startProcess(MAIN_PROCESS_ID, variables);
            claims.updateProcessInstanceKey(claim.getClaimId(), String.valueOf(key), Instant.now());
            log.log(claim.getClaimId(), "SYSTEM", "PROCESS_STARTED", "Process instance " + key + " started in Camunda 8 (" + MAIN_PROCESS_ID + ")");
        } catch (RuntimeException ex) {
            claims.updateTerminalStatus(claim.getClaimId(), ClaimStatus.REJECTED, "Could not start workflow: " + ex.getMessage(), Instant.now());
            log.log(claim.getClaimId(), "SYSTEM", "START_FAILED", "Workflow engine unreachable: " + ex.getMessage());
            throw ex;
        }
        return get(claim.getClaimId());
    }

    /** Cascades to flights, travelers and the first audit event; save() runs in its own repository transaction. */
    private Claim persistNew(ClaimRequest req) {
        Claim c = new Claim();
        c.setClaimId(newClaimId());
        c.setPolicyNumber(req.policyNumber().trim().toUpperCase());
        c.setClaimantName(req.claimant().name().trim());
        c.setClaimantEmail(req.claimant().email().trim());
        c.setStatus(ClaimStatus.SUBMITTED);
        c.setSlaDuration(req.slaDuration() == null || req.slaDuration().isBlank() ? props.defaultSla() : req.slaDuration());
        c.setCreatedAt(Instant.now());
        c.setUpdatedAt(c.getCreatedAt());
        for (FlightDto f : req.flights()) {
            FlightLeg leg = new FlightLeg();
            leg.setFlightNumber(f.flightNumber().replace(" ", "").toUpperCase());
            leg.setFlightDate(f.date());
            leg.setOrigin(f.origin().toUpperCase());
            leg.setDestination(f.destination().toUpperCase());
            c.addFlight(leg);
        }
        for (TravelerDto t : req.travelers()) {
            Traveler tr = new Traveler();
            tr.setName(t.name().trim());
            tr.setEmail(t.email().trim());
            c.addTraveler(tr);
        }
        c.addEvent(new ClaimEvent("SYSTEM", "CLAIM_RECEIVED", "Claim submitted by " + c.getClaimantName() + " for policy " + c.getPolicyNumber()));
        return claims.save(c);
    }

    /** Initial process variables. Dates are ISO strings so FEEL and the REST connector receive plain JSON. */
    Map<String, Object> buildStartPayload(Claim claim) {
        Map<String, Object> vars = new LinkedHashMap<>();
        vars.put("claimId", claim.getClaimId());
        vars.put("policyNumber", claim.getPolicyNumber());
        vars.put("claimant", Map.of("name", claim.getClaimantName(), "email", claim.getClaimantEmail()));
        List<Map<String, Object>> flights = new ArrayList<>();
        for (FlightLeg f : claim.getFlights())
            flights.add(Map.of("flightNumber", f.getFlightNumber(), "date", f.getFlightDate().toString(), "origin", f.getOrigin(), "destination", f.getDestination()));
        vars.put("flights", flights);
        List<Map<String, Object>> travelers = new ArrayList<>();
        for (Traveler t : claim.getTravelers()) travelers.add(Map.of("name", t.getName(), "email", t.getEmail()));
        vars.put("travelers", travelers);
        vars.put("slaDuration", claim.getSlaDuration());
        return vars;
    }

    private String newClaimId() {
        StringBuilder sb = new StringBuilder("CLM-" + Year.now().getValue() + "-");
        for (int i = 0; i < 5; i++) sb.append(ALPHABET.charAt(random.nextInt(ALPHABET.length())));
        return sb.toString();
    }

    @Transactional(readOnly = true)
    public List<ClaimView> list() {
        return claims.findAllByOrderByCreatedAtDesc().stream().map(this::toView).toList();
    }

    @Transactional(readOnly = true)
    public ClaimView get(String claimId) {
        return claims.findById(claimId).map(this::toView).orElseThrow(() -> new NoSuchElementException("Claim " + claimId + " not found"));
    }

    @Transactional(readOnly = true)
    public Optional<ClaimView> findByProcessInstanceKey(String key) {
        return claims.findByProcessInstanceKey(key).map(this::toView);
    }

    @Transactional(readOnly = true)
    public List<EventView> events(String claimId) {
        Claim c = claims.findById(claimId).orElseThrow(() -> new NoSuchElementException("Claim " + claimId + " not found"));
        return c.getEvents().stream().map(e -> new EventView(e.getId(), e.getSource(), e.getType(), e.getMessage(), e.getCreatedAt())).toList();
    }

    ClaimView toView(Claim c) {
        List<PaymentView> pays = payments.findByClaimIdOrderByIdAsc(c.getClaimId()).stream()
                .map(p -> new PaymentView(p.getReference(), p.getBeneficiary(), p.getAmount(), p.getCurrency(), p.getStatus(), p.getCreatedAt())).toList();
        return new ClaimView(c.getClaimId(), c.getPolicyNumber(), c.getClaimantName(), c.getClaimantEmail(), c.getStatus().name(), c.getStatusReason(),
                c.getProcessInstanceKey(), c.getTotalPayout(), c.getCurrency(), c.getMaxDelayMinutes(), c.getFraudScore(),
                c.getCreatedAt(), c.getUpdatedAt(), c.getCompletedAt(),
                c.getFlights().stream().map(f -> new FlightLegView(f.getFlightNumber(), f.getFlightDate(), f.getOrigin(), f.getDestination(),
                        f.getVerifiedStatus(), f.getVerifiedDelayMinutes(), f.getTierPercent())).toList(),
                c.getTravelers().stream().map(t -> new TravelerView(t.getName(), t.getEmail())).toList(), pays);
    }
}
