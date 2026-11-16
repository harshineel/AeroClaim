package com.aeroclaim.config;

import com.aeroclaim.domain.FlightRecord;
import com.aeroclaim.domain.Policy;
import com.aeroclaim.repo.FlightRecordRepository;
import com.aeroclaim.repo.PolicyRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Idempotent demo data: insurance policies and the simulated flight data provider's records. */
@Component
public class DataSeeder implements CommandLineRunner {
    private final PolicyRepository policies;
    private final FlightRecordRepository flights;

    public DataSeeder(PolicyRepository policies, FlightRecordRepository flights) {
        this.policies = policies;
        this.flights = flights;
    }

    @Override
    public void run(String... args) {
        if (policies.count() == 0) {
            policies.save(policy("AC-TRV-100234", "Anna Meier", "ACTIVE", "600.00", 2026, 6));
            policies.save(policy("AC-TRV-100235", "Rahul Verma", "ACTIVE", "1200.00", 2026, 4));
            policies.save(policy("AC-TRV-099001", "Jon Park", "EXPIRED", "600.00", 2025, 4));
            policies.save(policy("AC-TRV-100300", "Ivy Chen", "CANCELLED", "900.00", 2026, 4));
        }
        if (flights.count() == 0) {
            LocalDate d = LocalDate.of(2026, 11, 5);
            flights.save(flight("LX1234", d, "ZRH", "LHR", "Swiss", "08:10", 95, false));
            flights.save(flight("LX318", d, "ZRH", "JFK", "Swiss", "10:25", 187, false));
            flights.save(flight("LH754", d, "FRA", "BLR", "Lufthansa", "22:05", 70, false));
            flights.save(flight("QR570", d, "MAA", "DOH", "Qatar Airways", "03:30", 130, false));
            flights.save(flight("6E201", d, "MAA", "DEL", "IndiGo", "06:45", 12, false));
            flights.save(flight("BA117", d, "LHR", "JFK", "British Airways", "09:15", 0, true));
            flights.save(flight("AI101", d, "DEL", "JFK", "Air India", "02:20", 260, false));
            flights.save(flight("EK202", d, "JFK", "DXB", "Emirates", "23:00", 5, false));
        }
    }

    private static Policy policy(String no, String holder, String status, String benefit, int year, int max) {
        Policy p = new Policy();
        p.setPolicyNumber(no);
        p.setHolderName(holder);
        p.setHolderEmail(holder.toLowerCase().replace(' ', '.') + "@example.com");
        p.setStatus(status);
        p.setBenefitPerTraveler(new BigDecimal(benefit));
        p.setCurrency("CHF");
        p.setValidFrom(LocalDate.of(year, 1, 1));
        p.setValidTo(LocalDate.of(year, 12, 31));
        p.setMaxTravelers(max);
        return p;
    }

    private static FlightRecord flight(String no, LocalDate date, String from, String to, String airline, String dep, int delay, boolean cancelled) {
        FlightRecord r = new FlightRecord();
        r.setFlightNumber(no);
        r.setFlightDate(date);
        r.setOrigin(from);
        r.setDestination(to);
        r.setAirline(airline);
        r.setScheduledDeparture(dep);
        r.setDelayMinutes(delay);
        r.setCancelled(cancelled);
        return r;
    }
}
