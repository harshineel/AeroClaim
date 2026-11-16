package com.aeroclaim.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

/** The simulated flight data provider (stands in for an airline / OAG / FlightAware style feed). */
@Entity
@Table(name = "flight_records")
@Getter @Setter @NoArgsConstructor
public class FlightRecord {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String flightNumber;
    private LocalDate flightDate;
    private String origin;
    private String destination;
    private String airline;
    private String scheduledDeparture;
    private int delayMinutes;
    private boolean cancelled;

    public String status() {
        if (cancelled) return "CANCELLED";
        return delayMinutes >= 15 ? "DELAYED" : "ON_TIME";
    }
}
