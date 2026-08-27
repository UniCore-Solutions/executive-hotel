package com.hotelcollection.hotel.service.impl;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hotelcollection.hotel.service.GuestProvisioningService;
import com.hotelcollection.hotel.entity.Guest;
import com.hotelcollection.hotel.repository.GuestRepository;

/**
 * Guest provisioning for identity (account registration creates
 * the linked guest profile) and guest lookups for other services.
 */
@Service
public class GuestProvisioningServiceImpl implements GuestProvisioningService {

	private final GuestRepository guestRepository;

	public GuestProvisioningServiceImpl(GuestRepository guestRepository) {
		this.guestRepository = guestRepository;
	}

	@Override
	@Transactional
	public Guest provision(UUID userId, String firstName, String lastName, String email) {
		Guest guest = new Guest();
		guest.setUserId(userId);
		guest.setFirstName(firstName);
		guest.setLastName(lastName);
		guest.setEmail(email);
		guest.setCreatedAt(Instant.now());
		guest.setUpdatedAt(Instant.now());
		return guestRepository.save(guest);
	}

	@Override
	@Transactional(readOnly = true)
	public Optional<Guest> findByUserId(UUID userId) {
		return guestRepository.findByUserId(userId);
	}

	@Override
	@Transactional
	public void updateContactInfo(UUID userId, String firstName, String lastName, String phone) {
		guestRepository.findByUserId(userId).ifPresent(guest -> {
			if (firstName != null && !firstName.isBlank()) {
				guest.setFirstName(firstName.trim());
			}
			if (lastName != null && !lastName.isBlank()) {
				guest.setLastName(lastName.trim());
			}
			if (phone != null) {
				guest.setPhone(phone.isBlank() ? null : phone.trim());
			}
			guest.setUpdatedAt(Instant.now());
			guestRepository.save(guest);
		});
	}
}