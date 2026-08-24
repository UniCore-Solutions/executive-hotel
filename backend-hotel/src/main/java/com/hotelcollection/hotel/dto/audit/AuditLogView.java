package com.hotelcollection.hotel.dto.audit;

import java.time.Instant;
import java.util.UUID;

import com.hotelcollection.hotel.entity.AuditLog;

/** Audit entry with the actor's email resolved (back-office audit log). */
public record AuditLogView(UUID id, UUID actorUserId, String actorEmail, String action,
		String resourceType, UUID resourceId, UUID hotelId, String result, Object metadata,
		Instant createdAt) {

	public static AuditLogView of(AuditLog log, String actorEmail) {
		return new AuditLogView(log.getId(), log.getActorUserId(), actorEmail, log.getAction(),
				log.getResourceType(), log.getResourceId(), log.getHotelId(), log.getResult(),
				log.getMetadata(), log.getCreatedAt());
	}
}
