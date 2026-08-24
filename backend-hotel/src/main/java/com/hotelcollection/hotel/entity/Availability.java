package com.hotelcollection.hotel.entity;

import java.time.LocalDate;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Sparse inventory source (C9), independent of physical rooms. A row exists
 * only for a night with activity (sold/out_of_order/blocked &gt; 0); a night
 * with no row is fully available. Capacity lives on {@link RoomType}
 * (total_inventory); {@code version} is the optimistic-lock guard for
 * concurrent bookings.
 */
@Entity
@Table(name = "availability")
@Getter
@Setter
@NoArgsConstructor
public class Availability {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(name = "room_type_id", nullable = false)
	private UUID roomTypeId;

	@Column(name = "stay_date", nullable = false)
	private LocalDate stayDate;

	@Column(nullable = false)
	private Integer roomsSold;

	@Column(nullable = false)
	private Integer outOfOrder;

	@Column(nullable = false)
	private Integer blocked;

	@Version
	@Column(nullable = false)
	private Integer version;

	public int free(int totalInventory) {
		return totalInventory - roomsSold - outOfOrder - blocked;
	}

	public void sell(int rooms, int totalInventory) {
		if (free(totalInventory) < rooms) {
			throw new IllegalStateException(
					"no availability for room_type " + roomTypeId + " on " + stayDate);
		}
		roomsSold += rooms;
	}

	public void release(int rooms) {
		roomsSold = Math.max(0, roomsSold - rooms);
	}

	/** True when this row carries no information and can be removed (sparse model). */
	public boolean isEmpty() {
		return roomsSold == 0 && outOfOrder == 0 && blocked == 0;
	}
}