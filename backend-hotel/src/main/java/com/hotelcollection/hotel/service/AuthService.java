package com.hotelcollection.hotel.service;
import java.util.UUID;

import com.hotelcollection.hotel.security.CurrentUser;
import com.hotelcollection.hotel.dto.identity.AuthPayload;
import com.hotelcollection.hotel.dto.identity.LoginInput;
import com.hotelcollection.hotel.dto.identity.RegisterInput;

/** Identity use cases: register, login, current-user read. */
public interface AuthService {

	AuthPayload register(RegisterInput in);

	AuthPayload login(LoginInput in);

	CurrentUser me(UUID userId);
}