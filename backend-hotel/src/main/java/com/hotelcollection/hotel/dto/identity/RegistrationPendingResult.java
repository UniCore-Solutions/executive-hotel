package com.hotelcollection.hotel.dto.identity;

/** Returned by {@code register()} instead of a session: the account exists
 * but is not usable yet — a code was emailed to {@code email} and must be
 * confirmed via {@code verifyRegistration} before a token is issued. */
public record RegistrationPendingResult(String email, int otpExpiresInMinutes) {
}
