
package com.hotelcollection.hotel.entity;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;


import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Booking aggregate root. Monetary fields are snapshotted at booking time
 * and guarded by the C16 totals-identity CHECK set.
 */
@Entity
@Table(name = "reservations")
@Getter
@Setter
@NoArgsConstructor
public class Reservation {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(nullable = false)
	private String reference;

	@Column(unique = true)
	private String idempotencyKey;

	@Column(name = "hotel_id", nullable = false)
	private UUID hotelId;

	@Column(name = "guest_id", nullable = false)
	private UUID guestId;

	@ManyToOne(fetch = FetchType.EAGER)
	@JoinColumn(name = "guest_id", insertable = false, updatable = false)
	private Guest guest;

	@OneToOne(mappedBy = "reservation", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
	private ReservationCancellation cancellation;

	private UUID bookedByUserId;

	private UUID promotionId;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private ReservationStatus status;

	private Instant holdExpiresAt;

	@Column(name = "check_in_date", nullable = false)
	private LocalDate checkInDate;

	@Column(name = "check_out_date", nullable = false)
	private LocalDate checkOutDate;

	@Column(nullable = false)
	private Short adults;

	@Column(nullable = false)
	private Short children;

	@JdbcTypeCode(SqlTypes.CHAR)
	@Column(name = "currency_code", nullable = false)
	private String currencyCode;

	@Column(nullable = false, precision = 10, scale = 2)
	private BigDecimal subtotalAmount;

	@Column(nullable = false, precision = 10, scale = 2)
	private BigDecimal discountAmount;

	@Column(nullable = false, precision = 10, scale = 2)
	private BigDecimal taxAmount;

	@Column(nullable = false, precision = 10, scale = 2)
	private BigDecimal feeAmount;

	@Column(nullable = false, precision = 10, scale = 2)
	private BigDecimal totalAmount;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private PaymentStatus paymentStatus;

	@Column(nullable = false)
	private String source;

	private String notes;

	/** Guest-selected arrival window (e.g. "15:00 – 18:00") — V29. */
	@Column(name = "arrival_slot")
	private String arrivalSlot;

	/** Free-text special requests collected on the booking form — V29. */
	@Column(name = "special_requests")
	private String specialRequests;

	@Column(nullable = false)
	private Instant createdAt;

	@Column(nullable = false)
	private Instant updatedAt;

	@org.hibernate.annotations.Fetch(org.hibernate.annotations.FetchMode.SUBSELECT)
	@OneToMany(mappedBy = "reservationId", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
	private List<ReservationRoom> roomLines = new ArrayList<>();

	@org.hibernate.annotations.Fetch(org.hibernate.annotations.FetchMode.SUBSELECT)
	@OneToMany(mappedBy = "reservationId", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
	private List<ReservationExtra> extras = new ArrayList<>();

	@org.hibernate.annotations.Fetch(org.hibernate.annotations.FetchMode.SUBSELECT)
	@OneToMany(mappedBy = "reservationId", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
	private List<ReservationCharge> charges = new ArrayList<>();

	@org.hibernate.annotations.Fetch(org.hibernate.annotations.FetchMode.SUBSELECT)
	@OneToMany(mappedBy = "reservationId", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
	private List<ReservationStatusHistory> statusHistory = new ArrayList<>();
}