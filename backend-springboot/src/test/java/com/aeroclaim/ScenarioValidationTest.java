package com.aeroclaim;

import com.aeroclaim.dto.Dtos.*;
import com.aeroclaim.service.ScenarioService;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/** Plain unit tests (no Spring context, no Camunda needed): every demo scenario must be a valid claim request. */
class ScenarioValidationTest {
    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    void everyDemoScenarioPassesBeanValidation() {
        for (ScenarioView s : new ScenarioService().all()) assertTrue(validator.validate(s.request()).isEmpty(), "scenario " + s.id() + " must be valid");
    }

    @Test
    void invalidSlaDurationIsRejected() {
        ClaimRequest base = new ScenarioService().all().get(0).request();
        assertFalse(validator.validate(new ClaimRequest(base.policyNumber(), base.claimant(), base.flights(), base.travelers(), "24 hours")).isEmpty());
    }
}
