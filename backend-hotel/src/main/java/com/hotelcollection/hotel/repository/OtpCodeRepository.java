package com.hotelcollection.hotel.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.hotelcollection.hotel.entity.OtpCode;
import com.hotelcollection.hotel.entity.OtpPurpose;

public interface OtpCodeRepository extends JpaRepository<OtpCode, UUID> {

	/** The current code for this email+purpose — used both to verify against
	 * and to enforce the resend cooldown. */
	Optional<OtpCode> findFirstByEmailAndPurposeOrderByCreatedAtDesc(String email, OtpPurpose purpose);
}
