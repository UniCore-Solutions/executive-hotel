# ADR-005: BIGINT identity, not UUID

- Status: proposed (pending approval)
- Date: 2026-08-18

## Context

The baseline schema uses numeric identity everywhere. UUIDs were considered for non-enumerability and distributed safety.

## Decision

Keep **`BIGINT GENERATED ALWAYS AS IDENTITY`** as the primary key strategy for all tables.

- Guest-facing identifiers are opaque business references (`reservations.reference` = `RC-XXXXXX`, idempotency keys) — numeric ids are never exposed to guests or the public API.
- The platform is single-instance relational; no distributed ID generation need.
- Trade-offs accepted: ids are enumerable internally (audited staff surfaces only) and joins/ORM stay simple; switching later to UUID would be a large migration with no current benefit.
- Where a stable public handle is needed, the domain already provides one (reference codes).

## Consequences

- JPA `@GeneratedValue(strategy = IDENTITY)` or `GenerationType.IDENTITY`; sequences not exposed to applications.
- If a future requirement forces UUIDs, only new tables adopt them; existing ids stay.