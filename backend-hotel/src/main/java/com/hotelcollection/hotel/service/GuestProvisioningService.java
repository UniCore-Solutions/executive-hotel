package com.hotelcollection.hotel.service;

import java.util.Optional;
import java.util.UUID;

import com.hotelcollection.hotel.entity.Guest;
import com.hotelcollection.hotel.entity.User;

/**
 * Guest provisioning used by identity on account registration, by booking on
 * accountless checkout (silent provisioned accounts), and guest lookups used
 * by other services (e.g. reviews).
 */
public interface GuestProvisioningService {

	Guest provision(UUID userId, String firstName, String lastName, String email);

	/**
	 * Links or creates the guest profile for a user — used when an account is
	 * completed or created (registration): the existing guest record of that
	 * email is linked instead of duplicating it.
	 */
	Guest provisionOrLink(UUID userId, String firstName, String lastName, String email);

	/**
	 * Silent account provisioning for an accountless booking: guarantees the
	 * guest has a linked user account. An existing user with the guest's email
	 * is linked (active or provisioned); otherwise a passwordless user with
	 * status 'provisioned' is created. Returns the user, or null when the
	 * guest has no email to provision against.
	 */
	User ensureAccount(Guest guest);

	Optional<Guest> findByUserId(UUID userId);

	/**
	 * Propagates an account profile edit onto the user's own linked guest
	 * record, if one exists (a no-op otherwise). Null arguments leave the
	 * corresponding field untouched; a blank (non-null) value clears it.
	 */
	void updateContactInfo(UUID userId, String firstName, String lastName, String phone);
}