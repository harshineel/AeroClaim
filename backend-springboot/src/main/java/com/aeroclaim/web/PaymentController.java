package com.aeroclaim.web;

import com.aeroclaim.domain.Payment;
import com.aeroclaim.repo.PaymentRepository;
import com.aeroclaim.service.EventLogService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

/** Simulated bank called by the "Initiate bank transfer" REST connector in payout-settlement.bpmn (API-key protected). */
@RestController
@RequestMapping("/api/payments")
public class PaymentController {
    public record PaymentRequest(@NotBlank String claimId, @NotBlank String beneficiary, @NotBlank String email,
                                 @NotNull @DecimalMin("0.01") BigDecimal amount, @NotBlank String currency) {}

    private final PaymentRepository payments;
    private final EventLogService events;

    public PaymentController(PaymentRepository payments, EventLogService events) {
        this.payments = payments;
        this.events = events;
    }

    @PostMapping
    public ResponseEntity<?> pay(@Valid @RequestBody PaymentRequest req) throws InterruptedException {
        String email = req.email().toLowerCase();
        if (email.endsWith("@slow.test")) Thread.sleep(12_000); // demo: slow bank, triggers the SLA timer boundary event
        if (email.endsWith("@decline.test")) {
            events.log(req.claimId(), "CONNECTOR", "PAYMENT_DECLINED", "Bank declined transfer of " + req.amount() + " " + req.currency() + " to " + req.beneficiary());
            return ResponseEntity.status(HttpStatus.PAYMENT_REQUIRED).body(Map.of("message", "Beneficiary bank declined the transfer for " + req.beneficiary()));
        }
        Payment p = new Payment();
        p.setReference("PAY-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        p.setClaimId(req.claimId());
        p.setBeneficiary(req.beneficiary());
        p.setEmail(req.email());
        p.setAmount(req.amount());
        p.setCurrency(req.currency());
        p.setStatus("SETTLED");
        payments.save(p);
        events.log(req.claimId(), "CONNECTOR", "PAYMENT_SETTLED", req.amount() + " " + req.currency() + " transferred to " + req.beneficiary() + " (" + p.getReference() + ")");
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("reference", p.getReference(), "status", p.getStatus(), "amount", p.getAmount(), "currency", p.getCurrency()));
    }
}
