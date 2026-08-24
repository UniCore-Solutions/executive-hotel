package com.hotelcollection.hotel.dto.identity;
import java.util.UUID;

/** Staff user creation (back-office, super_admin only). */
public record AdminCreateUserInput(String firstName, String lastName, String email,
		String password, String roleName, UUID hotelId) {
}
