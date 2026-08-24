package com.hotelcollection.hotel.controller;

import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.graphql.data.method.annotation.SchemaMapping;
import org.springframework.stereotype.Controller;

import com.hotelcollection.hotel.dto.identity.AuthPayload;
import com.hotelcollection.hotel.dto.identity.LoginInput;
import com.hotelcollection.hotel.dto.identity.RegisterInput;
import com.hotelcollection.hotel.security.CurrentUser;
import com.hotelcollection.hotel.security.CurrentUserAccessor;
import com.hotelcollection.hotel.service.AuthService;

/** Identity GraphQL controller: login, registration and the current-user query. */
@Controller
public class AuthGraphQLController {

	private final AuthService auth;
	private final CurrentUserAccessor currentUser;

	public AuthGraphQLController(AuthService auth, CurrentUserAccessor currentUser) {
		this.auth = auth;
		this.currentUser = currentUser;
	}

	@MutationMapping
	public AuthPayload login(@Argument LoginInput input) {
		return auth.login(input);
	}

	@MutationMapping
	public AuthPayload register(@Argument RegisterInput input) {
		return auth.register(input);
	}

	@QueryMapping
	public CurrentUser me() {
		return currentUser.require();
	}

	@SchemaMapping(typeName = "Me")
	public String id(CurrentUser me) {
		return String.valueOf(me.userId());
	}
}