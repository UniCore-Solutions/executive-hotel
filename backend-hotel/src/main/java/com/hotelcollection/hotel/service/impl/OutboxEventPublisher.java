package com.hotelcollection.hotel.service.impl;
import com.hotelcollection.hotel.service.EventPublisher;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.hotelcollection.hotel.entity.EventOutbox;
import com.hotelcollection.hotel.repository.EventOutboxRepository;

@Service
public class OutboxEventPublisher implements EventPublisher {

	private final EventOutboxRepository outboxRepository;

	public OutboxEventPublisher(EventOutboxRepository outboxRepository) {
		this.outboxRepository = outboxRepository;
	}

	@Override
	@Transactional(propagation = Propagation.MANDATORY)
	public UUID publish(String eventType, int eventVersion, UUID hotelId, String aggregateId,
			Map<String, Object> payload, String traceId) {
		EventOutbox row = new EventOutbox();
		row.setEventId(UUID.randomUUID());
		row.setEventType(eventType);
		row.setEventVersion(eventVersion);
		row.setHotelId(hotelId);
		row.setAggregateId(aggregateId);
		row.setPayload(payload == null ? Map.of() : payload);
		row.setTraceId(traceId);
		row.setStatus("pending");
		row.setAttempts(0);
		row.setCreatedAt(Instant.now());
		outboxRepository.save(row);
		return row.getEventId();
	}
}