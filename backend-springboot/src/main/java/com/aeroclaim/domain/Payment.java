package com.aeroclaim.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "payments")
@Getter @Setter @NoArgsConstructor
public class Payment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(unique = true)
    private String reference;
    private String claimId;
    private String beneficiary;
    private String email;
    @Column(precision = 12, scale = 2)
    private BigDecimal amount;
    private String currency;
    private String status;
    private Instant createdAt = Instant.now();
}
