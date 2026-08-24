---
name: testing
description: Testing conventions for backend-hotel — JUnit 5, Mockito, AssertJ, Testcontainers with real PostgreSQL and Kafka, integration test architecture, coverage expectations. Use when writing or reviewing tests in this project.
---

# Testing Conventions

## Hard constraint

**No H2.** Persistence integration tests run against a real `postgres` container via Testcontainers, with Flyway migrations applied. Kafka integration tests use the Kafka Testcontainers container. Shared containers come from `TestcontainersConfiguration` (`@ServiceConnection`).

## Layers

- **Unit tests** (`src/test/java/…/unit/` or co-located): JUnit 5 + Mockito + AssertJ. Mock collaborators; assert behavior, not implementation; no sleeps, no timers
- **Integration tests**: slice or full-context tests with Testcontainers; verify real SQL behavior (constraints, transactions, locking, JSONB, identity), Flyway migration correctness, JPA mapping
- **API tests**: `@SpringBootTest` + `MockMvc` (or `WebTestClient`), asserting status codes, the global error envelope, validation failures, pagination shapes, auth behavior
- **Security tests**: unauthenticated → 401/403; role matrix; hotel-scope isolation (user of hotel A cannot read hotel B data)
- **Kafka tests**: producer/consumer round-trips with the Kafka container; consumer idempotency and retry behavior

## Style

- AssertJ: fluent assertions; `assertThat(…)` with meaningful messages on failure
- Deterministic data: explicit fixtures per test; no reliance on shared mutable state; container reuse (`@Testcontainers(parallel = true)` only where safe)
- Tests must be fast enough to run in CI; keep full-context tests count sane (prefer slices where they cover the same ground)
- Coverage: critical invariants (pricing math, availability, booking snapshot rules, authorization) must be covered — reviewed per feature, not just as a percentage

## Verify gate

- `./mvnw test` after meaningful changes; fix everything red before reporting done
- The `/verify` command runs the full gate; `/domain-review` adds the review gates