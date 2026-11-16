package com.aeroclaim.domain;

public enum ClaimStatus {
    SUBMITTED, VALIDATING, VERIFYING, UNDER_REVIEW, SETTLING, PAID, CLOSED_NO_PAYOUT, REJECTED;

    public boolean isTerminal() {
        return this == PAID || this == CLOSED_NO_PAYOUT || this == REJECTED;
    }
}
