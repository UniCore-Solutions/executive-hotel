package com.hotelcollection.hotel.entity;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Transactional outbox (ADR-002): business write + outbox row commit in
 * one transaction; the relay publishes to Kafka afterwards.
 */
@Entity
@Table(name = "event_outbox")
@Getter
@Setter
@NoArgsConstructor
public class EventOutbox {

	@Id
	private UUID eventId;

	@Column(nullable = false)
	private String eventType;

	@Column(nullable = false)
	private Integer eventVersion;

	private UUID hotelId;

	@Column(nullable = false)
	private String aggregateId;

	@JdbcTypeCode(SqlTypes.JSON)
	@Column(columnDefinition = "jsonb", nullable = false)
	private Map<String, Object> payload;

	private String traceId;

	@Column(nullable = false)
	private String status;

	@Column(nullable = false)
	private Integer attempts;

	@Column(nullable = false)
	private Instant createdAt;

	private Instant publishedAt;
}