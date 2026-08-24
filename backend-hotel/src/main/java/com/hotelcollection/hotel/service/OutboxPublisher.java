package com.hotelcollection.hotel.service;
import com.hotelcollection.hotel.entity.EventEnvelope;

import java.util.List;

/** Publishes claimed outbox envelopes to Kafka (infrastructure abstraction). */
public interface OutboxPublisher {

	void publish(List<EventEnvelope> envelopes);
}