# ARCHIVED DOCUMENT — HISTORICAL CONTEXT ONLY

> This document is retained for historical context only. It describes a previous
> phase, proposal, or report of this project and must **not** be treated as
> current documentation or architecture.
> For the current state, see the [documentation index](../../README.md) —
> starting with `docs/architecture/architecture.md`.

---
# Events / Kafka Architecture

> STATUS: DRAFT — proposed, pending human approval. Nothing is implemented.

## 1. Principles

1. **Kafka is infrastructure, not application logic.** Normal synchronous flows (quotes, booking creation, lookups) stay synchronous. Kafka carries *facts* for other consumers (notifications, downstream systems, future analytics).
2. **Reliability via the transactional outbox** — business transaction + outbox row commit atomically; a relay publishes to Kafka. No dual-write hazard.
3. At-least-once delivery ⇒ consumers are **idempotent**.
4. Failure isolation: retries with backoff, then dead-letter topics.

## 2. What Kafka is (and is not) for

| Use | Decision |
|---|---|
| Booking confirmed → confirmation email (Resend) | ✅ event `booking.confirmed` → notification consumer |
| Cancellation → cancellation email + inventory release | ✅ events (inventory release can also be synchronous; decision: release inside the booking transaction — synchronous, authoritative; the event is for notification) |
| Payment captured → invoice/email | ✅ event |
| Check-in completed → welcome email / housekeeping | ✅ event |
| Search, quotes, CRUD, availability reads | ❌ synchronous REST only |
| Rate/pricing changes propagation | ❌ synchronous in-admin; events only if a downstream consumer needs it (deferred) |

## 3. Event naming and structure

- Event type: `<domain>.<past-tense-action>` — `booking.confirmed`, `booking.cancelled`, `payment.captured`, `stay.checked_in`, `review.approved`.
- Envelope (every event):

```json
{
  "eventId": "uuid", "eventType": "booking.confirmed", "eventVersion": 1,
  "occurredAt": "2026-08-18T12:00:00Z", "hotelId": 7,
  "aggregateId": "reservation:RC-ABC123",
  "traceId": "a1b2c3d4-…",
  "payload": { … }
}
```

- `eventId` unique per occurrence (idempotency); `hotelId`/aggregate key = partition key when per-hotel ordering matters.

## 4. Topic naming

- `hotelcollection.<domain>.<event-name>.v<version>` — e.g. `hotelcollection.booking.confirmed.v1`, `hotelcollection.payment.captured.v1`.
- Dead-letter: `hotelcollection.<topic>.dlq` (one per source topic).
- Consumer group per logical consumer: `notification-service`, `audit-indexer`, …

## 5. Producers — transactional outbox

```
REST/application service
  → @Transactional { business writes + INSERT outbox(eventId, type, version, payload, traceId, status='pending') }
  → commit
  → outbox relay (scheduled poll, e.g. 1s) 
      → publish to Kafka (producer idempotence + acks=all)
      → mark outbox row 'published' (or delete)
  → publish failures: retry with backoff; rows stay 'pending' — replay-safe
```

- Outbox table: `event_outbox(event_id UUID PK, event_type, event_version, hotel_id, aggregate_id, payload JSONB, trace_id, status, attempts, created_at, published_at)`.
- Relay is the only producer path for business events.

## 6. Consumers

- Each consumer group processes per partition in order; processing is idempotent:
  - Dedupe by `eventId` (consumed-events ledger table `event_consumption(group, event_id PK)` or unique constraint with `ON CONFLICT DO NOTHING`).
- Retry: transient failures → retry with backoff (bounded attempts, e.g. 5 with exponential backoff; optionally a retry topic `hotelcollection.<topic>.retry`).
- After max attempts → DLQ (`hotelcollection.<topic>.dlq`) with reason; a DLQ consumer logs/alerts; replay path defined (re-publish to main topic after fixing).
- Poison messages (deserialization errors) → DLQ immediately, never retried forever.
- Consumer failures: commit offsets after successful processing; batch processing with per-record handling so one bad record doesn't stall the partition.

## 7. Event versioning

- Additive field changes only within a version; breaking changes → `eventVersion + 1` (new topic `v2` or compat header) with documented migration and dual-write during rollout.
- Consumers tolerate unknown fields; `eventVersion` in the envelope lets consumers branch.

## 8. What the notification consumer does

`booking.confirmed` → creates a `notifications` row (email) → `EmailProvider.send` (Resend) → status `sent`/`failed`; failures retried by the notification worker (not Kafka retries alone).

## 9. Testing

See testing.md §4: outbox relay tests, consumer idempotency tests, DLQ tests — all against Testcontainers Kafka.

