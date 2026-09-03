package com.hotelcollection.hotel.service;
import java.util.UUID;

import com.hotelcollection.hotel.security.CurrentUser;
import com.hotelcollection.hotel.dto.identity.AuthPayload;
import com.hotelcollection.hotel.dto.identity.LoginInput;
import com.hotelcollection.hotel.dto.identity.RegisterInput;
import com.hotelcollection.hotel.dto.identity.RegistrationPendingResult;
import com.hotelcollection.hotel.dto.identity.ResendRegistrationOtpInput;
import com.hotelcollection.hotel.dto.identity.UpdateProfileInput;
import com.hotelcollection.hotel.dto.identity.VerifyRegistrationInput;
import com.hotelcollection.hotel.entity.User;

/** Identity use cases: register (email-verification required before the
 * account is usable — see {@link #register}/{@link #verifyRegistration}),
 * login, current-user read, profile edit. */
public interface AuthService {

	/**
	 * Creates the account (or completes a passwordless 'provisioned' one from
	 * an earlier accountless booking) in {@code pending_verification} status
	 * and emails it a code — <b>does not</b> return a usable session. Call
	 * {@link #verifyRegistration} with the code to activate the account and
	 * obtain a token.
	 */
	RegistrationPendingResult register(RegisterInput in);

	/** Confirms the code emailed by {@link #register}, activates the account
	 * (moves {@code pending_verification} → {@code active}, sets
	 * {@code emailVerifiedAt}, publishes {@code user.registered} for the
	 * welcome email) and returns a real session. Idempotent: verifying an
	 * already-active account's still-valid code just re-issues a token. */
	AuthPayload verifyRegistration(VerifyRegistrationInput in);

	/** Re-sends a registration code. Silently a no-op for an unknown email or
	 * one that is not (or no longer) pending verification — never reveals
	 * which, to avoid account enumeration. Rate-limited both by IP
	 * (RateLimitFilter) and per-email (OtpService's resend cooldown). */
	void resendRegistrationOtp(ResendRegistrationOtpInput in);

	AuthPayload login(LoginInput in);

	CurrentUser me(UUID userId);

	/** Full profile record for {@code Me}'s schema-mapped fields (name/phone). */
	User findUser(UUID userId);

	/** Updates the caller's own name/phone and propagates it to their linked
	 * guest record, if any. */
	void updateProfile(UUID userId, UpdateProfileInput in);
}
