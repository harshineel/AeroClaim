package com.aeroclaim.web;

import com.aeroclaim.domain.FlightRecord;
import com.aeroclaim.dto.Dtos.FlightStatusView;
import com.aeroclaim.dto.Dtos.FlightUpdateRequest;
import com.aeroclaim.service.FlightOracleService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;

/**
 * /api/oracle/flights/{no}: the simulated flight data provider Camunda's REST connector calls (API-key protected).
 * /api/flights: the "control tower" the UI uses to change a flight's delay live.
 */
@RestController
@RequestMapping("/api")
public class SimulationController {
    public record FlightAdmin(Long id, FlightStatusView flight) {}

    private final FlightOracleService oracle;

    public SimulationController(FlightOracleService oracle) {
        this.oracle = oracle;
    }

    @GetMapping("/oracle/flights/{flightNumber}")
    public FlightStatusView lookup(@PathVariable String flightNumber, @RequestParam(required = false) LocalDate date) {
        FlightRecord r = oracle.lookup(flightNumber, date)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Flight " + flightNumber + " not known to the data provider"));
        return oracle.toView(r);
    }

    @GetMapping("/flights")
    public List<FlightAdmin> flights() {
        return oracle.all().stream().map(r -> new FlightAdmin(r.getId(), oracle.toView(r))).toList();
    }

    @PutMapping("/flights/{id}")
    public FlightAdmin update(@PathVariable Long id, @Valid @RequestBody FlightUpdateRequest body) {
        FlightRecord r = oracle.update(id, body.delayMinutes(), body.cancelled());
        return new FlightAdmin(r.getId(), oracle.toView(r));
    }
}
