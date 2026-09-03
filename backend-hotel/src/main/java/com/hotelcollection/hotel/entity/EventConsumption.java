package com.hotelcollection.hotel.entity;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Idempotent-consumer ledger (schema since V8, unwritten until the first
 * {@code @KafkaListener} — see {@code EmailEventConsumer}). One row per
 * (consumerGroup, eventId) that has finished processing; a redelivered event
 * whose row already exists is a no-op. {@code consumerGroup} is scoped per
 * unit of work (e.g. {@code "email:booking_confirmation"}), not per Kafka
 * consumer-group id, so two email types triggered by the same event are
 * tracked — and can fail/retry — independently.
 */
@Entity
@Table(name = "event_consumption")
@IdClass(EventConsumptionId.class)
@Getter
@Setter
@NoArgsConstructor
public class EventConsumption {

	@Id
	@Column(name = "consumer_group")
	private String consumerGroup;

	@Id
	@Column(name = "event_id")
	private UUID eventId;

	@Column(nullable = false)
	private Instant consumedAt;

	public EventConsumption(String consumerGroup, UUID eventId) {
		this.consumerGroup = consumerGroup;
		this.eventId = eventId;
		this.consumedAt = Instant.now();
	}
}
