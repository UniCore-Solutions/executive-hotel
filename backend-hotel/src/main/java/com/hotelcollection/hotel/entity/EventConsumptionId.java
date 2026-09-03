package com.hotelcollection.hotel.entity;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

/** Composite key for {@link EventConsumption}: one row per (consumer, event). */
public class EventConsumptionId implements Serializable {

	private String consumerGroup;
	private UUID eventId;

	public EventConsumptionId() {
	}

	public EventConsumptionId(String consumerGroup, UUID eventId) {
		this.consumerGroup = consumerGroup;
		this.eventId = eventId;
	}

	public String getConsumerGroup() {
		return consumerGroup;
	}

	public UUID getEventId() {
		return eventId;
	}

	@Override
	public boolean equals(Object o) {
		if (this == o) {
			return true;
		}
		if (!(o instanceof EventConsumptionId that)) {
			return false;
		}
		return Objects.equals(consumerGroup, that.consumerGroup) && Objects.equals(eventId, that.eventId);
	}

	@Override
	public int hashCode() {
		return Objects.hash(consumerGroup, eventId);
	}
}
