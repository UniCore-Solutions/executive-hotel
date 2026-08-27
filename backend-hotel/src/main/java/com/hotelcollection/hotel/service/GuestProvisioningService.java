package com.hotelcollection.hotel.service;

import java.util.Optional;
import java.util.UUID;

import com.hotelcollection.hotel.entity.Guest;

/**
 * Guest provisioning used by identity on account registration,
 * and guest lookups used by other services (e.g. reviews).
 */
public interface GuestProvisioningService {

	Guest provision(UUID userId, String firstName, String lastName, String email);

	Optional<Guest> findByUserId(UUID userId);

	/**
	 * Propagates an account profile edit onto the user's own linked guest
	 * record, if one exists (a no-op otherwise). Null arguments leave the
	 * corresponding field untouched; a blank (non-null) value clears it.
	 */
	void updateContactInfo(UUID userId, String firstName, String lastName, String phone);
}