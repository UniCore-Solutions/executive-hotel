package com.hotelcollection.hotel.entity;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Stay occupant; guest_id NULL when the occupant has no guest record. */
@Entity
@Table(name = "reservation_guests")
@Getter
@Setter
@NoArgsConstructor
public class ReservationGuest {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(name = "reservation_id", nullable = false)
	private UUID reservationId;

	private UUID reservationRoomId;

	private UUID guestId;

	@Column(nullable = false)
	private String firstName;

	@Column(nullable = false)
	private String lastName;

	@Column(nullable = false)
	private boolean isPrimary;

	@Column(nullable = false)
	private String ageCategory;
}