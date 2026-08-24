package com.hotelcollection.hotel.service.impl;
import com.hotelcollection.hotel.service.OutboxPublisher;
import com.hotelcollection.hotel.entity.EventEnvelope;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.hotelcollection.hotel.entity.EventOutbox;
import com.hotelcollection.hotel.repository.EventOutboxRepository;

/**
 * Polls the transactional outbox (ADR-002). Each phase runs in its own
 * transaction: the batch is claimed (pending → publishing, attempts +1)
 * and committed BEFORE anything is published, so a crash never leaves a
 * claim stuck in an open transaction; publishing happens outside any
 * transaction (Kafka I/O is never held inside a DB transaction); the
 * outcome (published / released back to pending or failed) is committed
 * afterwards. Failed publishes are released back to pending with a
 * bounded attempt count.
 *
 * <p>Known limitation: with a single relay instance the claim is atomic.
 * A crash between claim and publish leaves the batch 'publishing'; the
 * {@link #recoverStaleClaims()} job (default 30s) releases such batches
 * back to pending for re-delivery, bounded by the attempt budget.
 */
@Component
public class OutboxRelay {

	private static final Logger log = LoggerFactory.getLogger(OutboxRelay.class);

	private final EventOutboxRepository outboxRepository;
	private final OutboxPublisher kafkaPublisher;
	private final TransactionTemplate claimTx;
	private final TransactionTemplate outcomeTx;
	private final int batchSize;
	private final int maxAttempts;

	public OutboxRelay(EventOutboxRepository outboxRepository, OutboxPublisher kafkaPublisher,
			PlatformTransactionManager transactionManager,
			@Value("${app.outbox.batch-size:50}") int batchSize,
			@Value("${app.outbox.max-attempts:5}") int maxAttempts) {
		this.outboxRepository = outboxRepository;
		this.kafkaPublisher = kafkaPublisher;
		this.claimTx = new TransactionTemplate(transactionManager);
		this.claimTx.setPropagationBehaviorName("PROPAGATION_REQUIRES_NEW");
		this.outcomeTx = new TransactionTemplate(transactionManager);
		this.outcomeTx.setPropagationBehaviorName("PROPAGATION_REQUIRES_NEW");
		this.batchSize = batchSize;
		this.maxAttempts = maxAttempts;
	}

	@Scheduled(fixedDelayString = "${app.outbox.relay-interval-ms:1000}")
	public void relay() {
		List<UUID> claimed = claimTx.execute(status -> outboxRepository.claimBatch(batchSize));
		if (claimed == null || claimed.isEmpty()) {
			return;
		}
		List<EventOutbox> rows = outboxRepository.findAllById(claimed);
		List<EventEnvelope> envelopes = new ArrayList<>();
		for (EventOutbox row : rows) {
			envelopes.add(new EventEnvelope(row.getEventId(), row.getEventType(),
					row.getEventVersion(), row.getHotelId(), row.getAggregateId(),
					row.getPayload() == null ? Map.of() : row.getPayload(), row.getTraceId()));
		}
		try {
			kafkaPublisher.publish(envelopes);
			outcomeTx.execute(status -> {
				outboxRepository.markPublished(claimed, Instant.now());
				return null;
			});
		} catch (Exception ex) {
			log.warn("outbox relay publish failed for {} events", claimed.size(), ex);
			outcomeTx.execute(status -> {
				outboxRepository.releaseFailed(claimed, maxAttempts);
				return null;
			});
		}
	}

	/**
	 * Recovers batches stuck in 'publishing' (a relay crash between claim
	 * and publish). Runs in its own transaction and never touches rows the
	 * live relay is working on (their updated_at is fresh).
	 */
	@Scheduled(fixedDelayString = "${app.outbox.recovery-interval-ms:30000}")
	public void recoverStaleClaims() {
		Integer released = claimTx.execute(status ->
				outboxRepository.releaseStaleClaims(Instant.now().minus(STALE_CLAIM_WINDOW), maxAttempts));
		if (released != null && released > 0) {
			log.warn("outbox stale-claim recovery released {} stuck 'publishing' rows", released);
		}
	}

	private static final Duration STALE_CLAIM_WINDOW = Duration.ofMinutes(5);
}