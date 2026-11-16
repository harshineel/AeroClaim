package com.aeroclaim.service;

import com.aeroclaim.domain.Claim;
import com.aeroclaim.domain.ClaimStatus;
import com.aeroclaim.dto.Dtos.DashboardView;
import com.aeroclaim.repo.ClaimRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class DashboardService {
    private final ClaimRepository claims;
    private final FlightOracleService oracle;

    public DashboardService(ClaimRepository claims, FlightOracleService oracle) {
        this.claims = claims;
        this.oracle = oracle;
    }

    @Transactional(readOnly = true)
    public DashboardView build() {
        List<Claim> all = claims.findAll();
        Map<ClaimStatus, Long> counts = new EnumMap<>(ClaimStatus.class);
        for (ClaimStatus s : ClaimStatus.values()) counts.put(s, 0L);
        BigDecimal paid = BigDecimal.ZERO;
        double totalMinutes = 0;
        long paidCount = 0, straightThrough = 0, open = 0;
        for (Claim c : all) {
            counts.merge(c.getStatus(), 1L, Long::sum);
            if (!c.getStatus().isTerminal()) open++;
            if (c.getStatus() == ClaimStatus.PAID) {
                paidCount++;
                if (c.getTotalPayout() != null) paid = paid.add(c.getTotalPayout());
                if (c.getCompletedAt() != null) totalMinutes += Duration.between(c.getCreatedAt(), c.getCompletedAt()).toMillis() / 60000.0;
                if (c.getEvents().stream().noneMatch(e -> "TASK_COMPLETED".equals(e.getType()))) straightThrough++;
            }
        }
        Map<String, Long> byStatus = new LinkedHashMap<>();
        counts.forEach((k, v) -> byStatus.put(k.name(), v));
        double avg = paidCount == 0 ? 0 : Math.round(totalMinutes / paidCount * 100.0) / 100.0;
        double stp = paidCount == 0 ? 0 : Math.round(straightThrough * 1000.0 / paidCount) / 10.0;
        return new DashboardView(all.size(), byStatus, paid, "CHF", avg, open, stp, oracle.all().stream().map(oracle::toView).toList());
    }
}
