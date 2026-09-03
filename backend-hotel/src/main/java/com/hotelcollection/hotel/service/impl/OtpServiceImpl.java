package com.hotelcollection.hotel.service.impl;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.hotelcollection.hotel.entity.OtpCode;
import com.hotelcollection.hotel.entity.OtpPurpose;
import com.hotelcollection.hotel.exception.DomainException;
import com.hotelcollection.hotel.repository.OtpCodeRepository;
import com.hotelcollection.hotel.service.NotificationService;
import com.hotelcollection.hotel.service.OtpService;

@Service
public class OtpServiceImpl implements OtpService {

	private static final SecureRandom RANDOM = new SecureRandom();
	private static final String GENERIC_ERROR = "incorrect or expired code";

	private final OtpCodeRepository otpCodeRepository;
	private final NotificationService notificationService;
	private final Duration codeTtl;
	private final Duration resendCooldown;
	private final Duration grantWindow;
	private final int maxAttempts;

	public OtpServiceImpl(OtpCodeRepository otpCodeRepository, NotificationService notificationService,
			@Value("${app.otp.code-ttl-minutes:10}") long codeTtlMinutes,
			@Value("${app.otp.resend-cooldown-seconds:60}") long resendCooldownSeconds,
			@Value("${app.otp.lookup-grant-minutes:30}") long grantWindowMinutes,
			@Value("${app.otp.max-attempts:5}") int maxAttempts) {
		this.otpCodeRepository = otpCodeRepository;
		this.notificationService = notificationService;
		this.codeTtl = Duration.ofMinutes(codeTtlMinutes);
		this.resendCooldown = Duration.ofSeconds(resendCooldownSeconds);
		this.grantWindow = Duration.ofMinutes(grantWindowMinutes);
		this.maxAttempts = maxAttempts;
	}

	@Override
	@Transactional
	public String issue(OtpPurpose purpose, String email, String recipientFirstName, UUID userId,
			UUID reservationId) {
		String normalizedEmail = normalize(email);
		otpCodeRepository.findFirstByEmailAndPurposeOrderByCreatedAtDesc(normalizedEmail, purpose)
				.filter(previous -> previous.getCreatedAt().isAfter(Instant.now().minus(resendCooldown)))
				.ifPresent(previous -> {
					throw DomainException.conflict("please wait before requesting another code");
				});

		String code = generateCode();
		OtpCode otp = new OtpCode();
		otp.setPurpose(purpose);
		otp.setEmail(normalizedEmail);
		otp.setCodeHash(hash(code));
		otp.setUserId(userId);
		otp.setReservationId(reservationId);
		otp.setAttempts(0);
		otp.setMaxAttempts(maxAttempts);
		otp.setExpiresAt(Instant.now().plus(codeTtl));
		otp.setCreatedAt(Instant.now());
		otpCodeRepository.save(otp);

		notificationService.sendOtpEmail(normalizedEmail, recipientFirstName, code, (int) codeTtl.toMinutes());
		return code;
	}

	// noRollbackFor: a wrong-code call *saves* the incremented attempts count
	// and then throws DomainException.validation to report the failure —
	// @Transactional's default (roll back on any unchecked exception) would
	// silently undo that save, so every wrong guess would look like the
	// first one forever and the attempt budget could never be reached.
	//
	// REQUIRES_NEW: every caller of verify() is itself @Transactional
	// (AuthServiceImpl#verifyRegistration, BookingServiceImpl's
	// reservation-lookup verify) without its own noRollbackFor override —
	// with the default REQUIRED propagation, this method's save would join
	// *their* physical transaction, and their own rollback-on-exception
	// default would undo it anyway the moment the exception propagates past
	// their boundary, reintroducing the exact bug noRollbackFor is here to
	// prevent. Running in its own transaction makes the attempt count and
	// the verified marker commit unconditionally, independent of whatever
	// the caller decides to do with the exception afterward — correct
	// either way, since a security counter must never be undoable by
	// downstream, unrelated failures.
	@Override
	@Transactional(propagation = Propagation.REQUIRES_NEW, noRollbackFor = DomainException.class)
	public UUID verify(OtpPurpose purpose, String email, String code, UUID reservationId) {
		String normalizedEmail = normalize(email);
		OtpCode otp = otpCodeRepository.findFirstByEmailAndPurposeOrderByCreatedAtDesc(normalizedEmail, purpose)
				.orElseThrow(() -> DomainException.validation(GENERIC_ERROR));

		if (reservationId != null && !Objects.equals(reservationId, otp.getReservationId())) {
			throw DomainException.validation(GENERIC_ERROR);
		}
		if (otp.getVerifiedAt() != null) {
			// Idempotent: a retried "verify" for a code already confirmed
			// returns the same grant rather than erroring.
			return otp.getId();
		}
		if (otp.getExpiresAt().isBefore(Instant.now())) {
			throw DomainException.validation(GENERIC_ERROR);
		}
		if (otp.getAttempts() >= otp.getMaxAttempts()) {
			throw DomainException.conflict("too many incorrect attempts — request a new code");
		}
		if (code == null || !hash(code.trim()).equals(otp.getCodeHash())) {
			otp.setAttempts(otp.getAttempts() + 1);
			otpCodeRepository.save(otp);
			throw DomainException.validation(GENERIC_ERROR);
		}

		otp.setVerifiedAt(Instant.now());
		otpCodeRepository.save(otp);
		return otp.getId();
	}

	@Override
	@Transactional(readOnly = true)
	public boolean isGrantValid(UUID grantId, OtpPurpose purpose, String email, UUID reservationId) {
		if (grantId == null) {
			return false;
		}
		String normalizedEmail = normalize(email);
		Optional<OtpCode> otp = otpCodeRepository.findById(grantId);
		return otp.filter(o -> o.getPurpose() == purpose)
				.filter(o -> o.getEmail().equalsIgnoreCase(normalizedEmail))
				.filter(o -> Objects.equals(o.getReservationId(), reservationId))
				.filter(o -> o.getVerifiedAt() != null)
				.filter(o -> o.getVerifiedAt().isAfter(Instant.now().minus(grantWindow)))
				.isPresent();
	}

	private static String normalize(String email) {
		return email == null ? null : email.trim().toLowerCase();
	}

	private static String generateCode() {
		return String.format("%06d", RANDOM.nextInt(1_000_000));
	}

	private static String hash(String code) {
		try {
			byte[] bytes = MessageDigest.getInstance("SHA-256").digest(code.getBytes(StandardCharsets.UTF_8));
			return HexFormat.of().formatHex(bytes);
		} catch (NoSuchAlgorithmException ex) {
			// SHA-256 is a mandatory JDK algorithm — this can never actually happen.
			throw new IllegalStateException(ex);
		}
	}
}
