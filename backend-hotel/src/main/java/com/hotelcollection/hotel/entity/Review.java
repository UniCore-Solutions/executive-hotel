package com.hotelcollection.hotel.entity;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "reviews")
@Getter
@Setter
@NoArgsConstructor
public class Review {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(name = "hotel_id", nullable = false)
	private UUID hotelId;

	private UUID reservationId;

	private UUID guestId;

	private String authorName;

	@Column(nullable = false)
	private Short rating;

	private Short cleanlinessRating;

	private Short locationRating;

	private Short serviceRating;

	private Short valueRating;

	private String title;

	private String comment;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private ReviewModerationStatus moderationStatus;

	@Column(name = "is_featured_on_homepage", nullable = false)
	private Boolean isFeaturedOnHomepage = false;

	private String responseText;

	private Instant respondedAt;

	private UUID respondedByUserId;

	@Column(nullable = false)
	private Instant createdAt;

	@Column(nullable = false)
	private Instant updatedAt;
}