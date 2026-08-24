package com.hotelcollection.hotel.service;

import java.util.Map;
import java.util.UUID;

/**
 * Writes fact events into the transactional outbox. Must be called inside
 * the business transaction so the outbox row commits atomically with the
 * business write (ADR-002); the relay publishes afterwards.
 */
public interface EventPublisher {

	UUID publish(String eventType, int eventVersion, UUID hotelId, String aggregateId,
			Map<String, Object> payload, String traceId);
}