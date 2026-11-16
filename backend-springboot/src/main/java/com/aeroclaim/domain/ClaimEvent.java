package com.aeroclaim.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/** Append-only audit trail shown in the live tracker's activity feed. */
@Entity
@Table(name = "claim_events")
@Getter @Setter @NoArgsConstructor
public class ClaimEvent {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "claim_id")
    private Claim claim;
    /** SYSTEM, WORKER, CONNECTOR, HUMAN */
    private String source;
    private String type;
    @Column(length = 600)
    private String message;
    private Instant createdAt = Instant.now();

    public ClaimEvent(String source, String type, String message) {
        this.source = source;
        this.type = type;
        this.message = message;
    }
}
