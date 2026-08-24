package com.hotelcollection.hotel.entity;

import java.time.Instant;
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

/** Physical room. Operational state only — inventory lives in availability (C9). */
@Entity
@Table(name = "rooms")
@Getter
@Setter
@NoArgsConstructor
public class Room {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(name = "hotel_id", nullable = false)
	private UUID hotelId;

	@Column(name = "room_type_id", nullable = false)
	private UUID roomTypeId;

	@Column(nullable = false)
	private String roomNumber;

	private String floor;

	@Column(nullable = false)
	private String status;

	@Column(nullable = false)
	private String housekeepingStatus;

	@Column(nullable = false)
	private String maintenanceStatus;

	@Column(nullable = false)
	private Instant createdAt;

	@Column(nullable = false)
	private Instant updatedAt;
}