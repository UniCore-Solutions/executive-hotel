package com.hotelcollection.hotel.repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;

import com.hotelcollection.hotel.entity.EventOutbox;

public interface EventOutboxRepository extends JpaRepository<EventOutbox, UUID> {

	@Query("select e from EventOutbox e where e.status = 'pending' order by e.createdAt")
	List<EventOutbox> findPending();

	@Query("select e from EventOutbox e where e.eventType = :eventType")
	List<EventOutbox> findByEventType(@Param("eventType") String eventType);

	/**
	 * Atomically claims a batch of pending rows (single relay instance):
	 * pending -> publishing, attempts incremented. Returns claimed ids.
	 */
	@Modifying
	@Query(value = """
			update event_outbox
			set status = 'publishing', attempts = attempts + 1, updated_at = now()
			where event_id in (
			    select event_id from event_outbox
			    where status = 'pending'
			    order by created_at
			    limit :batch
			)
			returning event_id
			""", nativeQuery = true)
	List<UUID> claimBatch(@Param("batch") int batch);

	/**
	 * Recovers rows stuck in 'publishing' (relay crashed between claim and
	 * publish): older than {@code staleBefore} they are released back to
	 * 'pending' for re-delivery, or to 'failed' when the attempt budget is
	 * exhausted. At-least-once semantics are preserved by the consumption
	 * ledger.
	 */
	@Modifying
	@Query(value = """
			update event_outbox
			set status = case when attempts >= :maxAttempts then 'failed' else 'pending' end,
			    updated_at = now()
			where status = 'publishing'
			  and updated_at < :staleBefore
			""", nativeQuery = true)
	int releaseStaleClaims(@Param("staleBefore") Instant staleBefore,
			@Param("maxAttempts") int maxAttempts);

	@Modifying
	@Query("update EventOutbox e set e.status = 'published', e.publishedAt = :at where e.eventId in :ids")
	int markPublished(@Param("ids") List<UUID> ids, @Param("at") Instant at);

	@Modifying
	@Query("""
			update EventOutbox e
			set e.status = case when e.attempts >= :maxAttempts then 'failed' else 'pending' end
			where e.eventId in :ids
			""")
	int releaseFailed(@Param("ids") List<UUID> ids, @Param("maxAttempts") int maxAttempts);
}