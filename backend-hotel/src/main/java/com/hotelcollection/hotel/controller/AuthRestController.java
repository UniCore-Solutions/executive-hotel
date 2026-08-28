package com.hotelcollection.hotel.controller;
import com.hotelcollection.hotel.security.AuthRateLimitFilter;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hotelcollection.hotel.dto.identity.AuthPayload;
import com.hotelcollection.hotel.dto.identity.LoginInput;
import com.hotelcollection.hotel.dto.identity.RegisterInput;
import com.hotelcollection.hotel.dto.identity.UpdateProfileInput;
import com.hotelcollection.hotel.security.CurrentUser;
import com.hotelcollection.hotel.security.CurrentUserAccessor;
import com.hotelcollection.hotel.service.AuthService;

/** Public identity endpoints. Rate-limited (see AuthRateLimitFilter). */
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

	@PostMapping("/register")
	public ResponseEntity<AuthPayload> register(@RequestBody RegisterInput in) {
		return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(in));
	}

	@PostMapping("/me/profile")
	public CurrentUser updateProfile(@RequestBody UpdateProfileInput in) {
		CurrentUser actor = currentUser.require();
		authService.updateProfile(actor.userId(), in);
		return actor;
	}
}