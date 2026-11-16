package com.aeroclaim.service;

import com.aeroclaim.domain.Policy;
import com.aeroclaim.dto.Dtos.PolicyView;
import com.aeroclaim.repo.PolicyRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
public class PolicyService {
    private final PolicyRepository policies;

    public PolicyService(PolicyRepository policies) {
        this.policies = policies;
    }

    public Optional<Policy> find(String policyNumber) {
        return policies.findByPolicyNumber(policyNumber == null ? "" : policyNumber.trim().toUpperCase());
    }

    public PolicyView toView(Policy p) {
        return new PolicyView(p.getPolicyNumber(), p.getHolderName(), p.getStatus(), p.getBenefitPerTraveler(), p.getCurrency(),
                p.getValidFrom(), p.getValidTo(), p.getMaxTravelers());
    }

    /** Reason the claim cannot be accepted, or empty when the policy covers every flight date and the traveler count. */
    public Optional<String> eligibilityProblem(Policy p, List<LocalDate> flightDates, int travelerCount) {
        if (!"ACTIVE".equals(p.getStatus())) return Optional.of("Policy " + p.getPolicyNumber() + " is " + p.getStatus());
        for (LocalDate d : flightDates) {
            if (d.isBefore(p.getValidFrom()) || d.isAfter(p.getValidTo()))
                return Optional.of("Flight date " + d + " is outside the policy period " + p.getValidFrom() + " to " + p.getValidTo());
        }
        if (travelerCount > p.getMaxTravelers())
            return Optional.of("Policy covers at most " + p.getMaxTravelers() + " travelers (claim lists " + travelerCount + ")");
        return Optional.empty();
    }
}
