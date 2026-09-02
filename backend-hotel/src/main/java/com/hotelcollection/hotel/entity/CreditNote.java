package com.hotelcollection.hotel.entity;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
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

/**
 * The adjustment against an already-issued {@link Invoice} when its
 * reservation is cancelled — original charge, penalty retained, amount
 * actually credited back. One per reservation; see V33.
 */
@Entity
@Table(name = "credit_notes")
@Getter
@Setter
@NoArgsConstructor
public class CreditNote {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(nullable = false)
	private String creditNoteNumber;

	@Column(name = "invoice_id", nullable = false)
	private UUID invoiceId;

	@Column(name = "reservation_id", nullable = false)
	private UUID reservationId;

	@Column(name = "reservation_cancellation_id", nullable = false)
	private UUID reservationCancellationId;

	@Column(name = "guest_id", nullable = false)
	private UUID guestId;

	@Column(nullable = false)
	private String billingName;

	@JdbcTypeCode(SqlTypes.CHAR)
	@Column(name = "currency_code", nullable = false)
	private String currencyCode;

	@Column(nullable = false, precision = 10, scale = 2)
	private BigDecimal originalAmount;

	@Column(nullable = false, precision = 10, scale = 2)
	private BigDecimal penaltyAmount;

	@Column(nullable = false, precision = 10, scale = 2)
	private BigDecimal creditedAmount;

	@Column(nullable = false)
	private String status;

	@Column(nullable = false)
	private Instant issuedAt;
}
