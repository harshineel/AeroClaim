package com.aeroclaim.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/** Request / response records for the REST API. */
public final class Dtos {
    private Dtos() {}

    public record ClaimantDto(@NotBlank String name, @NotBlank @Email String email) {}
    public record TravelerDto(@NotBlank String name, @NotBlank @Email String email) {}
    public record FlightDto(@NotBlank @Pattern(regexp = "^[A-Za-z0-9]{2,3}\\s?\\d{1,4}$", message = "must look like LX318") String flightNumber,
                            @NotNull LocalDate date,
                            @NotBlank @Size(min = 3, max = 3) String origin,
                            @NotBlank @Size(min = 3, max = 3) String destination) {}
    public record ClaimRequest(@NotBlank String policyNumber,
                               @NotNull @Valid ClaimantDto claimant,
                               @NotEmpty @Size(max = 6) List<@Valid FlightDto> flights,
                               @NotEmpty @Size(max = 8) List<@Valid TravelerDto> travelers,
                               @Pattern(regexp = "^P(T\\d+[HMS])+$|^P\\d+D$", message = "must be an ISO-8601 duration like PT24H") String slaDuration) {}
    public record TaskCompleteRequest(@NotNull Map<String, Object> variables, String assignee) {}
    public record TaskAssignRequest(@NotBlank String assignee) {}
    public record FlightUpdateRequest(@Min(0) @Max(2000) int delayMinutes, boolean cancelled) {}

    public record FlightLegView(String flightNumber, LocalDate date, String origin, String destination,
                                String verifiedStatus, Integer verifiedDelayMinutes, Integer tierPercent) {}
    public record TravelerView(String name, String email) {}
    public record PaymentView(String reference, String beneficiary, BigDecimal amount, String currency, String status, Instant createdAt) {}
    public record EventView(Long id, String source, String type, String message, Instant createdAt) {}
    public record ClaimView(String claimId, String policyNumber, String claimantName, String claimantEmail, String status, String statusReason,
                            String processInstanceKey, BigDecimal totalPayout, String currency, Integer maxDelayMinutes, Integer fraudScore,
                            Instant createdAt, Instant updatedAt, Instant completedAt,
                            List<FlightLegView> flights, List<TravelerView> travelers, List<PaymentView> payments) {}
    public record PolicyView(String policyNumber, String holderName, String status, BigDecimal benefitPerTraveler, String currency,
                             LocalDate validFrom, LocalDate validTo, int maxTravelers) {}
    public record FlightStatusView(String flightNumber, LocalDate date, String origin, String destination, String airline,
                                   String scheduledDeparture, String status, int delayMinutes, boolean cancelled) {}
    public record ElementView(String elementId, String name, String type, String state, Instant startDate, Instant endDate, boolean hasIncident) {}
    public record ChildInstanceView(String processInstanceKey, String processDefinitionId, String state, boolean hasIncident, Instant startDate, Instant endDate) {}
    public record TrackerView(ClaimView claim, String instanceState, boolean hasIncident, List<ElementView> elements,
                              List<ChildInstanceView> children, List<Map<String, Object>> incidents, List<EventView> events, boolean engineReachable) {}
    public record TaskView(String userTaskKey, String name, String elementId, String state, String assignee, List<String> candidateGroups,
                           Instant creationDate, String processInstanceKey, String claimId, ClaimView claim) {}
    public record DashboardView(long totalClaims, Map<String, Long> byStatus, BigDecimal totalPaidOut, String currency, double avgMinutesToPayout,
                                long openClaims, double autoApprovalRate, List<FlightStatusView> flightsMonitored) {}
    public record ScenarioView(String id, String title, String description, String expectedPath, String icon, ClaimRequest request) {}
}
