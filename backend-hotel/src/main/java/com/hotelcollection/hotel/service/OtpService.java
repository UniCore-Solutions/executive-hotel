package com.hotelcollection.hotel.service;

import java.util.UUID;

import com.hotelcollection.hotel.entity.OtpPurpose;

/**
 * Generates, delivers and verifies one-time codes for the two flows that
 * need them: registration email verification and guest (no-account)
 * reservation lookup. Domain-agnostic on purpose — {@code AuthServiceImpl}
 * and {@code BookingServiceImpl} each supply their own {@link OtpPurpose}
 * and correlation id ({@code userId} / {@code reservationId}) and do their
 * own follow-up (activate the account; hand back a lookup grant).
 *
 * <p><b>Security:</b> only a SHA-256 hash of the code is ever persisted
 * ({@code otp_codes.code_hash}) — never the plaintext, never in a log line
 * from this service. Delivery is a direct, synchronous call to
 * {@link NotificationService#sendOtpEmail} — deliberately <em>not</em>
 * routed through the transactional outbox / Kafka the way every other email
 * is, because that would put the code itself on the message bus (replicated,
 * retained, readable by any consumer) for no benefit an OTP's few-minute
 * lifetime needs. This is the one documented exception to "business services
 * never call NotificationService directly."
 */
public interface OtpService {

	/**
	 * Generates a fresh code, stores its hash, and emails it immediately.
	 * Enforces a resend cooldown per (email, purpose) — throws
	 * {@code DomainException.conflict} if the last code for this pair was
	 * issued too recently.
	 *
	 * @return the plaintext code — for the caller's own audit/testing needs
	 *         only; production callers (AuthServiceImpl, BookingServiceImpl)
	 *         discard it and never log it. It has already been emailed by
	 *         the time this returns.
	 */
	String issue(OtpPurpose purpose, String email, String recipientFirstName, UUID userId, UUID reservationId);

	/**
	 * Validates {@code code} against the current (most recently issued) code
	 * for {@code (email, purpose)} — and, for {@code reservation_lookup},
	 * that it was issued for this exact {@code reservationId}. Throws
	 * {@code DomainException.validation} for a wrong or expired code,
	 * {@code DomainException.conflict} once the attempt budget is exhausted
	 * (a fresh {@link #issue} is required to keep trying). Idempotent: a
	 * retry with a code already verified returns the same grant id rather
	 * than failing.
	 *
	 * @return the verified code's id — doubles as a short-lived "verified"
	 *         grant handle for {@link #isGrantValid}.
	 */
	UUID verify(OtpPurpose purpose, String email, String code, UUID reservationId);

	/**
	 * True if {@code grantId} (an id returned by {@link #verify}) is a
	 * currently-valid verified grant for exactly this
	 * {@code (purpose, email, reservationId)} — used by the read-side gate,
	 * {@code BookingService#getByReferenceAndEmailVerified}. The grant
	 * window is longer than the code's own entry-time expiry (verifying is
	 * the hard part; browsing afterward shouldn't require re-verifying).
	 */
	boolean isGrantValid(UUID grantId, OtpPurpose purpose, String email, UUID reservationId);
}
