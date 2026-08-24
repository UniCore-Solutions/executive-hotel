# Backend Documentation

Documentation for `backend-hotel`, the Hotel Collection platform backend.
Start here; every link below is valid.

## Architecture

- [Architecture](architecture/architecture.md) — modular monolith, module map, key decisions (pricing engine, concurrency, idempotency, outbox)
- [Module boundaries & dependency rules](architecture/architecture.md#one-screen-view-current-state-implemented) — hexagonal modules, `api/`-only cross-module imports (ArchUnit gate)
- [Persistence & domain model](architecture/persistence.md) — entities ↔ Flyway schema (V1–V18), aggregates, column-typing notes
- [Domain requirements](architecture/domain-requirements.md) — requirements R1–R37 → implementation + tests (what the domain must do)
- [Invariants](architecture/invariants.md) — non-negotiable backend rules (money, booking, payments, security, events)
- [Architecture decisions](architecture/decisions/) — ADR-0001…ADR-008 (PostgreSQL, Kafka+outbox, JWT, modular monolith, …)

## Development

- [Setup & conventions](development/setup.md) — prerequisites, commands, Java conventions, workflow
- [Testing](development/testing.md) — test pyramid, 109-test inventory, determinism rules

## API

- [GraphQL API](api/graphql.md) — queries/mutations, error codes, auth, examples
- [API guidelines (REST)](api/api-guidelines.md) — REST splits (`/api/v1`), conventions, error envelope, idempotency
- [Frontend contract](api/frontend-contract.md) — frontend ↔ backend operation matrix (mock-swap status, deltas)

## Security

- [Security](security/security.md) — findings S1–S12 with fixes, authorization matrix, residual scope

## Operations

- [Configuration](operations/configuration.md) — environment variables, profiles, config properties

## Audits

- [Final backend audit](audits/BACKEND_FINAL_AUDIT.md) — architecture/security/API/production-readiness verdict (READY WITH CONDITIONS)

## Archive

- [Archive](archive/README.md) — historical documentation (previous phases, proposals, old reports). **Not current** — for context only.

---

Also see: [`AGENTS.md`](../AGENTS.md) (AI-agent operational guide), root
[`README.md`](../README.md) (project overview & quickstart).