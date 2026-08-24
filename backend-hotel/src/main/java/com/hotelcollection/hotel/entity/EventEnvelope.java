package com.hotelcollection.hotel.entity;

import java.util.Map;
import java.util.UUID;

/**
 * Fact published via the transactional outbox (ADR-002).
 *
 * @param eventId       unique id (also the outbox row id)
 * @param eventType     e.g. booking.confirmed
 * @param eventVersion  schema version of the payload
 * @param hotelId       hotel scope, may be null for platform events
 * @param aggregateId   e.g. reservation:RC-ABC123
 * @param payload       JSON body
 * @param traceId       correlation id
 */
public record EventEnvelope(
		UUID eventId,
		String eventType,
		int eventVersion,
		UUID hotelId,
		String aggregateId,
		Map<String, Object> payload,
		String traceId) {

	public static final String TOPIC_PREFIX = "hotelcollection.";

	public String topic() {
		return TOPIC_PREFIX + eventType + ".v" + eventVersion;
	}
}