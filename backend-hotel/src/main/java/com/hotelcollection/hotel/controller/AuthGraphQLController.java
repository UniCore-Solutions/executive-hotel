package com.hotelcollection.hotel.controller;

import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.graphql.data.method.annotation.SchemaMapping;
import org.springframework.stereotype.Controller;

import com.hotelcollection.hotel.dto.identity.AuthPayload;
import com.hotelcollection.hotel.dto.identity.LoginInput;
import com.hotelcollection.hotel.dto.identity.RegisterInput;
import com.hotelcollection.hotel.dto.identity.UpdateProfileInput;
import com.hotelcollection.hotel.security.CurrentUser;
import com.hotelcollection.hotel.security.CurrentUserAccessor;
import com.hotelcollection.hotel.service.AuthService;

/**
 * Identity GraphQL controller: login, registration, profile editing and the
 * current-user query. {@code Me}'s name/phone fields are schema-mapped
 * (resolved from the full {@link com.hotelcollection.hotel.entity.User} via
 * {@code auth.findUser}) because {@link CurrentUser} — the JWT principal —
 * deliberately carries only what authorization needs (id/email/roles/hotels).
 */
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

	@MutationMapping
	public CurrentUser updateMyProfile(@Argument UpdateProfileInput input) {
		CurrentUser actor = currentUser.require();
		auth.updateProfile(actor.userId(), input);
		return actor;
	}

	@QueryMapping
	public CurrentUser me() {
		return currentUser.require();
	}

	@SchemaMapping(typeName = "Me")
	public String id(CurrentUser me) {
		return String.valueOf(me.userId());
	}

	@SchemaMapping(typeName = "Me")
	public String firstName(CurrentUser me) {
		return auth.findUser(me.userId()).getFirstName();
	}

	@SchemaMapping(typeName = "Me")
	public String lastName(CurrentUser me) {
		return auth.findUser(me.userId()).getLastName();
	}

	@SchemaMapping(typeName = "Me")
	public String phone(CurrentUser me) {
		return auth.findUser(me.userId()).getPhone();
	}
}