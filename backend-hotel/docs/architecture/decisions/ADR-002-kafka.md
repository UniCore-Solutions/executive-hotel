# ADR-002: Kafka as event infrastructure with transactional outbox

- Status: proposed (pending approval)
- Date: 2026-08-18

## Context

The platform must reliably notify guests (confirmation/cancellation emails) and later integrate downstream systems. Kafka was chosen in the stack. The risk is using Kafka as a replacement for synchronous application logic.

## Decision

1. Kafka carries **facts** for consumers (notifications, future integrations). Synchronous flows (quotes, booking, CRUD, search) stay synchronous.
2. **Transactional outbox**: business writes + outbox row in one DB transaction; an outbox relay publishes to Kafka. No dual-write hazard. The outbox is the only producer path for business events.
3. At-least-once semantics; consumers are **idempotent** (dedupe by `eventId`).
4. Bounded retries with backoff; dead-letter topic per source topic; poison messages → DLQ immediately.
5. Event envelope: `eventId`, `eventType`, `eventVersion`, `occurredAt`, `hotelId`, `aggregateId`, `traceId`, `payload`. Topics: `hotelcollection.<domain>.<event>.v<N>`.
6. Inventory release on cancellation stays synchronous (authoritative in the booking transaction); only notifications/emails are event-driven initially.

## Consequences

- `event_outbox` + `event_consumption` tables (in the schema proposal).
- Outbox relay job (scheduled poll) + Kafka infrastructure module.
- Initial events: `booking.confirmed`, `booking.cancelled`, `payment.captured`, `stay.checked_in`.