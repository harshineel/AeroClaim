package com.aeroclaim.service;

import com.aeroclaim.dto.Dtos.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.function.Supplier;

/** Live tracker payload: engine state (Operate data) merged with the application's audit trail. */
@Service
public class TrackerService {
    private static final Logger log = LoggerFactory.getLogger(TrackerService.class);
    private final ClaimService claims;
    private final ProcessGateway gateway;

    public TrackerService(ClaimService claims, ProcessGateway gateway) {
        this.claims = claims;
        this.gateway = gateway;
    }

    public TrackerView track(String claimId) {
        ClaimView claim = claims.get(claimId);
        List<EventView> events = claims.events(claimId);
        String key = claim.processInstanceKey();
        if (key == null) return new TrackerView(claim, "NOT_STARTED", false, List.of(), List.of(), List.of(), events, false);
        try {
            Map<String, Object> pi = gateway.getProcessInstance(key);
            List<ElementView> elements = gateway.searchElementInstances(key).stream()
                    .map(e -> new ElementView(str(e.get("elementId")), str(e.get("elementName")), str(e.get("type")), str(e.get("state")),
                            ProcessGateway.instant(e.get("startDate")), ProcessGateway.instant(e.get("endDate")), Boolean.TRUE.equals(e.get("hasIncident"))))
                    .sorted(Comparator.comparing(ElementView::startDate, Comparator.nullsLast(Comparator.naturalOrder()))).toList();
            List<ChildInstanceView> children = safe(() -> gateway.searchChildInstances(key)).stream()
                    .map(c -> new ChildInstanceView(str(c.get("processInstanceKey")), str(c.get("processDefinitionId")), str(c.get("state")),
                            Boolean.TRUE.equals(c.get("hasIncident")), ProcessGateway.instant(c.get("startDate")), ProcessGateway.instant(c.get("endDate")))).toList();
            boolean incident = Boolean.TRUE.equals(pi.get("hasIncident"));
            List<Map<String, Object>> incidents = incident ? safe(() -> gateway.searchIncidents(key)) : List.of();
            return new TrackerView(claim, str(pi.get("state")), incident, elements, children, incidents, events, true);
        } catch (RuntimeException ex) {
            log.warn("Camunda query failed for claim {}: {}", claimId, ex.getMessage());
            return new TrackerView(claim, "UNKNOWN", false, List.of(), List.of(), List.of(), events, false);
        }
    }

    private static <T> List<T> safe(Supplier<List<T>> s) {
        try {
            return s.get();
        } catch (RuntimeException e) {
            return List.of();
        }
    }

    private static String str(Object o) {
        return o == null ? null : o.toString();
    }
}
