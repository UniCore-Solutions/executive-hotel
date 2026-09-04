package com.hotelcollection.hotel.repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.hotelcollection.hotel.entity.LoginGrant;

public interface LoginGrantRepository extends JpaRepository<LoginGrant, UUID> {

	Optional<LoginGrant> findByGrantValue(String grantValue);

	@Modifying
	@Query("delete from LoginGrant g where g.expiresAt < :cutoff")
	int deleteExpired(@Param("cutoff") Instant cutoff);
}
