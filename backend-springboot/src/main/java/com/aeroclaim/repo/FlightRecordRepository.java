package com.aeroclaim.repo;

import com.aeroclaim.domain.FlightRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface FlightRecordRepository extends JpaRepository<FlightRecord, Long> {
    Optional<FlightRecord> findFirstByFlightNumberIgnoreCaseAndFlightDate(String flightNumber, LocalDate date);

    /** Demo-friendly fallback: most recent record of that flight number when the exact date is unknown. */
    Optional<FlightRecord> findFirstByFlightNumberIgnoreCaseOrderByFlightDateDesc(String flightNumber);
}
