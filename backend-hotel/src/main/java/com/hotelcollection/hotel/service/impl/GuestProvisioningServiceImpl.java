package com.hotelcollection.hotel.service.impl;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hotelcollection.hotel.service.GuestProvisioningService;
import com.hotelcollection.hotel.entity.Guest;
import com.hotelcollection.hotel.entity.User;
import com.hotelcollection.hotel.repository.GuestRepository;
import com.hotelcollection.hotel.repository.UserRepository;

/**
 * Guest provisioning for identity (account registration creates or links
 * the guest profile) and guest lookups for other services. Also provisions
 * silent passwordless accounts for accountless bookings (status
 * 'provisioned'), completed later by registration.
 */
@Service
public class GuestProvisioningServiceImpl implements GuestProvisioningService {

	private final GuestRepository guestRepository;
	private final UserRepository userRepository;

	public GuestProvisioningServiceImpl(GuestRepository guestRepository,
			UserRepository userRepository) {
		this.guestRepository = guestRepository;
		this.userRepository = userRepository;
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
	@Transactional
	public Guest provisionOrLink(UUID userId, String firstName, String lastName, String email) {
		Optional<Guest> byUser = guestRepository.findByUserId(userId);
		if (byUser.isPresent()) {
			Guest guest = byUser.get();
			if (firstName != null && !firstName.isBlank()) {
				guest.setFirstName(firstName.trim());
			}
			if (lastName != null && !lastName.isBlank()) {
				guest.setLastName(lastName.trim());
			}
			if (email != null && !email.isBlank()) {
				guest.setEmail(email.trim().toLowerCase());
			}
			guest.setUpdatedAt(Instant.now());
			return guestRepository.save(guest);
		}
		if (email != null && !email.isBlank()) {
			String normalized = email.trim().toLowerCase();
			Optional<Guest> byEmail = guestRepository.findByEmailIgnoreCase(normalized).stream()
					.findFirst();
			if (byEmail.isPresent()) {
				Guest guest = byEmail.get();
				guest.setUserId(userId);
				if (firstName != null && !firstName.isBlank()) {
					guest.setFirstName(firstName.trim());
				}
				if (lastName != null && !lastName.isBlank()) {
					guest.setLastName(lastName.trim());
				}
				guest.setEmail(normalized);
				guest.setUpdatedAt(Instant.now());
				return guestRepository.save(guest);
			}
		}
		return provision(userId, firstName, lastName, email);
	}

	@Override
	@Transactional
	public User ensureAccount(Guest guest) {
		if (guest.getUserId() != null) {
			return userRepository.findById(guest.getUserId()).orElse(null);
		}
		String email = guest.getEmail();
		if (email == null || email.isBlank()) {
			return null; // no identity to provision against
		}
		String normalized = email.trim().toLowerCase();
		User user = userRepository.findByEmailIgnoreCase(normalized).orElseGet(() -> {
			User created = new User();
			created.setEmail(normalized);
			created.setPasswordHash(null);
			created.setFirstName(guest.getFirstName());
			created.setLastName(guest.getLastName());
			created.setStatus("provisioned");
			created.setCreatedAt(Instant.now());
			created.setUpdatedAt(Instant.now());
			try {
				return userRepository.save(created);
			} catch (DataIntegrityViolationException ex) {
				// a concurrent booking with the same email won the race —
				// reuse the winner instead of failing the booking
				return userRepository.findByEmailIgnoreCase(normalized).orElse(null);
			}
		});
		if (user == null) {
			return null;
		}
		guest.setUserId(user.getId());
		guest.setUpdatedAt(Instant.now());
		guestRepository.save(guest);
		return user;
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
