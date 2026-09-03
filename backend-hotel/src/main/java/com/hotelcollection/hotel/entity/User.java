package com.hotelcollection.hotel.entity;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
public class User {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	private String email;

	private String passwordHash;

	private String firstName;

	private String lastName;

	private String phone;

	private String status;

	private Instant emailVerifiedAt;

	private Instant lastLoginAt;

	private Instant createdAt;

	private Instant updatedAt;

	@OneToMany(mappedBy = "user")
	private List<UserRole> userRoles = new ArrayList<>();
}