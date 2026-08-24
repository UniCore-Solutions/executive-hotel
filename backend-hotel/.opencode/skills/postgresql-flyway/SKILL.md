---
name: postgresql-flyway
description: PostgreSQL schema design and Flyway migration conventions for backend-hotel — types, constraints, indexes, transactions, locking, query optimization, and migration versioning. Use when designing, reviewing, or migrating the PostgreSQL schema.
---

# PostgreSQL + Flyway Conventions

Target: **PostgreSQL**. The existing schema at `../database/collection-schema.sql` is Oracle-oriented — adapt deliberately, never blind-convert (`VARCHAR2`→`VARCHAR`, `NUMBER`→`NUMERIC/INTEGER`, `CLOB`→`TEXT`, `SYSTIMESTAMP`→`CURRENT_TIMESTAMP`, Oracle identity→`BIGINT GENERATED ALWAYS AS IDENTITY`, JSON column→PostgreSQL `jsonb`).

## Types

- IDs: `BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY` (avoid sequences exposed to apps)
- Money: `NUMERIC(10,2)` or finer for per-night rates; **never** `float`/`double` for money
- Text: `TEXT` for long content; `VARCHAR(n)` only when a real limit exists
- Dates: `DATE` for stay dates, `TIMESTAMPTZ` for instants; store UTC
- Config/feature flags: `jsonb` only where shape is genuinely flexible; relational data stays relational (FK meaning)
- Enums: `VARCHAR(20)` + `CHECK` (survives schema evolution better than PG `ENUM`) unless the PG enum is a deliberate choice

## Constraints

- Every FK exists with explicit `ON DELETE` semantics (usually `RESTRICT`; `CASCADE` only when the child is meaningless without the parent)
- `UNIQUE` on natural keys (e.g. `(hotel_id, code)`), `CHECK` for ranges/invariants (e.g. rate > 0, dates ordered)
- Nullability explicit everywhere

## Indexes

- Index every FK used in lookups: `idx_<table>_<column>`
- Composite indexes ordered by selectivity/query pattern; partial indexes for sparse predicates; avoid redundant prefixes
- Unique indexes back uniqueness constraints; no duplicate indexes on the same column sets
- Never index every column "just in case"

## Transactions / locking

- Prefer optimistic locking (`@Version`) for entity edits; pessimistic (`SELECT … FOR UPDATE`, `SKIP LOCKED`) only where contention is real (e.g. room release jobs)
- Keep transactions short; no external calls (email, Cloudinary, Kafka) inside DB transactions unless the outbox pattern applies

## Flyway

- Migrations: `src/main/resources/db/migration/V<version>__<description>.sql`, strictly increasing, immutable once merged
- New changes are new versions — never edit applied migrations
- Schema DDL and reference data separated from test fixtures; seed data versioned with `R` repeatables only when truly idempotent
- `spring.flyway.*` configured; migrations verified by tests against Testcontainers PostgreSQL

## Query optimization

- Reason about `EXPLAIN (ANALYZE, BUFFERS)` for hot queries; pagination with keyset (cursor) for large result sets where page offsets get deep