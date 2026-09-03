package com.hotelcollection.hotel.dto.email;

/**
 * Template-facing data for {@code email/otp}. <b>Not wired to any sender or
 * consumer</b> — no OTP/email-verification flow exists anywhere in this
 * codebase to trigger it (see {@code NotificationService}'s class javadoc).
 * The template exists so the design is ready the moment such a flow is
 * built: add one event type + one {@code NotificationService} method that
 * builds this record from data the *authentication* service already
 * generated, validated and rate-limited — this record only ever carries a
 * code to display, never generates or checks one.
 */
public record OtpEmailData(String firstName, String code, String expiresInDisplay) {
}
