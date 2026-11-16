package com.aeroclaim.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "claim_flights")
@Getter @Setter @NoArgsConstructor
public class FlightLeg {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "claim_id")
    private Claim claim;
    private String flightNumber;
    private LocalDate flightDate;
    private String origin;
    private String destination;
    // Filled by the finalize-claim worker from the multi-instance output collection `flightResults`
    private String verifiedStatus;
    private Integer verifiedDelayMinutes;
    private Integer tierPercent;
}
