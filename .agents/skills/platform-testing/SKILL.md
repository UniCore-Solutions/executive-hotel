---
name: platform-testing
description: The actual test strategy, commands, fixtures and current baseline across all three stacks of the hotel platform. Use before running any test suite, when adding tests, or when deciding whether a failure is pre-existing.
---

# platform-testing

Three suites, three runners, one aggregate script.

## Commands

```bash
./scripts/test.sh                 # backend + both frontends (no e2e)
./scripts/test.sh --backend       # ./mvnw test only
./scripts/test.sh --frontend      # frontend-hotel: typecheck + vitest
./scripts/test.sh --backoffice    # backoffice-hotel: typecheck + vitest
./scripts/test.sh --e2e           # Playwright, both apps — expects a RUNNING stack
make test                         # = ./scripts/test.sh      (T=--backend to narrow)
```

Per project:

```bash
cd backend-hotel   && ./mvnw test        # `mvn` is NOT installed — use the wrapper
cd frontend-hotel  && npm run typecheck && npm test && npm run test:e2e
cd backoffice-hotel && npm run typecheck && npm test && npm run test:e2e
```

## Current baseline — know this before you debug

| Suite | State (2026-08-27) |
|---|---|
| backend `ModuleArchitectureTest` | **RED — 2 of 5 failing** |
| backend, everything else | 13/15 classes green (~120 tests) |
| `frontend-hotel` typecheck | clean |
| `frontend-hotel` vitest | **63/63 green** |
| `backoffice-hotel` | not run this session |
| Playwright (both) | not run this session |

**The two backend failures are pre-existing.** Both come from one line:
`StaySearchGraphQLController.java:48` calls `HotelRepository.findAllActive()` directly,
tripping `REPOSITORIES_ARE_ONLY_ACCESSED_FROM_SERVICES` and
`CONTROLLERS_DELEGATE_TO_SERVICES`. If you see exactly those two, they are not yours.
Any third failure is.

Backend results in `backend-hotel/target/surefire-reports/` are dated 2026-08-26 13:28 —
older than HEAD and older than the uncommitted working tree. Re-run rather than trusting them.

## Backend tests

JUnit 5 + **Testcontainers** (real `postgres:16.4` + Kafka — **Docker is required**) +
**ArchUnit**.

```
src/test/java/com/hotelcollection/hotel/
├── architecture/ModuleArchitectureTest.java     5 layering rules (see backend-spring)
├── config/GraphqlConfigTest.java
├── exception/GlobalExceptionHandlerTest.java    error envelope
├── util/CancellationPolicyTest.java             pure unit
└── integration/
    ├── TestcontainersConfiguration.java         shared containers (@ServiceConnection)
    ├── TestHotelPlatformApplication.java · TestFixtures.java
    ├── BookingFlowIntegrationTest              end-to-end booking
    ├── PricingServiceIntegrationTest           quote math
    ├── DatabaseIntegrityIntegrationTest  (26)  constraints & invariants
    ├── AdminGraphqlIntegrationTest       (23)  admin surface + hotel scoping
    ├── GraphqlApiIntegrationTest         (16)  public surface
    ├── MediaUploadIntegrationTest        (13)
    ├── PlatformGraphqlIntegrationTest    (12) · HomepageGraphqlIntegrationTest (7)
    ├── RestApiIntegrationTest             (5) · AuthRateLimitIntegrationTest    (3)
    └── HotelPlatformApplicationTests            context loads
```

Rules: **PostgreSQL only, never H2.** Flyway runs against the test container, so a bad
migration fails here first. Reuse `TestcontainersConfiguration` and `TestFixtures`.
There are **no `@Disabled`/`@Ignore` tests** — keep it that way.

A new backend feature is expected to come with an integration test in this directory;
unit-only coverage is the exception, not the norm.

## Frontend tests (both apps)

**Vitest** + Testing Library + jsdom, specs co-located as `src/**/*.test.ts(x)`.

`frontend-hotel` has 11 files / 63 tests: `lib/{dates,filters,format,serialization,
validation}`, `services/{availability,pricing,reservations,services}`,
`components/{account/AccountFlow,booking/CheckinFlow}`.
`backoffice-hotel` has one: `lib/format.test.ts`.

Convention: **mock the service seam, not `fetch`.**

```ts
vi.mock('@/services/graphqlClient', () => ({
  gqlRequest: vi.fn().mockRejectedValue(new Error('No backend in test')),
}));
vi.mock('@/services/reservations', () => ({ reservations: { find: vi.fn()... } }));
```

Tests must be deterministic — fixed fixtures, seeded logic, no live backend. That is why
`services.test.ts` deliberately makes `gqlRequest` reject.

## End-to-end (Playwright)

`frontend-hotel/e2e/` — 12 specs: `home · search · hotel · booking · reservation ·
auth · activity · filters · routes · responsive · index-2 · a11y` (axe via
`@axe-core/playwright`).
`backoffice-hotel/e2e/` — `auth · hotels · operations`.

E2E needs the **whole stack running** (`./scripts/start.sh`) and browsers installed
(`npx playwright install`). It is excluded from the default `test.sh` run.

Back-office e2e sign-in uses `admin@hotelcollection.test` / **`admin123`**.

## Where coverage is thin

- **No pricing-parity or quote regression tests** guarding the recently unified engine.
- **No tests for the outbox relay** (claim/publish/settle, stale-claim recovery).
- Back-office has essentially no unit coverage (one formatting file).
- No CI runs any of this — every gate is manual.
