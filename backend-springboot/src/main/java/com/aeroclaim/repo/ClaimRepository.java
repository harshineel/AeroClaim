package com.aeroclaim.repo;

import com.aeroclaim.domain.Claim;
import com.aeroclaim.domain.ClaimStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface ClaimRepository extends JpaRepository<Claim, String> {
    List<Claim> findAllByOrderByCreatedAtDesc();

    Optional<Claim> findByProcessInstanceKey(String processInstanceKey);

    long countByClaimantEmailIgnoreCaseAndCreatedAtAfter(String email, Instant since);

    // Targeted updates: parallel workers (e.g. the fraud branch) touch the same claim concurrently,
    // so each one updates only its own columns instead of rewriting the whole entity.
    @Transactional @Modifying
    @Query("update Claim c set c.status = :status, c.statusReason = :reason, c.updatedAt = :now where c.claimId = :id")
    int updateStatus(@Param("id") String id, @Param("status") ClaimStatus status, @Param("reason") String reason, @Param("now") Instant now);

    @Transactional @Modifying
    @Query("update Claim c set c.status = :status, c.statusReason = :reason, c.updatedAt = :now, c.completedAt = :now where c.claimId = :id")
    int updateTerminalStatus(@Param("id") String id, @Param("status") ClaimStatus status, @Param("reason") String reason, @Param("now") Instant now);

    @Transactional @Modifying
    @Query("update Claim c set c.fraudScore = :score, c.updatedAt = :now where c.claimId = :id")
    int updateFraudScore(@Param("id") String id, @Param("score") int score, @Param("now") Instant now);

    @Transactional @Modifying
    @Query("update Claim c set c.processInstanceKey = :key, c.updatedAt = :now where c.claimId = :id")
    int updateProcessInstanceKey(@Param("id") String id, @Param("key") String key, @Param("now") Instant now);
}
