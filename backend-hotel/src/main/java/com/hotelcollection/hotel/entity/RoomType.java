package com.hotelcollection.hotel.entity;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "room_types")
@Getter
@Setter
@NoArgsConstructor
public class RoomType {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(name = "hotel_id", nullable = false)
	private UUID hotelId;

	@Column(nullable = false)
	private String name;

	@Column(nullable = false)
	private String slug;

	private String description;

	private String longDescription;

	@Column(name = "max_adults", nullable = false)
	private Short maxAdults;

	@Column(name = "max_children", nullable = false)
	private Short maxChildren;

	@Column(name = "total_inventory", nullable = false)
	private Integer totalInventory = 10;

	private String bedConfiguration;

	@Column(name = "size_sqm", precision = 6, scale = 2)
	private BigDecimal sizeSqm;

	private String viewType;

	@Column(nullable = false)
	private String status;

	@Column(name = "is_featured_on_homepage", nullable = false)
	private Boolean isFeaturedOnHomepage = false;

	@Column(nullable = false)
	private Instant createdAt;

	@Column(nullable = false)
	private Instant updatedAt;

	/** Lazy association — not serialized on REST responses (GraphQL resolves
	 * it via repository BatchMapping). */
	@JsonIgnore
	@ManyToMany
	@JoinTable(name = "room_type_amenities",
			joinColumns = @JoinColumn(name = "room_type_id"),
			inverseJoinColumns = @JoinColumn(name = "amenity_id"))
	private List<Amenity> amenities = new ArrayList<>();

	@PrePersist
	void generateSlug() {
		if (slug == null || slug.isBlank()) {
			slug = name == null ? "room"
					: name.trim().toLowerCase().replaceAll("[^a-z0-9]+", "-")
							.replaceAll("(^-|-$)", "");
			if (slug.isBlank()) slug = "room";
		}
	}
}