package com.hotelcollection.hotel.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hotelcollection.hotel.dto.identity.AuthPayload;
import com.hotelcollection.hotel.dto.identity.LoginInput;
import com.hotelcollection.hotel.dto.identity.RegisterInput;
import com.hotelcollection.hotel.dto.identity.RegistrationPendingResult;
import com.hotelcollection.hotel.dto.identity.ResendRegistrationOtpInput;
import com.hotelcollection.hotel.dto.identity.UpdateProfileInput;
import com.hotelcollection.hotel.dto.identity.VerifyRegistrationInput;
import com.hotelcollection.hotel.security.CurrentUser;
import com.hotelcollection.hotel.security.CurrentUserAccessor;
import com.hotelcollection.hotel.service.AuthService;

/** Public identity endpoints. Rate-limited (see RateLimitFilter — the
 * register/verify/resend trio share the "/api/v1/auth/register" budget by
 * nesting under that path prefix). */
@RestController
@RequestMapping("/api/v1/auth")
public class AuthRestController {

	private final AuthService authService;
	private final CurrentUserAccessor currentUser;

	public AuthRestController(AuthService authService, CurrentUserAccessor currentUser) {
		this.authService = authService;
		this.currentUser = currentUser;
	}

	@PostMapping("/login")
	public AuthPayload login(@RequestBody LoginInput in) {
		return authService.login(in);
	}

	/** Creates the account but does not log it in — see
	 * {@link AuthService#register}. The guest must confirm the emailed code
	 * via {@code POST /register/verify} to receive a usable session. */
	@PostMapping("/register")
	public ResponseEntity<RegistrationPendingResult> register(@RequestBody RegisterInput in) {
		return ResponseEntity.status(HttpStatus.ACCEPTED).body(authService.register(in));
	}

	@PostMapping("/register/verify")
	public AuthPayload verifyRegistration(@RequestBody VerifyRegistrationInput in) {
		return authService.verifyRegistration(in);
	}

	@PostMapping("/register/resend")
	public ResponseEntity<Void> resendRegistrationOtp(@RequestBody ResendRegistrationOtpInput in) {
		authService.resendRegistrationOtp(in);
		return ResponseEntity.noContent().build();
	}

	@PostMapping("/me/profile")
	public CurrentUser updateProfile(@RequestBody UpdateProfileInput in) {
		CurrentUser actor = currentUser.require();
		authService.updateProfile(actor.userId(), in);
		return actor;
	}
}
