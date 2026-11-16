package com.aeroclaim.service;

import com.aeroclaim.domain.FlightRecord;
import com.aeroclaim.dto.Dtos.FlightStatusView;
import com.aeroclaim.repo.FlightRecordRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

/** Simulated flight data provider (in production: airline API, OAG, FlightAware, ...). */
@Service
public class FlightOracleService {
    private final FlightRecordRepository flights;

    public FlightOracleService(FlightRecordRepository flights) {
        this.flights = flights;
    }

    public Optional<FlightRecord> lookup(String flightNumber, LocalDate date) {
        String no = flightNumber.replace(" ", "");
        Optional<FlightRecord> exact = date == null ? Optional.empty() : flights.findFirstByFlightNumberIgnoreCaseAndFlightDate(no, date);
        return exact.isPresent() ? exact : flights.findFirstByFlightNumberIgnoreCaseOrderByFlightDateDesc(no);
    }

    public List<FlightRecord> all() {
        return flights.findAll();
    }

    public FlightRecord update(Long id, int delayMinutes, boolean cancelled) {
        FlightRecord r = flights.findById(id).orElseThrow(() -> new NoSuchElementException("Flight record " + id));
        r.setDelayMinutes(delayMinutes);
        r.setCancelled(cancelled);
        return flights.save(r);
    }

    public FlightStatusView toView(FlightRecord r) {
        return new FlightStatusView(r.getFlightNumber(), r.getFlightDate(), r.getOrigin(), r.getDestination(), r.getAirline(),
                r.getScheduledDeparture(), r.status(), r.isCancelled() ? 0 : r.getDelayMinutes(), r.isCancelled());
    }
}
