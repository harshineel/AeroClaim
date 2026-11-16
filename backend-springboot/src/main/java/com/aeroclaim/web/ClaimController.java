package com.aeroclaim.web;

import com.aeroclaim.dto.Dtos.ClaimRequest;
import com.aeroclaim.dto.Dtos.ClaimView;
import com.aeroclaim.dto.Dtos.TrackerView;
import com.aeroclaim.service.ClaimService;
import com.aeroclaim.service.TrackerService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/claims")
public class ClaimController {
    private final ClaimService claims;
    private final TrackerService tracker;

    public ClaimController(ClaimService claims, TrackerService tracker) {
        this.claims = claims;
        this.tracker = tracker;
    }

    /** Submit a claim: persists it and starts a Camunda process instance with the claim as initial variables. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ClaimView submit(@Valid @RequestBody ClaimRequest request) {
        return claims.submit(request);
    }

    @GetMapping
    public List<ClaimView> list() {
        return claims.list();
    }

    @GetMapping("/{claimId}")
    public ClaimView get(@PathVariable String claimId) {
        return claims.get(claimId);
    }

    /** Live status tracker: engine element instances (Operate data) + audit trail. Polled by the React UI. */
    @GetMapping("/{claimId}/tracker")
    public TrackerView track(@PathVariable String claimId) {
        return tracker.track(claimId);
    }
}
