---
name: kafka-events
description: Event-driven architecture conventions for backend-hotel — event contracts, producers, consumers, retries, dead-letter handling, idempotency, event versioning, transactional outbox, eventual consistency. Use when designing or reviewing Kafka usage.
---

# Kafka / Event Conventions

Kafka is **infrastructure**, not a replacement for synchronous application logic. Normal request/response flows stay synchronous; events publish facts for other consumers.

## Event contracts

- One event type per topic (or a clearly namespaced schema); envelope:

```json
{ "eventId": "uuid", "eventType": "booking.confirmed", "eventVersion": 1,
  "occurredAt": "2026-08-18T10:00:00Z", "hotelId": 7, "payload": { … } }
```

- `eventId` unique per event occurrence; `hotelId`/aggregate key as partition key when ordering per hotel matters
- Schemas versioned and documented in `docs/`; consumers tolerate unknown future fields (forward compatibility)

## Producers

- Dual-write hazard: never "DB write then Kafka publish" without the outbox pattern when consistency matters (e.g. booking confirmed → email)
- **Transactional outbox**: domain change + outbox row in the same DB transaction; a relay reads outbox and publishes; published rows marked
- Keep payloads complete enough for consumers (facts, not commands referencing state they may not see)

## Consumers

- At-least-once: processing must be idempotent (dedupe by `eventId` or business key)
- Bounded retries with backoff for transient failures; failed events to a dead-letter topic after max retries
- DLQ: one per source topic; DLQ consumer logs/notifies; replay path defined
- Consumer group offsets: commit after processing; tolerate reprocessing
- Poison messages (deserialization errors) routed to DLQ, never retried forever

## Versioning / evolution

- Additive changes first; new `eventVersion` with a documented migration; consumers handle N and N+1 during rollout

## Eventual consistency

- Where consumers produce derived state (availability views, notifications), document the consistency target and the reconciliation path
- No hidden synchronous calls from consumers back into producers