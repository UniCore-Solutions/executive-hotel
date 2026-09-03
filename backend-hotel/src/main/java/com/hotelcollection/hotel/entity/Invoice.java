
package com.hotelcollection.hotel.entity;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;


import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "invoices")
@Getter
@Setter
@NoArgsConstructor
public class Invoice {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(nullable = false)
	private String invoiceNumber;

	@Column(name = "reservation_id", nullable = false)
	private UUID reservationId;

	@Column(name = "guest_id", nullable = false)
	private UUID guestId;

	@Column(nullable = false)
	private String billingName;

	private String billingAddress;

	@JdbcTypeCode(SqlTypes.CHAR)
	@Column(name = "billing_country_code")
	private String billingCountryCode;

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

	@Column(nullable = false)
	private String status;

	@Column(nullable = false)
	private Instant issuedAt;

	@Column(name = "pdf_storage_key")
	private String pdfStorageKey;

	@Column(name = "pdf_generated_at")
	private Instant pdfGeneratedAt;

	@OneToMany(mappedBy = "invoiceId", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
	private List<InvoiceItem> items = new ArrayList<>();
}