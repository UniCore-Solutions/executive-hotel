package com.hotelcollection.hotel.service.impl;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import com.hotelcollection.hotel.entity.EventEnvelope;
import com.hotelcollection.hotel.service.OutboxPublisher;

@Component
public class KafkaOutboxPublisher implements OutboxPublisher {

	private static final Logger log = LoggerFactory.getLogger(KafkaOutboxPublisher.class);

	private final KafkaTemplate<String, EventEnvelope> kafkaTemplate;

	public KafkaOutboxPublisher(KafkaTemplate<String, EventEnvelope> kafkaTemplate) {
		this.kafkaTemplate = kafkaTemplate;
	}

	@Override
	public void publish(List<EventEnvelope> envelopes) {
		for (EventEnvelope envelope : envelopes) {
			try {
				kafkaTemplate.send(envelope.topic(), envelope.eventId().toString(), envelope)
						.get(10, java.util.concurrent.TimeUnit.SECONDS);
				log.debug("published {} to {}", envelope.eventType(), envelope.topic());
			} catch (InterruptedException ex) {
				Thread.currentThread().interrupt();
				throw new IllegalStateException("interrupted while publishing " + envelope.eventType(), ex);
			} catch (Exception ex) {
				throw new IllegalStateException("failed to publish " + envelope.eventType()
						+ " to " + envelope.topic(), ex);
			}
		}
	}
}