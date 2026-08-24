package com.hotelcollection.hotel.entity;

import java.math.BigDecimal;
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

@Entity
@Table(name = "invoice_items")
@Getter
@Setter
@NoArgsConstructor
public class InvoiceItem {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(name = "invoice_id", nullable = false)
	private UUID invoiceId;

	@Column(nullable = false)
	private String description;

	@Column(nullable = false)
	private String itemType;

	@Column(nullable = false, precision = 6, scale = 2)
	private BigDecimal quantity;

	@Column(nullable = false, precision = 10, scale = 2)
	private BigDecimal unitPrice;

	@Column(nullable = false, precision = 10, scale = 2)
	private BigDecimal totalPrice;

	@Column(nullable = false)
	private Short sortOrder;
}