package com.hotelcollection.hotel.repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.hotelcollection.hotel.entity.OAuthState;

public interface OAuthStateRepository extends JpaRepository<OAuthState, UUID> {

	Optional<OAuthState> findByState(String state);

	@Modifying
	@Query("delete from OAuthState s where s.expiresAt < :cutoff")
	int deleteExpired(@Param("cutoff") Instant cutoff);
}
