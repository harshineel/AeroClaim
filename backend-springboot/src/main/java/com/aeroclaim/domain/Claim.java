package com.aeroclaim.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "claims")
@Getter @Setter @NoArgsConstructor
public class Claim {
    @Id
    private String claimId;
    private String policyNumber;
    private String claimantName;
    private String claimantEmail;
    @Enumerated(EnumType.STRING)
    private ClaimStatus status;
    @Column(length = 500)
    private String statusReason;
    /** Camunda process instance key (64-bit Zeebe key, stored as text for the JSON layer). */
    private String processInstanceKey;
    private String slaDuration;
    @Column(precision = 12, scale = 2)
    private BigDecimal totalPayout;
    private String currency;
    private Integer maxDelayMinutes;
    private Integer fraudScore;
    private Instant createdAt;
    private Instant updatedAt;
    private Instant completedAt;

    @OneToMany(mappedBy = "claim", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<FlightLeg> flights = new ArrayList<>();
    @OneToMany(mappedBy = "claim", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<Traveler> travelers = new ArrayList<>();
    @OneToMany(mappedBy = "claim", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<ClaimEvent> events = new ArrayList<>();

    public void addFlight(FlightLeg leg) { leg.setClaim(this); flights.add(leg); }
    public void addTraveler(Traveler t) { t.setClaim(this); travelers.add(t); }
    public void addEvent(ClaimEvent e) { e.setClaim(this); events.add(e); }
}
