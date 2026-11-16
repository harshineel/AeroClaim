package com.aeroclaim.web;

import com.aeroclaim.dto.Dtos.*;
import com.aeroclaim.service.DashboardService;
import com.aeroclaim.service.PolicyService;
import com.aeroclaim.service.ScenarioService;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.regex.Pattern;

/** Read-only reference data for the UI: policy look-up, demo scenarios, dashboard KPIs and the deployed BPMN XML. */
@RestController
@RequestMapping("/api")
public class ReferenceController {
    private static final Pattern MODEL_ID = Pattern.compile("^[a-z0-9-]+$");
    private final PolicyService policies;
    private final ScenarioService scenarios;
    private final DashboardService dashboard;

    public ReferenceController(PolicyService policies, ScenarioService scenarios, DashboardService dashboard) {
        this.policies = policies;
        this.scenarios = scenarios;
        this.dashboard = dashboard;
    }

    @GetMapping("/policies/{policyNumber}")
    public PolicyView policy(@PathVariable String policyNumber) {
        return policies.find(policyNumber).map(policies::toView)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Policy " + policyNumber + " not found"));
    }

    @GetMapping("/scenarios")
    public List<ScenarioView> scenarios() {
        return scenarios.all();
    }

    @GetMapping("/dashboard")
    public DashboardView dashboard() {
        return dashboard.build();
    }

    /** BPMN XML of a deployed process, so the tracker can render the live diagram with bpmn-js. */
    @GetMapping(value = "/models/{processId}", produces = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<String> model(@PathVariable String processId) throws IOException {
        if (!MODEL_ID.matcher(processId).matches()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid model id");
        ClassPathResource res = new ClassPathResource("bpmn/" + processId + ".bpmn");
        if (!res.exists()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Model " + processId + " not found");
        return ResponseEntity.ok(new String(res.getInputStream().readAllBytes(), StandardCharsets.UTF_8));
    }
}
