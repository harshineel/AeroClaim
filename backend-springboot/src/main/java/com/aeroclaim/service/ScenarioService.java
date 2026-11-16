package com.aeroclaim.service;

import com.aeroclaim.dto.Dtos.*;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

/** Ready-made demo claims; each drives the process down a different path (used by the wizard and the test plan). */
@Service
public class ScenarioService {
    private static final LocalDate DAY = LocalDate.of(2026, 11, 5);

    public List<ScenarioView> all() {
        return List.of(
            new ScenarioView("happy-path", "Happy path - instant payout",
                "One 95-minute delay on ZRH-LHR. Below the review threshold, so the claim is verified and paid with no human involvement.",
                "Register, eligibility, parallel fraud check, verify flight, trigger met, sequential payout, e-mail, PAID", "zap",
                req("AC-TRV-100234", "Anna Meier", "anna.meier@example.com", List.of(f("LX1234", "ZRH", "LHR")), List.of(p("Anna Meier", "anna.meier@example.com")), null)),
            new ScenarioView("four-eyes", "Long delay - four-eyes review",
                "ZRH-JFK delayed 187 minutes for two travelers (CHF 1,800). The payout exceeds CHF 500, so two reviewers must approve one after the other.",
                "Trigger met, manual review (sequential multi-instance user task), settlement, PAID", "users",
                req("AC-TRV-100235", "Rahul Verma", "rahul.verma@example.com", List.of(f("LX318", "ZRH", "JFK")),
                    List.of(p("Rahul Verma", "rahul.verma@example.com"), p("Priya Verma", "priya.verma@example.com")), null)),
            new ScenarioView("multi-leg", "Multi-leg trip - parallel verification",
                "Three legs verified in parallel by a multi-instance call activity. The longest delay (130 min, QR570) decides the 50% tier.",
                "Call activity x3 in parallel, aggregate, review, sequential payout x2", "route",
                req("AC-TRV-100234", "Meera Iyer", "meera.iyer@example.com",
                    List.of(f("LH754", "FRA", "BLR"), f("QR570", "MAA", "DOH"), f("6E201", "MAA", "DEL")),
                    List.of(p("Meera Iyer", "meera.iyer@example.com"), p("Karthik Iyer", "karthik.iyer@example.com")), null)),
            new ScenarioView("cancelled", "Cancelled flight - 100% tier",
                "BA117 was cancelled. The DMN table pays 100% of the benefit regardless of delay minutes.",
                "DMN rule 1 (cancelled), 100%, review, PAID", "ban",
                req("AC-TRV-100234", "Lena Fischer", "lena.fischer@example.com", List.of(f("BA117", "LHR", "JFK")), List.of(p("Lena Fischer", "lena.fischer@example.com")), null)),
            new ScenarioView("no-trigger", "On-time flight - no payout",
                "6E201 was only 12 minutes late. The trigger is not reached, the claim is closed and the claimant is e-mailed.",
                "Trigger gateway default flow, e-mail, CLOSED_NO_PAYOUT", "check",
                req("AC-TRV-100234", "Tom Becker", "tom.becker@example.com", List.of(f("6E201", "MAA", "DEL")), List.of(p("Tom Becker", "tom.becker@example.com")), null)),
            new ScenarioView("payment-failure", "Payment declined - finance escalation",
                "The bank declines the transfer (HTTP 402). The REST connector raises BPMN error PAYMENT_FAILED, which the settlement sub-process catches and routes to finance-ops.",
                "Pay each traveler, error boundary PAYMENT_FAILED, user task Resolve payment manually", "alert",
                req("AC-TRV-100234", "Omar Haddad", "omar.haddad@decline.test", List.of(f("LX1234", "ZRH", "LHR")), List.of(p("Omar Haddad", "omar.haddad@decline.test")), null)),
            new ScenarioView("sla-breach", "Slow bank - SLA timer",
                "The payment gateway takes 12 s while the SLA is 8 s. The non-interrupting timer boundary event e-mails operations while settlement continues.",
                "Timer boundary (non-interrupting), e-mail ops, main flow continues, PAID", "timer",
                req("AC-TRV-100234", "Sofia Rossi", "sofia.rossi@slow.test", List.of(f("LX1234", "ZRH", "LHR")), List.of(p("Sofia Rossi", "sofia.rossi@slow.test")), "PT8S")),
            new ScenarioView("ineligible", "Expired policy - rejected",
                "Policy AC-TRV-099001 expired in 2025. The worker throws ZeebeBpmnError POLICY_INVALID; the error boundary on the sub-process terminates the claim.",
                "validate-policy, BpmnError POLICY_INVALID, boundary, REJECTED (terminate end)", "x",
                req("AC-TRV-099001", "Jon Park", "jon.park@example.com", List.of(f("LX318", "ZRH", "JFK")), List.of(p("Jon Park", "jon.park@example.com")), null))
        );
    }

    private static ClaimRequest req(String policy, String name, String email, List<FlightDto> flights, List<TravelerDto> travelers, String sla) {
        return new ClaimRequest(policy, new ClaimantDto(name, email), flights, travelers, sla);
    }

    private static FlightDto f(String no, String from, String to) {
        return new FlightDto(no, DAY, from, to);
    }

    private static TravelerDto p(String name, String email) {
        return new TravelerDto(name, email);
    }
}
