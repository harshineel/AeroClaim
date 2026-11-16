package com.aeroclaim.repo;

import com.aeroclaim.domain.ClaimEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClaimEventRepository extends JpaRepository<ClaimEvent, Long> {
}
