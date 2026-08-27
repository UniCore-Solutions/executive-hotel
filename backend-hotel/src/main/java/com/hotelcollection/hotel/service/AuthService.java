package com.hotelcollection.hotel.service;
import java.util.UUID;

import com.hotelcollection.hotel.security.CurrentUser;
import com.hotelcollection.hotel.dto.identity.AuthPayload;
import com.hotelcollection.hotel.dto.identity.LoginInput;
import com.hotelcollection.hotel.dto.identity.RegisterInput;
import com.hotelcollection.hotel.dto.identity.UpdateProfileInput;
import com.hotelcollection.hotel.entity.User;

/** Identity use cases: register, login, current-user read, profile edit. */
public interface AuthService {

	AuthPayload register(RegisterInput in);

	AuthPayload login(LoginInput in);

	CurrentUser me(UUID userId);

	/** Full profile record for {@code Me}'s schema-mapped fields (name/phone). */
	User findUser(UUID userId);

	/** Updates the caller's own name/phone and propagates it to their linked
	 * guest record, if any. */
	void updateProfile(UUID userId, UpdateProfileInput in);
}