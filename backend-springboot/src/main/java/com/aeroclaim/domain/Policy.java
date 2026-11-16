package com.aeroclaim.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "policies")
@Getter @Setter @NoArgsConstructor
public class Policy {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(unique = true, nullable = false)
    private String policyNumber;
    private String holderName;
    private String holderEmail;
    /** ACTIVE, EXPIRED or CANCELLED */
    private String status;
    /** Fixed parametric benefit per insured traveler at the highest payout tier. */
    @Column(precision = 12, scale = 2)
    private BigDecimal benefitPerTraveler;
    private String currency;
    private LocalDate validFrom;
    private LocalDate validTo;
    private int maxTravelers;
}
