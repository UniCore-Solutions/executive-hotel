package com.hotelcollection.hotel.entity;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "hotels")
@Getter
@Setter
@NoArgsConstructor
public class Hotel {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(nullable = false)
	private String name;

	private String brand;

	private String description;

	private String longDescription;

	private String hotelType;

	private String addressLine1;

	private String addressLine2;

	private String city;

	@JdbcTypeCode(SqlTypes.CHAR)
	@Column(name = "country_code")
	private String countryCode;

	@Column(precision = 9, scale = 6)
	private BigDecimal latitude;

	@Column(precision = 9, scale = 6)
	private BigDecimal longitude;

	private String phone;

	private String email;

	private String website;

	/** IANA timezone id, e.g. "Europe/Lisbon". Display/validation only — no
	 * scheduling logic in this codebase currently derives from it. */
	private String timezone;

	/** ISO 639-1 codes (e.g. "en", "fr"). Nullable native Postgres array —
	 * same {@code @JdbcTypeCode} idiom this entity already uses for
	 * {@link #config}'s jsonb column, applied to {@code SqlTypes.ARRAY}. */
	@JdbcTypeCode(SqlTypes.ARRAY)
	@Column(columnDefinition = "text[]")
	private List<String> languages;

	private Short starRating;

	private LocalTime checkInTime;

	private LocalTime checkOutTime;

	@JdbcTypeCode(SqlTypes.CHAR)
	@Column(name = "default_currency")
	private String defaultCurrency;

	@Column(name = "platform_id")
	private UUID platformId;

	@Column(nullable = false)
	private String slug;

	@JdbcTypeCode(SqlTypes.JSON)
	@Column(columnDefinition = "jsonb")
	private Map<String, Object> config;

	private String status;

	@Column(name = "is_featured_on_homepage", nullable = false)
	private Boolean isFeaturedOnHomepage = false;

	@Column(nullable = false)
	private Instant createdAt;

	@Column(nullable = false)
	private Instant updatedAt;

	/** Lazy association — not serialized on REST responses (GraphQL resolves
	 * it via repository BatchMapping). A loaded entity's lazy collection
	 * cannot be initialized after the transaction closes. */
	@JsonIgnore
	@ManyToMany
	@JoinTable(name = "hotel_amenities",
			joinColumns = @JoinColumn(name = "hotel_id"),
			inverseJoinColumns = @JoinColumn(name = "amenity_id"))
	private List<Amenity> amenities = new ArrayList<>();
}