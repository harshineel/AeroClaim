package com.aeroclaim.service;

import com.aeroclaim.domain.ClaimEvent;
import com.aeroclaim.repo.ClaimEventRepository;
import com.aeroclaim.repo.ClaimRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EventLogService {
    private final ClaimEventRepository events;
    private final ClaimRepository claims;

    public EventLogService(ClaimEventRepository events, ClaimRepository claims) {
        this.events = events;
        this.claims = claims;
    }

    @Transactional
    public void log(String claimId, String source, String type, String message) {
        if (claimId == null || !claims.existsById(claimId)) return;
        ClaimEvent e = new ClaimEvent(source, type, message);
        e.setClaim(claims.getReferenceById(claimId));
        events.save(e);
    }
}
