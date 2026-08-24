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

/** One outbound notification (snapshot of subject/body, rendered at send time). */
@Entity
@Table(name = "notifications")
@Getter
@Setter
@NoArgsConstructor
public class Notification {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	private UUID hotelId;

	@Column(nullable = false)
	private String recipientType;

	@Column(nullable = false)
	private UUID recipientId;

	@Column(nullable = false)
	private String channel;

	@Column(nullable = false)
	private String type;

	private UUID templateId;

	private String subject;

	private String body;

	@Column(nullable = false)
	private String status;

	private String provider;

	private String providerReference;

	@Column(nullable = false)
	private Integer attempts;

	private Instant sentAt;

	private String error;

	@Column(nullable = false)
	private Instant createdAt;
}
