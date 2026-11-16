package com.aeroclaim.worker;

import com.aeroclaim.domain.*;
import com.aeroclaim.repo.ClaimRepository;
import com.aeroclaim.service.EventLogService;
import com.aeroclaim.service.PolicyService;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import io.camunda.client.annotation.CustomHeaders;
import io.camunda.client.annotation.JobWorker;
import io.camunda.client.annotation.Variable;
import io.camunda.client.annotation.VariablesAsType;
import io.camunda.zeebe.spring.common.exception.ZeebeBpmnError;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

/**
 * Strongly typed Zeebe job workers, one per service-task job type in the BPMN models:
 * register-claim, validate-policy (throws ZeebeBpmnError POLICY_INVALID), assess-fraud-risk (parallel branch),
 * update-claim-status (parametrised by custom task headers) and finalize-claim.
 */
@Component
@SuppressWarnings("removal")
public class ClaimWorkers {
    private static final Logger log = LoggerFactory.getLogger(ClaimWorkers.class);

    @JsonIgnoreProperties(ignoreUnknown = true) public record FlightVar(String flightNumber, String date, String origin, String destination) {}
    @JsonIgnoreProperties(ignoreUnknown = true) public record PersonVar(String name, String email) {}
    @JsonIgnoreProperties(ignoreUnknown = true) public record RegisterVars(String claimId, String policyNumber) {}
    @JsonIgnoreProperties(ignoreUnknown = true) public record ValidateVars(String claimId, String policyNumber, List<FlightVar> flights, List<PersonVar> travelers) {}
    @JsonIgnoreProperties(ignoreUnknown = true) public record FraudVars(String claimId, PersonVar claimant, List<PersonVar> travelers) {}
    @JsonIgnoreProperties(ignoreUnknown = true) public record FlightResultVar(String flightNumber, String status, Integer delayMinutes, Integer tierPercent) {}
    @JsonIgnoreProperties(ignoreUnknown = true) public record AssessmentVar(Integer maxDelayMinutes, Integer maxTierPercent, BigDecimal totalPayout, String currency) {}
    @JsonIgnoreProperties(ignoreUnknown = true) public record FinalizeVars(String claimId, AssessmentVar assessment, List<FlightResultVar> flightResults) {}

    private final ClaimRepository claims;
    private final PolicyService policies;
    private final EventLogService events;

    public ClaimWorkers(ClaimRepository claims, PolicyService policies, EventLogService events) {
        this.claims = claims;
        this.policies = policies;
        this.events = events;
    }

    @JobWorker(type = "register-claim")
    public void registerClaim(@VariablesAsType RegisterVars v) {
        claims.updateStatus(v.claimId(), ClaimStatus.VALIDATING, null, Instant.now());
        events.log(v.claimId(), "WORKER", "CLAIM_REGISTERED", "Claim registered in the claims core system; policy " + v.policyNumber() + " queued for validation");
    }

    @JobWorker(type = "validate-policy")
    public Map<String, Object> validatePolicy(@VariablesAsType ValidateVars v) {
        Policy policy = policies.find(v.policyNumber()).orElseThrow(() -> reject(v.claimId(), "Policy " + v.policyNumber() + " does not exist"));
        List<LocalDate> dates = v.flights() == null ? List.of() : v.flights().stream().map(f -> LocalDate.parse(f.date())).toList();
        int travelerCount = v.travelers() == null ? 0 : v.travelers().size();
        policies.eligibilityProblem(policy, dates, travelerCount).ifPresent(problem -> { throw reject(v.claimId(), problem); });
        claims.updateStatus(v.claimId(), ClaimStatus.VERIFYING, null, Instant.now());
        events.log(v.claimId(), "WORKER", "POLICY_VALID", "Policy " + policy.getPolicyNumber() + " is active and covers all flight dates; benefit "
                + policy.getBenefitPerTraveler() + " " + policy.getCurrency() + " per traveler");
        return Map.of("policy", Map.of("policyNumber", policy.getPolicyNumber(), "holderName", policy.getHolderName(), "status", policy.getStatus(),
                "benefitPerTraveler", policy.getBenefitPerTraveler(), "currency", policy.getCurrency()));
    }

    /** Business error: caught in BPMN by the Error Boundary Event (code POLICY_INVALID) on the eligibility sub-process. */
    private ZeebeBpmnError reject(String claimId, String reason) {
        events.log(claimId, "WORKER", "POLICY_INVALID", reason);
        return new ZeebeBpmnError("POLICY_INVALID", reason, Map.of("rejectionReason", reason));
    }

    @JobWorker(type = "assess-fraud-risk")
    public Map<String, Object> assessFraudRisk(@VariablesAsType FraudVars v) {
        long prior = Math.max(0, claims.countByClaimantEmailIgnoreCaseAndCreatedAtAfter(v.claimant().email(), Instant.now().minus(Duration.ofDays(30))) - 1);
        int travelers = v.travelers() == null ? 0 : v.travelers().size();
        List<String> flags = new ArrayList<>();
        int score = (int) Math.min(100, prior * 30);
        if (prior > 0) flags.add(prior + " other claim(s) from this claimant in the last 30 days");
        if (travelers >= 6) { score = Math.min(100, score + 20); flags.add("Unusually large traveler group (" + travelers + ")"); }
        if (v.claimant().email().toLowerCase().endsWith("@fraud.test")) { score = Math.max(score, 85); flags.add("Claimant e-mail domain on watch-list"); }
        claims.updateFraudScore(v.claimId(), score, Instant.now());
        events.log(v.claimId(), "WORKER", "FRAUD_SCORED", "Fraud risk score " + score + "/100" + (flags.isEmpty() ? " (no flags)" : " - " + String.join("; ", flags)));
        return Map.of("fraudScore", score, "fraudFlags", flags);
    }

    /** Generic status task: target status and reason come from the BPMN element's custom headers (zeebe:taskHeaders). */
    @JobWorker(type = "update-claim-status")
    public void updateClaimStatus(@Variable(name = "claimId") String claimId,
                                  @Variable(name = "rejectionReason") String rejectionReason,
                                  @CustomHeaders Map<String, String> headers) {
        ClaimStatus status = ClaimStatus.valueOf(headers.getOrDefault("status", "REJECTED"));
        String reason = rejectionReason != null && status == ClaimStatus.REJECTED ? rejectionReason : headers.get("reason");
        if (status.isTerminal()) claims.updateTerminalStatus(claimId, status, reason, Instant.now());
        else claims.updateStatus(claimId, status, reason, Instant.now());
        events.log(claimId, "WORKER", "STATUS_" + status.name(), "Claim moved to " + status + (reason == null ? "" : ": " + reason));
    }

    @JobWorker(type = "finalize-claim")
    @Transactional
    public void finalizeClaim(@VariablesAsType FinalizeVars v) {
        Claim claim = claims.findById(v.claimId()).orElseThrow();
        if (v.flightResults() != null) {
            for (FlightResultVar r : v.flightResults()) {
                claim.getFlights().stream().filter(f -> f.getFlightNumber().equalsIgnoreCase(r.flightNumber())).forEach(f -> {
                    f.setVerifiedStatus(r.status());
                    f.setVerifiedDelayMinutes(r.delayMinutes());
                    f.setTierPercent(r.tierPercent());
                });
            }
        }
        AssessmentVar a = v.assessment();
        claim.setStatus(ClaimStatus.PAID);
        claim.setTotalPayout(a.totalPayout());
        claim.setCurrency(a.currency());
        claim.setMaxDelayMinutes(a.maxDelayMinutes());
        claim.setStatusReason("Parametric trigger reached - payout tier " + a.maxTierPercent() + "%");
        claim.setUpdatedAt(Instant.now());
        claim.setCompletedAt(claim.getUpdatedAt());
        claims.save(claim);
        events.log(v.claimId(), "WORKER", "CLAIM_PAID", "Claim settled: " + a.totalPayout() + " " + a.currency() + " paid out (tier " + a.maxTierPercent() + "%)");
        log.info("Claim {} finalized, payout {} {}", v.claimId(), a.totalPayout(), a.currency());
    }
}
