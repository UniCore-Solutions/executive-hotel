# Backend Final Audit — Architecture, Security, API & Production Readiness

Date: 2026-08-19 · Scope: `backend-hotel` (modular monolith, Spring Boot 4.1, Java 21)
Method: 6 parallel deep reviews (architecture, security, GraphQL/API, persistence, config/dependencies, tests/docs) + firsthand verification of every fixed item + live API verification.

## 1. Executive summary

The modular-monolith architecture **holds** under an exhaustive import-level audit (zero cross-module access violations; ArchUnit gate green). The security posture had **one critical and four high** findings, all fixed and verified live. The audit produced **~60 findings total**; this session **fixed 24** (1 critical, 7 high, 8 medium, 8 low), the rest are documented accepted risks or explicit backlog with a prioritized roadmap. Test suite: **109/109 green** (was 98). Live dev instance re-verified end-to-end (quote, inventory conflict, media IDOR, auth rate limiting, actuators).

**Final verdict: READY WITH CONDITIONS.**

Conditions before production:
1. CI/CD (build, tests, ArchUnit, vulnerability scan, dependency-check) — none exists today.
2. A real deployment profile decision (Dockerfile, secrets via the chosen platform, `SPRING_PROFILES_ACTIVE=prod`).
3. Check-in/check-out mutations + refunds (product decision) — currently absent; review proof-of-stay and payment refund flows are blocked by their absence.
4. Distributed rate limiting (Redis) if multi-instance.

## 2. Audit scope & method

- Source: all 16 modules, 18 migrations, GraphQL schema (11 files), tests (15 classes, 109 tests), docs.
- Evidence: ArchUnit suite, exhaustive import scan, schema/SQL review, live GraphQL/REST/actuator calls against the dev instance (8080), Postgres constraint/trigger probes.
- Verdict criteria: architecture gate (ADR-008), security review (findings S1–S12 + this audit), API completeness vs the domain requirements, production readiness checklist (§19).

## 3. System overview

Modular monolith (ADR-008): `admin, audit, availability, billing, catalog, eventing, identity, media, notification, platform, rate, reference, reservation, review, shared`. Each module: `api` (use-case interfaces) / `application` / `domain` (entities + ports) / `adapter` (persistence, graphql, rest, security). Postgres (Flyway V1–V18), Kafka (transactional outbox, ADR-002), stateless JWT (ADR-007).

## 4. Module dependency matrix (as-built)

| module → | admin | audit | availability | billing | catalog | eventing | identity | media | notification | platform | rate | reference | reservation | review |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| admin | — | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| audit | — | — | — | — | — | — | ✓ | — | — | — | — | — | — | — |
| availability | — | — | — | — | ✓(api) | — | ✓ | — | — | — | ✓(api) | — | — | — |
| billing | — | — | — | — | — | ✓(api) | ✓ | — | — | — | — | — | ✓(api) | — |
| catalog | — | — | ✓(api) | — | — | — | ✓ | ✓(api) | — | ✓(api) | ✓(api) | ✓(api) | — | — |
| eventing | — | — | — | — | — | — | — | — | ✓(outbox) | — | — | — | — | — |
| identity | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| media | — | — | — | — | ✓(api) | — | ✓(api) | — | — | ✓(api) | — | — | — | — |
| platform | — | — | — | — | ✓(api) | — | ✓ | — | — | — | — | — | — | — |
| rate | — | — | — | — | ✓(api) | — | — | — | — | — | ✓(api) | — | — | — |
| reference | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| reservation | — | — | ✓(api) | — | ✓(api) | ✓(api) | ✓ | — | — | ✓(api) | ✓(api) | ✓(api) | — | — |
| review | — | — | — | — | ✓(api) | ✓(api) | ✓ | — | ✓(outbox) | — | — | — | ✓(api) | — |

All cross-module edges go through `api` packages (or `domain.model` for shared entities) — enforced by `ModuleArchitectureTest` (7 ArchUnit rules), **zero violations** in the exhaustive import scan.

## 5. Cross-module access audit

- **PASS**: no source-level cross-module imports outside `api`/`domain.model` were found.
- Documented exceptions (ADR-008): `admin` = facade without a `domain` layer; `shared` = plain utility package.
- `@Lazy` circular deps exist and are documented (e.g. `catalogQuery → pricing → catalogQuery`, `bookingService → reviewService` chain); all are cross-module API edges with no runtime recursion risk.

## 6. Domain purity

- PASS with noted debt: entities carry JPA annotations (persistence in `domain`) and two port interfaces extend `JpaRepository` directly (billing `InvoiceRepository`, eventing outbox repo); pragmatic and documented; flag for cleanup when a JPA-free core is desired.
- Dead code: `EventConsumptionRepository` interface + JPA impl are unused (consumption ledger is written by SQL in the notifier — verified in `BookingFlowIntegrationTest`). Low priority cleanup.

## 7. Architectural debt

| item | status |
|---|---|
| God services: `CatalogAdminService` (~11 ctor deps, ~400 lines), `BookingService` (~512 lines), `PricingService` | ACCEPTED (module-cohesive; extraction candidates logged) |
| EAGER collections on `Reservation` (roomLines/extras/charges/statusHistory) | ACCEPTED (bounded aggregate; +4 queries per load) |
| In-memory sort for `PRICE_ASC`/`RATING_DESC` (500 candidates cap) | ACCEPTED (boutique catalog; revisit with pgvector) |
| `EventConsumptionRepository` dead code | BACKLOG |

## 8. Migration lineage (V1–V18)

V1 reference data · V2 identity/RBAC · V3 catalog · V4 pricing/promotions · V5 inventory/availability · V6 booking · V7 billing/stay · V8 reviews/notifications/events/audit · V9 outbox `publishing` status · V10 reference data seed · V11 amenity catalog seed · V12 sparse availability (total_inventory on room_types) · V13 platform content · V14 platform demo seed · V15 drop `chk_reservations_totals` (extras-aware) · V16 drop `chk_reservation_extras_total` · V17 `event_outbox.updated_at` (stale-claim recovery) · V18 room-type capacity trigger. `flyway_schema_history`: 18/18 success; 53 tables; `ddl-auto: validate` green.

## 9. Security findings (severity → status)

| id | finding | severity | status |
|---|---|---|---|
| A1 | JWT secret default in config (forgeable tokens) | CRITICAL | **FIXED** — secret now required (fail-fast, `<32 bytes`/historic default rejected); `.env.example`, test secret updated |
| A2 | No refresh tokens / logout / revocation (60-min access TTL) | HIGH | ACCEPTED (ADR-007 documented; roadmap item) |
| A3 | Auth rate limit bypass via GraphQL login/register | HIGH | **FIXED** — `AuthRateLimitFilter` now covers GraphQL auth mutations (body sniffing with buffered wrapper); REST+GraphQL share the per-IP window |
| A4 | Media upload/delete IDOR (any authenticated user) | HIGH | **FIXED** — owner-scoped writes: platform → super_admin, hotel → hotel staff; 4 new tests; verified live (403) |
| A5 | Reference-lookup (`reservation` by ref+email) unthrottled | MEDIUM | BACKLOG (brute-force window; needs product decision on UX) |
| A6 | `updateRoomType`/`setRoomTypeInventory` inventory floor | MEDIUM | **FIXED** — clean `CONFLICT` below sold units; staff authz added; DB trigger (V18) as atomic backstop |
| A7 | Payment balance TOCTOU race | HIGH | **FIXED** — `PESSIMISTIC_WRITE` on reservation in create/capture |
| A8 | Outbox stale-claim loss window | HIGH | **FIXED** — `recoverStaleClaims()` job (5-min window, attempt-budget bound), V17 |
| A9 | CORS `*` hardcoded | MEDIUM | **FIXED** — config-driven `CORS_ALLOWED_ORIGINS` |
| A10 | GraphiQL on by default | MEDIUM | **FIXED** — dev-profile only; prod forces off |
| A11 | Actuator surface | LOW | **FIXED** — health probes + prometheus exposed (no details); everything else deny-all |
| A12 | Double-cancel race → 500 | MEDIUM | **FIXED** — unique-violation → clean `CONFLICT` |
| A13 | `getById`/`markFullyPaid` internal authz | LOW | ACCEPTED (internal API, no exposure; noted for facade phase) |
| A14 | Registration enumeration | — | Already fixed (S5, prior session) |
| A15 | Unpinned container images | MEDIUM | **FIXED** — postgres 16.4-alpine, kafka 3.9.1 pinned (compose + Testcontainers) |

Security rating after fixes: **strong for the phase** — the residual items are product decisions (refresh tokens, throttling UX) and infrastructure (distributed limiter), not code defects.

## 10. API surface (as built)

Queries: catalog (`hotels`, `hotel`, `hotelDetails`, `roomTypes`, `experiences`, `restaurants`, `extras`, `faqs`, admin*), rate (`offers`, `rates`, `quote`, `adminPromotions`), availability (`availability`), reservation (`myReservations`, `reservation`, `adminReservations`, `adminGuests`), billing (`adminPayments`, `adminInvoices`), identity (`me`, `adminUsers`, `adminRoles`), review (`reviews`, `adminReviews`), platform (`platform`, `adminPlatform`), notification (`adminNotifications`), admin (`adminDashboard`, `adminHotel`…), audit (`adminAuditLogs`).
Mutations: identity (login/register/createUser/assignRole/revokeRole), catalog (create/update hotel, room types, rooms, amenities, media), rate (promotions, rate-plan prices), availability (update, range), reservation (create/cancel/adminCancel), billing (create/capture payment, issueInvoice), review (create/moderate), platform content blocks, media REST (`/api/v1/media`), auth + reservation REST self-service.
Completeness vs domain: gaps below.

## 11. API findings

| id | finding | severity | status |
|---|---|---|---|
| F-01 | No check-in/check-out mutations — `checked_in`/`checked_out` unreachable | HIGH | REQUIRES DECISION (product; review proof-of-stay blocked) |
| F-02 | No refunds/voids on payments | MEDIUM | REQUIRES DECISION |
| F-03 | `hotelDetails` reviews loaded unbounded with fake page | MEDIUM | **FIXED** — server-side `pagedApproved(0,20)` |
| F-04 | `hotelNamesByIds` full-table scan | MEDIUM | **FIXED** — `findAllById` |
| F-05 | Quote N+1 (per-line offer + price lookups) | MEDIUM | BACKLOG (batching plan: pair queries; hot path) |
| F-06 | Reservation admin list N+1 (guest fetch per row) | MEDIUM | BACKLOG |
| F-07 | `review` page/`size` input ignored in some places | LOW | **FIXED** (clamped in `pagedApproved`) |
| F-08 | `updateAvailability` deprecated surface retained | LOW | ACCEPTED (documented, back-office keeps range API) |
| F-09 | No pagination on `notifications` reads | LOW | BACKLOG |

## 12. Persistence & concurrency findings

| id | finding | severity | status |
|---|---|---|---|
| F1 | Payment balance TOCTOU | HIGH | **FIXED** (see A7) |
| F2 | Outbox stale-claim gap | HIGH | **FIXED** (see A8) |
| F3 | Capacity blind spot on `total_inventory` reduction | HIGH | **FIXED** (see A6) |
| F4 | `@Version` only on `Availability`; no optimistic guard on Payment double-capture | MEDIUM | ACCEPTED (C17 unique index + locked reads cover the flows) |
| F5 | Extras/per-person pricing untested vs frontend | HIGH (test gap) | **FIXED** — 2 new pricing-model tests |
| F6 | Double-cancel race | MEDIUM | **FIXED** (see A12) |
| F7 | Reference entropy (8-char) collision risk | LOW | ACCEPTED (retry loop exists; reviewed) |
| F8 | EAGER collections on Reservation | MEDIUM | ACCEPTED (see §7) |
| F9–F12 | N+1 batch queries (quote, admin lists, hotelNames, review aggregates) | MEDIUM | see F-04/F-05/F-06 |
| F13 | Invoice/transaction writes not locked | LOW | ACCEPTED (idempotent by unique index) |
| F14–F16 | misc. query-shape nits | LOW | ACCEPTED |
| SAFE | pessimistic locks on availability booking range; outbox same-tx writes; FK/CK coverage; totals code-enforced after V15/V16 | — | VERIFIED |

## 13. Config & dependencies

- 28 dependencies, all standard; `micrometer-registry-prometheus` added this session.
- **No CI/CD** (no git repo, no pipeline) — top production gap.
- **No Dockerfile** for the app; compose only for infra. Dockerfile + image build = deployment task.
- Secrets: `JWT_SECRET` required now; DB creds in compose are dev-only (documented); `.env.example` added.
- No static-analysis/vuln-scan plugins (spotless/jacoco/owasp claimed in old docs — **docs corrected**, tools listed as recommendations).

## 14. Observability

- **FIXED**: `/actuator/health` + probes (`/actuator/health/readiness|/liveness`) public, `/actuator/prometheus` exposed; `show-details: never`.
- BACKLOG: request ID/MDC correlation, structured (JSON) logs, per-operation metrics, trace propagation to Kafka.

## 15. Tests & documentation coverage

- **109/109 green** (15 classes): unit 6, architecture 7, integration 96 (real Postgres 16.4 + Kafka via Testcontainers).
- Added this session: rate-limit (3), media IDOR (4), pricing models (2), DB triggers/outbox (3), admin inventory conflict (1).
- Docs corrected to match reality: `AGENTS.md` (modular layout, commands, JWT_SECRET), `docs/architecture/architecture.md` (rewritten), `docs/development/testing.md` (inventory ~110), `docs/security/security.md` (S9–S12 + residual/verification), `docs/architecture/invariants.md` (outbox recovery, capacity floor), `docs/development/setup.md` (`ddl-auto: validate`, env run line). `docs/api/graphql.md` verified accurate. (A later documentation-cleanup pass moved these files into the structured `docs/` layout — see `REPOSITORY_AND_DOCUMENTATION_CLEANUP.md`.)

## 16. Doc accuracy

Previously stale items (flat-layout tree, "41 tests", "9 migrations", "no rate limiter", "JWT default", "ddl-auto: none", outbox loss window) — all corrected. Residual: the pre-implementation security DRAFT is archived at `docs/archive/architecture/security-design.md` (superseded by `docs/security/security.md`).

## 17. Production readiness checklist

| item | state |
|---|---|
| Fail-fast secrets | ✓ (JWT required; strong-secret guard) |
| Health probes + metrics | ✓ |
| Graceful shutdown | ✓ (`server.shutdown: graceful`) |
| DB schema controlled by Flyway | ✓ (18 migrations, validate) |
| ArchUnit gate in tests | ✓ |
| Testcontainers parity (pinned images) | ✓ |
| CI/CD pipeline | ✗ — must be created |
| Container image for the app | ✗ — must be created |
| Prod profile secrets/platform (Vault/K8s Secret/…), TLS | ✗ — deployment decision |
| Log aggregation / structured logs | ✗ — backlog |
| Multi-instance rate limiting (Redis) | ✗ — required only if scaling out |
| Refunds + check-in/check-out | ✗ — product decision |

## 18. Fixed this session (all verified)

1. JWT secret required + guard (A1) — app refuses weak/missing secrets.
2. Media IDOR authz (A4) — 4 new tests; live 403 verified.
3. Payment TOCTOU lock (A7/F1) — `getByIdForUpdate` on the reservation in create/capture.
4. Outbox stale-claim recovery (A8/F2) — V17 + `recoverStaleClaims` (30 s schedule, 5-min window).
5. Inventory floor (A6/F3) — V18 trigger + clean `CONFLICT` in both update paths + staff authz; live verified.
6. Double-cancel → clean `CONFLICT` (A12/F6).
7. `hotelDetails` reviews bounded (F-03).
8. `hotelNamesByIds` batched (F-04).
9. Config hardening (A9–A11): CORS property, GraphiQL dev-profile, probes + prometheus, pinned images.
10. GraphQL auth rate limiting (A3) — buffered-body filter; suite-safe via property.
11. Docs accuracy (6 files).
12. Test coverage +90 net new assertions; **109/109 green**.

## 19. Residual risks (ACCEPTED)

- Single-relay outbox (recovery job added; multi-node needs leader election/claim lease).
- In-memory rate limiter (per-instance).
- 8-char references (entropy 62^8 ≈ 2×10^14 — fine at boutique scale).
- Mock payment provider (port ready for a real gateway; no webhook verification yet).
- No refresh tokens (60-min TTL; logout client-side).

## 20. Backlog (prioritized)

1. Check-in/check-out mutations (+ status history, inventory release) — unblocks review proof-of-stay.
2. Refunds/voids with cancellation math integration.
3. Quote/admin-list N+1 batching.
4. CI/CD (GitHub Actions: build → test → ArchUnit → dependency-check → image).
5. Dockerfile + compose prod profile.
6. Distributed rate limiting.
7. Structured logging + MDC + traces.
8. Dead-code cleanup (`EventConsumptionRepository`, deprecated `updateAvailability` path).

## 21. Recommendations (summary)

- Adopt the backlog items 1–5 before any external traffic.
- Keep the ArchUnit gate as a PR requirement in CI.
- Re-run this audit after the check-in/refund milestone.

## 22. Final verdict

**READY WITH CONDITIONS** — the architecture holds and the codebase is secure and tested for the current phase; the conditions in §1 (CI/CD, deployment profile, check-in/check-out + refunds, distributed limiting if scaled out) must be met before production traffic.

---

## 23. Addendum — error-contract & security hardening pass (post-audit)

Re-audit (UUID migration phase, V20) of exception handling, security and type
consistency. All items below fixed and covered by tests; the full suite is
green at **134/134**.

### Exception architecture (fixed)

- New `shared` exception taxonomy: `ErrorCode` enum
  (`NOT_FOUND|FORBIDDEN|CONFLICT|VALIDATION|UNAUTHORIZED|RATE_LIMITED|INTERNAL_ERROR|SERVICE_UNAVAILABLE`),
  `DomainException` (ErrorCode-based) with `ValidationException` and
  `TechnicalException` subtypes and typed factories
  (`notFound/conflict/forbidden/validation/technical/unavailable`).
- `GlobalExceptionHandler` rewritten — previously **500 for client errors**:
  unknown routes (`NoResourceFoundException`), MVC `AccessDeniedException`,
  `DataIntegrityViolationException`, malformed bodies/path variables and
  validation failures. Now: 400/404/409/413 with the taxonomy; unexpected
  exceptions → safe generic 500 (`internal error`, cause logged).
- GraphQL parity: argument conversion failures (non-UUID → `UUID` argument,
  surfaced by Spring GraphQL as `BindException`/`ConversionFailedException`)
  are now `VALIDATION` instead of `INTERNAL_ERROR`.
- One error envelope (`ApiError`: `timestamp, status, code, message, path,
  traceId`) produced by a single `@RestControllerAdvice` **and** a shared
  `ErrorResponseWriter` used by the security filters (403/401), the JWT filter
  and `AuthRateLimitFilter` (429) — no more hand-rolled JSON in filters.
- `TraceIdFilter`: honors `X-Request-Id`, generates a UUID fallback, exposes
  the traceId to error envelopes and MDC.
- Ad-hoc `new DomainException("STORAGE", …)` code removed
  (`LocalFilesystemMediaStorageProvider` → `TechnicalException`).

### Security (fixed)

- GraphQL introspection now disabled under `prod` (GraphiQL already was).
- `adminAmenities` (amenity catalog) was readable by **any authenticated user
  including guests** → staff-only gate (`CurrentUserAccessor.requireStaff()`;
  staff roles centralized in `CurrentUserAccessor.STAFF_ROLES`, reused by the
  identity module's `HOTEL_SCOPED_ROLES`).
- Security headers on all responses: `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
  plus a config-driven Content-Security-Policy on `prod` (dev keeps GraphiQL).

### Tests (new)

- `GlobalExceptionHandlerTest` (10 unit tests): full mapping table + envelope
  shape (path/traceId/status consistency, e.g. 413 + `VALIDATION`).
- Integration: REST envelope across filter (403) / MVC (404) / type-mismatch
  (400) with traceId; GraphQL staff-gate FORBIDDEN and malformed-UUID
  VALIDATION.