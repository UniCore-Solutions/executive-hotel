# PROJECT CLEANUP AUDIT — 2026-08-31

**Role:** orchestrator / senior review pass (Opus).
**Scope audited:** `backend-hotel`, `frontend-hotel`, root config/ops. `backoffice-hotel`
inspected only where it shares a contract; **not** audited, **not** to be modified.
**Status:** RESEARCH → AUDIT → REQUIREMENTS → ARCHITECTURE REVIEW → REMEDIATION PLAN →
**AGENT IMPLEMENTATION → REVIEW → TESTING → SECURITY REVIEW → FINAL AUDIT** (both lanes
implemented and verified; P1-2 is the one item still open, blocked on owner sign-off).

---

## 0. Implementation status — verified, not asserted

> Everything marked ✅ below was verified by **executing** the stated command on
> **2026-08-31** after the change, not by reading the diff. Everything else is still open
> and is described in the present tense in the sections that follow.

**Branch:** `refactor/architecture-cleanup` (off `main`). **Nothing is committed** —
the working tree holds the changes for review.

**Backend suite, before → after:** 182 → **202 tests, 0 failures, 0 errors**; ArchUnit
rules 6 → **7, all passing**. Run in `maven:3.9-eclipse-temurin-21` (there is no JDK on
this host — see §7).

| ID | Finding | Status | Verification |
|---|---|---|---|
| **P0-1** | Payment simulator on by default, incl. prod | ✅ **Fixed** | Default flipped to `false`; `config/PaymentSafetyConfig` refuses startup under `prod`; test profile opts in explicitly so `cardPaymentAutoSettles…` still passes. Guard moved from `ApplicationRunner` to `@PostConstruct` so it fails during context refresh — a live run showed the port was briefly bound. Live: a `prod` container with the simulator on exits non-zero. |
| **P0-2** | No rate limit on anonymous booking | ✅ **Fixed** (after two live-caught defects — see §0.1) | `RateLimitFilter` per-IP **per-policy** budgets (reservations 5/min), safe methods exempt, `X-Forwarded-For` trusted only from a configured proxy. `RateLimitIntegrationTest` — 6 tests. Live: rotating XFF trips at request 6; 25/25 status polls return 200. |
| **P1-1** | Authz by convention, guard duplicated | ✅ **Fixed** | Guard hoisted to `CurrentUserAccessor.requireHotelAccess`/`requireSuperAdmin`; **11** copies removed (3 more than audited). ArchUnit rule `ADMIN_GRAPHQL_READS_ARE_AUTHORIZED` added — **proven to bite**: sabotaging `AuditServiceImpl` produced a build failure naming the exact resolver, then the guard was restored. |
| **P1-2** | Entities as API contract / REST field leakage | ⬜ **Open — blocked** | Awaiting owner sign-off on `PaymentView`/`ReservationView` field lists; only item touching the frontend contract. |
| **P1-3** | Inverted test pyramid | 🟡 **Partial** | `PricingExtraLinesTest` — 9 unit tests, 2.5 s, no Spring/Docker, covering all four extras pricing models + hotel/currency rejection. `BookingServiceImpl` unit tests still to do. |
| **P1-4** | Almost no logging | ✅ **Fixed** | `WARN` on rate-limit trip, unauthenticated rejection, access denial (method+path, never credentials); `INFO` on hold creation; `traceId` from MDC now in the log pattern. |
| **P1-5** | Frontend god components | 🟡 **Partial** | `RoomDetails` 1554 → 1487; `useExtrasSelection` + `useQuote` extracted with 7 tests. The stay-loading cluster was judged too entangled to extract safely and was left intact. `AccountFlow` (704 lines) **not** split. |
| **P2-1** | Reservation lookup/cancel enumerable | ✅ **Fixed** | Covered by the `/api/v1/reservations` policy in `RateLimitFilter`. |
| **P2-2** | `create()` ~180-line method | ✅ **Fixed** | ~180 → ~40 lines over 10 named private steps. Pure extraction; idempotency-race `try/catch` kept inline as it returns early. |
| **P2-3** | ~600 lines dead frontend fixture | ✅ **Fixed** | `src/data/index.ts` deleted; `img`/`IMG_FALLBACK` moved to `lib/images.ts`; fixture relocated to `src/test/fixtures/`. |
| **P2-4** | No `Origin` check on BFF proxies | ✅ **Fixed** | `lib/originCheck.ts` on both proxies, 6 tests. Compares against `x-forwarded-host ?? host`, not `new URL(request.url)` — the latter 403s every request behind a reverse proxy. Live: same-origin 200, absent Origin 200, foreign 403. |
| **P2-5** | Kafka producer, zero consumers | ⬜ **Open — owner decision** | Deliberately not actioned by an agent. |
| **P2-6** | Docs contradict the code | ✅ **Fixed** | See §7. |
| **P3-1** | Timing-unsafe secret comparison | ✅ **Fixed** | `MessageDigest.isEqual`. |
| **P3-2** | No GraphQL complexity cap | ✅ **Fixed** | `MaxQueryComplexityInstrumentation(1000)` alongside the depth cap. |
| **P3-3** | 4 eslint warnings | ✅ **Fixed** (1 unfixable) | 3 resolved. `SearchSheet.tsx:77` investigated and deliberately kept: adding `state.promo` would re-run the open/close animation and body-scroll lock on every promo change. The remaining warning is inside codegen output. |
| **P3-4** | Repo hygiene | ✅ **Fixed** | 5 stale root reports `git mv`'d to `docs/archive/` with an explanatory README; 3.6 MB scratch export gitignored. Root now holds only `CLAUDE.md` + `README.md`. |
| **P3-5** | Weak DB password default, CORS gap | ✅ **Fixed** | `POSTGRES_PASSWORD` now required (no `postgres` fallback); `Idempotency-Key` added to CORS `allowedHeaders`. |

### 0.1 What live end-to-end testing caught that the test suites did not

Four defects surfaced only when the system was exercised against a running stack.
Three were introduced by this cleanup; one predates it. **None was caught by the
backend or frontend suites**, which is the argument for keeping a live run on the
acceptance list rather than trusting a green suite.

| # | Defect | Origin | How it presented | Fix |
|---|---|---|---|---|
| 1 | **Payment-status polling rate-limited.** The P0-2 policy matched on path prefix only, so `GET /api/v1/payments/{id}` — polled every 2s for up to 2 minutes while an async settlement resolves — consumed the same budget as writes. Six polls exhausted it and the guest's own capture returned **429**. | Mine (P0-2) | Live capture returned 429 mid-journey | Safe methods (`GET`/`HEAD`/`OPTIONS`) exempt. Regression test polls 40× asserting no 429. Live: 25/25 → 200. |
| 2 | **Rate limiter bypassable with one header.** `clientIp()` read `X-Forwarded-For` unconditionally, so rotating it minted a fresh budget per request. Probe: same IP → `201 201 409 409 429 429 429 429`; rotating XFF → `409 ×8`, i.e. **every request reached business logic**. The P0 inventory-exhaustion fix was defeatable by anyone who could set a header. | Mine (P0-2) | Live probe comparing spoofed vs un-spoofed bursts | Two-part: backend honours XFF only from `app.security.trusted-proxies` (empty by default); BFF stops forwarding client-supplied `x-forwarded-for`/`x-real-ip`. Regression test. Live: rotating XFF now trips at request 6. |
| 3 | **Every GET through the REST BFF proxy 500s.** `request.text()` yields `''` not `undefined` for a GET, and `fetch` rejects *any* body on GET/HEAD (`TypeError: Request with GET/HEAD method cannot have body`). | **Pre-existing on `main`** (confirmed by `git diff main` — the only change to that file on this branch is the origin check) | 25/25 polls through the BFF returned 500 | Proxy sends no body for GET/HEAD. Live: 25/25 → 200. |

| 4 | **Bean validation silently downgraded every booking-form error.** Wiring `@Valid` in routed failures to a handler that discarded all field detail and returned a flat `"invalid request"` — where the hand-rolled checks it replaced said `"guest.firstName is required"`. The guest could no longer be told which field to correct. | Mine (validation rewiring) | Live rejection matrix showed `VALIDATION - invalid request` for every distinct cause | Handler joins the constraint messages (worded to match the old strings, so parity is restored); only declared messages are exposed, never the rejected value. |

**A pattern worth naming:** every one of these was introduced or exposed by a change
that made the suite *greener*. Tests confirm the paths someone thought to check. Defect 4
in particular passed 202 tests because none of them asserted that message.

**Deployment consequence worth knowing** (from defect 2): with no trusted proxy
configured, guest traffic all arrives via the BFF container and therefore shares
**one** budget. That is the safe failure mode — it over-throttles rather than
waving traffic through — but per-client limiting only becomes real once
`TRUSTED_PROXIES` names the ingress and that hop sets a trustworthy header. The
in-process limiter is a coarse safety net, not a replacement for an edge/WAF limit.

**Deliberately still open, with reasons:**
- **`Reservation`'s 6 `EAGER` collections.** A real performance liability. Bundling a
  fetch-strategy change with the P1-2 DTO change is how subtle production regressions
  happen — it needs its own benchmarked change, after P1-2.
- **Large admin services.** `CatalogAdminServiceImpl` is still 536 lines. Splitting it was
  not justified by any defect found.
- **Entities in GraphQL.** The schema is already an effective projection and 15
  `@BatchMapping` resolvers depend on the current shape.

---

## 1. Executive Summary

This codebase is in materially better shape than its own documentation claims. The
layered architecture is real and enforced, the error taxonomy is consistent, the
authorization pattern is applied correctly at every admin entry point I traced, and the
full test suite is green. This is not a rescue job. It is a hardening-and-consolidation
job with **two genuine production blockers** and a set of structural fragilities that
will cause defects as the codebase grows.

**Verified baseline (run today, not quoted from docs):**

| Suite | Command | Result |
|---|---|---|
| Backend | `mvn test` in `maven:3.9-eclipse-temurin-21` | **182/182 pass**, 0 failures, 0 errors |
| Backend architecture | `ModuleArchitectureTest` | **6/6 ArchUnit rules pass** |
| Guest frontend types | `tsc --noEmit` | **clean** |
| Guest frontend lint | `eslint src` | **0 errors**, 4 warnings |
| Guest frontend tests | `vitest run` | **73/73 pass** (15 files) |

> **Correction to `CLAUDE.md`.** It states *"`./mvnw test` is currently red on 2 ArchUnit
> rules (KNOWN_ISSUES §T1)"*. That is **stale** — all 6 rules pass. It also states JDK 21
> is present; **there is no JDK on this host** (`java: command not found`), so the backend
> suite can only be run in a container. Both claims must be corrected, because they
> currently teach every future contributor to ignore two real failure signals.

**Headline findings:**

- **P0-1 — The simulated payment provider is enabled by default and the production
  overlay does not turn it off.** Bookings self-confirm with no money movement.
- **P0-2 — Anonymous booking creation is unauthenticated and unrated-limited**, and each
  call holds physical inventory for 15 minutes. A trivial script can make the hotel
  unbookable.
- **P1-1 — Authorization is correct but held together by convention.** `/graphql` is
  `permitAll`; 13 admin queries carry no declarative guard; the guard is hand-copied into
  8 services; nothing fails the build if the next resolver omits it.
- **P1-2 — JPA entities are the public API contract** in 36 controller methods, which has
  already forced 6 `EAGER` collections onto `Reservation` and leaks internal fields to
  guests.

**Explicitly NOT recommended:** no hexagonal rewrite, no new state-management library, no
framework additions, no restructuring of working booking/payment logic. The layered
architecture is fit for this system's size and is genuinely enforced; migrating it would
be pure cost. Every task below is incremental.

---

## 2. Current Architecture (as built, not as documented)

**Three independently built deployables**, no monorepo tooling; root holds only Compose
and scripts.

```
backend-hotel/    Spring Boot 4.1 / Java 21   :8180   owns PostgreSQL (:5433)
frontend-hotel/   Next.js 16 App Router       :3000   guest site  (in scope)
backoffice-hotel/ Next.js 16 App Router       :3101   staff console (OUT OF SCOPE)
```

**Backend — flat layered, ArchUnit-enforced.** 274 main classes:
`controller/ · service/ (30 interfaces) · service/impl/ (32) · repository/ (38) ·
entity/ (56) · dto/ (13 sub-packages) · security/ · exception/ · config/`.
Enforced rules (`ModuleArchitectureTest`, all passing): no legacy hexagonal packages;
impls reachable only from services; repositories reachable only from services;
controllers delegate to services; no god services; **no GraphQL mutations**.

**API split is real and consistent:** GraphQL = READ (no `Mutation` root at all, banned
by ArchUnit), REST `/api/v1/**` = WRITE/ACTION. This is a genuinely good decision and is
respected throughout.

**Security model:** stateless JWT (HS256, bcrypt cost 12). `/graphql` is `permitAll` by
design; **every** admin read self-authorizes inside its service via
`hasRole("super_admin") || inHotel(hotelId)`. Accountless booking is a first-class path —
`/api/v1/reservations` and `/api/v1/payments/**` are `permitAll` and the services enforce
owner-or-staff-or-guest-email themselves.

**Frontend — App Router, server pages / client bodies.** All 18 `page.tsx`/`layout.tsx`
are Server Components; 49 of 78 components are `'use client'`. Data flows through two
BFF proxies (`/api/graphql` read, `/api/rest/[...path]` write) which inject the JWT from
an httpOnly `guest_session` cookie server-side — the browser never holds the token. Reads
go through Apollo, writes through Axios, with an explicit invalidation registry.

**Eventing:** transactional outbox → `OutboxRelay` → Kafka. **Producer only — zero
`@KafkaListener` in the repository.**

---

## 3. Backend Audit

### What is genuinely good (do not touch)

- **Error taxonomy is exemplary.** One `ErrorCode` enum → HTTP status mapping, 9
  `@ExceptionHandler` methods covering domain/auth/validation/malformed/integrity/upload/
  catch-all, a shared `ApiError` envelope used even by filter-level 401/403/429 responses
  via `ErrorResponseWriter`. Consistent across REST *and* GraphQL.
- **Zero `printStackTrace` / `System.out`** anywhere in 274 classes.
- **GraphQL N+1 is actively managed** — 15 `@BatchMapping` resolvers.
- **GraphQL DoS is bounded** — `MaxQueryDepthInstrumentation(15)` (`config/GraphqlConfig.java:22`).
- **GraphiQL and introspection are disabled**, and the `prod` profile adds CSP.
- **The payment webhook fails closed** — a blank configured secret rejects every call
  (`PaymentRestController.java:96-100`). This is the right default and was worth checking.
- **The `@Lazy self` proxy trick in `PaymentServiceImpl:90-96`** is correct and well
  commented — scheduled settlement genuinely needs the transactional proxy.

### P0-1 · Simulated payment settlement is on by default, including in production

**Evidence:**
- `application.yaml:69` — `auto-settle-enabled: ${PAYMENT_AUTO_SETTLE_ENABLED:true}`
- `PaymentServiceImpl.java:103` — constructor default `:true`
- `docker-compose.yml:97` — `PAYMENT_AUTO_SETTLE_ENABLED: ${PAYMENT_AUTO_SETTLE_ENABLED:-true}`
- `docker-compose.prod.yml` — hardens CORS, profile, ports, logging. **Does not set
  `PAYMENT_AUTO_SETTLE_ENABLED`.**

**Impact:** deploying the documented production overlay yields a system where
`createPayment(provider="card")` schedules a 1.5–4s callback that marks the payment
captured and confirms the reservation. Rooms are sold, invoices issue, no money moves.
This is a data-integrity and revenue problem, not merely a "mock".

**Recommended solution:** make the simulator **opt-in, and impossible under `prod`**.
Default the property to `false`; have the `prod` profile reject `true` at startup with a
fail-fast `IllegalStateException` (mirroring the existing `JWT_SECRET` fail-fast); set it
`true` explicitly in `docker-compose.yml` (dev) and `.env.example`. Do not change payment
*logic*.

**Validation:** unit test asserting the `prod` profile fails to start with auto-settle on;
existing `PaymentSimulationIntegrationTest` (12 tests) must stay green with the flag
explicitly enabled in the test profile.

### P0-2 · Unauthenticated booking creation has no rate limit → inventory exhaustion

**Evidence:**
- `security/AuthRateLimitFilter.java:77-79` — the filter applies **only** to
  `/api/v1/auth/login` and `/api/v1/auth/register`.
- `security/SecurityConfig.java:88-90` — `/api/v1/reservations` is `permitAll`.
- `BookingServiceImpl.create()` assigns `pending` + `holdExpiresAt`
  (`app.reservations.hold-minutes`, default **15**), consuming a physical room unit.

**Impact:** an anonymous attacker loops `POST /api/v1/reservations` with fresh
`Idempotency-Key` values and holds every room in the hotel for 15 minutes, renewing
indefinitely. No account, no payment, no CAPTCHA. For a single-property direct-booking
site this is a total denial of the core revenue path. The `Idempotency-Key` requirement
does not help — the attacker supplies a new one each time.

**Recommended solution:** generalise the existing rate-limit filter from a hardcoded
two-path check to a configurable path→policy map, and cover the anonymous write and
lookup surface: `POST /api/v1/reservations` (per-IP, strict), `POST /api/v1/payments`,
`/api/v1/reservations/*/cancel`, and the `reservation` GraphQL lookup. Reuse the existing
filter and `ErrorCode.RATE_LIMITED` envelope — no new dependency.

**Validation:** extend `AuthRateLimitIntegrationTest` with a booking-burst case asserting
429 with the standard `ApiError` body; assert a legitimate single booking still succeeds.

### P1-1 · Authorization is correct today, but by convention rather than construction

**Evidence:**
- `SecurityConfig.java:85` — `/graphql` `permitAll`.
- `AdminGraphQLController.java` — **13 `@QueryMapping` admin queries, zero
  `@PreAuthorize`**, zero guard code. Its own Javadoc says authorization "lives in the
  services themselves".
- The guard is hand-written in **8 separate impls**: `AdminDashboardServiceImpl:135`,
  `RateQueryServiceImpl:158-160`, `BillingAdminServiceImpl:72-74`,
  `ReservationAdminServiceImpl:52-53`, `NotificationQueryServiceImpl:34-35`,
  `ReviewServiceImpl:180-181`, plus `IdentityAdminServiceImpl`, `CatalogAdminServiceImpl`,
  `AvailabilityAdminServiceImpl`, `RateAdminServiceImpl`, `BookingServiceImpl`.

**I traced all 13 admin queries to their services and every one is correctly guarded.**
`adminAmenities` → `requireStaff()`; `adminUsers`/`adminRoles`/`adminAuditLogs` →
`requireSuperAdmin()`; the rest → hotel-scoped `requireStaffAccess`. There is **no live
authorization hole here.**

**Impact:** the risk is entirely forward-looking and it is high. The only thing standing
between the current state and an unauthenticated admin data leak is that every future
contributor remembers to hand-copy a guard into a *service* while writing a *controller*.
The build will not tell them. `AdminGraphqlIntegrationTest` (24 tests) covers today's
resolvers, not tomorrow's.

**Recommended solution — two low-risk moves, no behaviour change:**
1. Promote the duplicated guard to `CurrentUserAccessor.requireHotelAccess(UUID hotelId)`
   alongside the existing `requireStaff()`, and have all 8 sites delegate. Pure
   de-duplication; identical semantics.
2. Add an **ArchUnit rule** to `ModuleArchitectureTest`: every service method reachable
   from `AdminGraphQLController` must call a `CurrentUserAccessor` guard. This turns a
   convention into a build failure — the highest-leverage change in this document.

**Validation:** all 24 `AdminGraphqlIntegrationTest` tests unchanged and green; new
ArchUnit rule demonstrably fails against a deliberately unguarded scratch resolver.

### P1-2 · JPA entities are the public API contract

**Evidence:** 36 controller methods return entities directly, e.g.
`CatalogGraphQLController.java:68,73,88,104` (`Hotel`, `RoomType`),
`ReservationGraphQLController.java:53,58` (`Reservation`),
`PaymentRestController.java:50,55,74,88` (`Payment`),
`ReservationRestController.java:36,51` (`Reservation`),
`AdminGraphQLController.java:75` (`Amenity`).

**Three concrete consequences, all already visible in the code:**

1. **Internal field leakage over REST.** GraphQL limits fields by schema; **Jackson does
   not**. `GET /api/v1/payments/{id}?guestEmail=…` serialises `Payment.idempotencyKey`
   and `providerReference` (`entity/Payment.java:62,68`) to an anonymous guest.
   `POST /api/v1/reservations` returns `Reservation` including `idempotencyKey`,
   `bookedByUserId`, `notes` and the full `statusHistory` (`entity/Reservation.java:52,67,115,145`).
   *(Checked and clear: `User.passwordHash` is never reachable — no controller returns
   `User`; admin identity goes through `AdminUserView`. That one is fine.)*
2. **Forced eager loading.** `Reservation` carries **6 `EAGER` associations**
   (`entity/Reservation.java:60,132,136,140,144`) — a guaranteed multi-collection join on
   every single reservation read, including list endpoints. This is a performance
   liability chosen to make serialisation work.
3. **`@JsonIgnore` as a band-aid.** The only 2 uses in the entire entity package
   (`Hotel.java:105`, `RoomType.java:79`) exist purely because lazy collections blew up
   REST serialisation — their own comments say so.

**Recommended solution — targeted, not a sweep.** Introduce response DTOs **only** for
the guest-facing REST surface where leakage is real and the payload is small:
`Payment` → `PaymentView`, `Reservation` → `ReservationView`. Leave GraphQL returning
entities (the schema is already an effective projection and 15 `@BatchMapping` resolvers
depend on the current shape). Once `Reservation` is no longer REST-serialised, revisit
its `EAGER` collections in a **separate, individually benchmarked** change — do not bundle
a fetch-strategy change with a DTO change.

**Validation:** `RestApiIntegrationTest` + `PaymentSimulationIntegrationTest` assert the
new payloads and explicitly assert `idempotencyKey` is **absent**; frontend contract
confirmed unbroken (see §11 — this is the one cross-agent dependency).

### P1-3 · The test pyramid is inverted

**Evidence:** 22 test classes; **19 are Testcontainers integration tests**. Only 3 are
unit tests (`CancellationPolicyTest`, `GlobalExceptionHandlerTest`, `GraphqlConfigTest`).
Wall-clock: `AdminGraphqlIntegrationTest` 27s, `MediaUploadIntegrationTest` 34s.

**Impact:** the suite needs a live Docker daemon and takes minutes, so it is run rarely.
The most intricate business logic in the system — `PricingServiceImpl` (333 lines: nightly
rates, extras by pricing model, promos, tax/fee lines) and `BookingServiceImpl` (607
lines) — has **no fast unit coverage**. Pricing bugs are the expensive kind.

**Recommended solution:** add plain JUnit unit tests for `PricingServiceImpl` (per-stay
vs per-night vs per-guest extras, promo application order, tax/fee line computation,
rounding) and for `BookingServiceImpl`'s extracted helpers (§P2-2). Do not delete or
rewrite the integration tests — they earn their keep as contract tests.

### P1-4 · Near-total absence of application logging

**Evidence:** only **7 of 274** classes obtain a logger — `OutboxRelay`,
`KafkaOutboxPublisher`, `ReservationHoldExpiryJob`, `PaymentServiceImpl`,
`LocalFilesystemMediaStorageProvider`, and the two exception handlers.

**Impact:** there is a `TraceIdFilter` producing trace IDs and essentially nothing logging
them. No record of authentication failures, authorization denials, rate-limit trips,
booking creation, or hold expiry. In production this system is not debuggable and not
auditable, and a credential-stuffing run against `/api/v1/auth/login` would leave no
trace. (`AuditService` covers admin *domain* mutations — a different concern, and it is
fine.)

**Recommended solution:** add structured `WARN` logging at the security boundary
(auth failure, authz denial, rate-limit trip — with trace ID, never with credentials) and
`INFO` at the booking/payment state transitions. No framework change; SLF4J is present.

---

## 4. Frontend Audit (`frontend-hotel` only)

### What is genuinely good

- **The BFF token pattern is right.** The JWT lives in an httpOnly, `SameSite=Lax`,
  `secure`-in-prod cookie (`lib/session.ts`) and is injected server-side by both proxies.
  The browser never holds it. This is better than most codebases at this size.
- **TypeScript discipline is real** — 148 files, **3** `any`s, `tsc` clean.
- **The read/write split is coherent** — Apollo for reads, Axios for writes, with an
  explicit `api/invalidation.ts` registry. No redundant state library. Correct call.
- All pages are Server Components with client bodies below them.

### P1-5 · God components

**Evidence:**

| File | Lines | `useState` | Note |
|---|---|---|---|
| `components/room/RoomDetails.tsx` | **1554** | **19** | 8 `useEffect`, 4 top-level defs |
| `components/booking/BookingFlow.tsx` | 1050 | 14 | |
| `components/hotel/HotelDetail.tsx` | 826 | 0 | mostly presentational — lower priority |
| `components/account/AccountFlow.tsx` | 704 | **17** | **a single component** |

**Impact:** `RoomDetails` holds 19 pieces of state and 8 effects coordinating stay dates,
plans, extras, quotes, availability and two dialog snapshots in one scope. This is where
regressions will come from — every effect is a potential ordering bug, and the file is
effectively untestable as a unit.

**Recommended solution:** extract **behaviour, not markup** — pull cohesive state clusters
into hooks (`useStaySelection`, `useQuote`, `useExtrasSelection`) mirroring the existing
`usePaymentStatus` hook, which is already the right pattern in this codebase. Split
`AccountFlow` by tab. Keep rendering where it is. Incremental, one cluster per commit.

**Validation:** existing 73 vitest tests green throughout; add hook-level tests for each
extracted hook.

### P2-3 · ~600 lines of dead fixture data

**Evidence:** `src/data/index.ts` is 641 lines. Production usage of its exports:

| Export | Non-test uses |
|---|---|
| `img` | 32 |
| `IMG_FALLBACK` | 15 |
| `DATA`, `PROPERTY`, `BK`, `EXTRAS` | **0** |

Only three files import it, and `services/availability.ts` takes only the two image
helpers. `DATA`/`PROPERTY` survive solely because `pricing.test.ts` and
`availability.test.ts` assert against them.

**Impact:** two tests validate against a static mock rather than real behaviour, and 600
lines of stale "faithful port of hotel-html/src/data.js" masquerade as live code. The file
also hardcodes hotlinked third-party CDN images (booking.com, tripcdn, unsplash).

**Recommended solution:** move `img`/`IMG_FALLBACK` into `lib/format.ts` (or a small
`lib/images.ts`), relocate the fixture into `src/test/fixtures/` so its status is
unambiguous, delete `BK`/`EXTRAS`/`DATA`/default export. Separately assess whether the two
tests should be rewritten against real service shapes — **flagged, not bundled.**

### P3 · Lint warnings

4 warnings, 0 errors: an unused `eslint-disable` in `ConfirmationFlow.tsx:173`, a missing
`state.promo` dep in `SearchSheet.tsx:77`, an unused directive in generated code, and an
unused `_ref` in `services/reservations.ts:198`. The `SearchSheet` one deserves a real
look — a missing effect dependency on promo state is a plausible stale-value bug, not
noise.

---

## 5. Security Audit

| Area | Verdict |
|---|---|
| Password storage | ✅ bcrypt cost 12 |
| JWT | ✅ HS256, fail-fast on missing secret, no default |
| Token exposure to browser | ✅ httpOnly cookie + BFF injection |
| CSRF | ✅ adequately mitigated — `SameSite=Lax` blocks cross-site POST. No `Origin` check as defence-in-depth (**P2**) |
| GraphQL introspection / GraphiQL | ✅ disabled |
| GraphQL query depth | ✅ capped at 15. **No complexity cap** (**P3**) |
| Payment webhook auth | ✅ fails closed on blank secret. Comparison is `String.equals` — timing-unsafe (**P3**, `PaymentRestController.java:97`) |
| Admin authorization | ✅ correct at all 13 entry points — but unenforced by build (**P1-1**) |
| `User.passwordHash` leakage | ✅ not reachable — no controller returns `User` |
| Internal-field leakage | ❌ `idempotencyKey`, `providerReference`, `bookedByUserId`, `statusHistory` (**P1-2**) |
| Rate limiting | ❌ login/register only (**P0-2**) |
| Security event logging | ❌ none (**P1-4**) |
| CORS | ⚠️ `*` default; `prod` overlay correctly requires explicit origins. `allowedHeaders` omits `Idempotency-Key` — harmless today (BFF is server-side) but a trap for any future direct browser→backend call (**P3**) |
| Secrets | ✅ env-only, `.env` gitignored. `POSTGRES_PASSWORD:postgres` fallback default (**P3**) |

**Additional P2 — reservation lookup enumeration.** `reservation(reference, email)`
(`ReservationGraphQLController.java:58`) and `POST /api/v1/reservations/{ref}/cancel` are
anonymous and unthrottled. A reference + email pair is the sole credential, and an
attacker who knows a guest's email can brute-force references — and **cancel their
booking**. Covered by the P0-2 rate-limit work; calling it out separately because it is a
confidentiality/integrity issue, not just availability.

---

## 6. Architecture Violations

| # | Violation | Evidence | Severity |
|---|---|---|---|
| A1 | Authorization not enforceable by build | `AdminGraphQLController` (13 unguarded resolvers) + guard duplicated ×8 | P1 |
| A2 | Entity/DTO separation broken at the API boundary | 36 controller methods return entities | P1 |
| A3 | Persistence strategy dictated by serialisation | `Reservation` 6× `EAGER`; 2 `@JsonIgnore` band-aids | P1 |
| A4 | God method | `BookingServiceImpl.create()` spans lines 117–298 (~180 lines) | P2 |
| A5 | Infrastructure with no consumer | Kafka producer only; **0** `@KafkaListener` | P2 |

**Deliberately not listed as violations:** the flat layered package structure (correct for
this system, ArchUnit-enforced), the `permitAll` `/graphql` endpoint (a valid design given
service-level guards), and entities-in-GraphQL (the schema is an effective projection).

**A5 note:** a full Kafka broker runs in Compose to receive events nobody reads. Either
document it explicitly as a deliberate integration seam or remove it from the default
Compose profile — it is currently unexplained operational surface. This is a decision for
the owner, not something an agent should act on unilaterally.

---

## 7. Technical Debt

- **Documentation contradicts the code it describes.** `CLAUDE.md` asserts two red
  ArchUnit rules (all 6 pass) and a present JDK (absent). `CURRENT_STATE.md` opens with
  seven stacked "Update" blocks and warns that its own body is stale — it is a changelog
  wearing a state document's name.
- **Five root-level audit documents** (`AUDIT_REPORT.md`, `CURRENT_STATE_AUDIT.md`,
  `FULL_AUDIT_REPORT.md`, `INTEGRATION_CHANGELOG.md`, `SESSION_HANDOFF.md`, ~150 KB) that
  `CLAUDE.md` itself labels untrustworthy. They are indexed by search and actively mislead.
- **3.6 MB of untracked build output** in the working tree: `standalone-hotel-page/`
  (2.4 MB) and `standalone-hotel-page.zip` (1.2 MB). Not gitignored.
- **~600 lines of dead frontend fixture** (§P2-3).
- **Two frontend tests assert against mock data** rather than service behaviour.

---

## 8. P0–P3 Findings Index

| ID | Finding | Project | Agent | Depends on |
|---|---|---|---|---|
| **P0-1** | Simulated payment auto-settle on by default, not disabled in prod | backend | Backend | — |
| **P0-2** | No rate limit on anonymous booking/payment/lookup → inventory exhaustion | backend | Backend | — |
| **P1-1** | Admin authz by convention; guard duplicated ×8; no build enforcement | backend | Backend | — |
| **P1-2** | Entities as API contract; internal fields leak over REST | backend | Backend | → F-1 |
| **P1-3** | Inverted test pyramid; no unit tests for pricing/booking | backend | Backend | P2-2 |
| **P1-4** | Almost no logging; no security-event trail | backend | Backend | — |
| **P1-5** | God components (`RoomDetails` 1554/19 state; `AccountFlow` 704/17) | frontend | Frontend | — |
| **P2-1** | Reservation lookup/cancel enumerable (no throttle) | backend | Backend | P0-2 |
| **P2-2** | `BookingServiceImpl.create()` ~180-line method | backend | Backend | — |
| **P2-3** | ~600 lines dead fixture in `src/data/index.ts` | frontend | Frontend | — |
| **P2-4** | No `Origin` check on BFF proxies (defence-in-depth) | frontend | Frontend | — |
| **P2-5** | Kafka producer with zero consumers | ops | **owner decision** | — |
| **P2-6** | `CLAUDE.md` / `CURRENT_STATE.md` factually wrong | docs | Orchestrator | all |
| **P3-1** | Timing-unsafe webhook secret comparison | backend | Backend | — |
| **P3-2** | No GraphQL complexity cap (depth cap present) | backend | Backend | — |
| **P3-3** | 4 eslint warnings (incl. real `SearchSheet` dep bug) | frontend | Frontend | — |
| **P3-4** | Repo hygiene: 3.6 MB untracked, 5 stale root audit docs | root | Orchestrator | — |
| **P3-5** | Weak `POSTGRES_PASSWORD` default; CORS `allowedHeaders` gap | ops | Backend | — |

---

## 9. Backend Remediation Plan (Backend Agent — `backend-hotel` ONLY)

Strictly sequenced. Each step ends green before the next begins.

**Wave 1 — production blockers (no behaviour change to happy paths)**
1. **P0-1** — default `auto-settle-enabled` to `false`; fail-fast if `true` under `prod`;
   set `true` explicitly in dev Compose, `.env.example` and the test profile.
2. **P0-2 + P2-1** — generalise `AuthRateLimitFilter` to a configurable path→policy map;
   cover anonymous booking create, payment create, cancel, and reservation lookup.

**Wave 2 — structural hardening**
3. **P1-1a** — hoist the duplicated guard into `CurrentUserAccessor.requireHotelAccess`;
   delegate from all 8 impls. No semantic change.
4. **P1-1b** — add the ArchUnit rule enforcing a guard on every admin-reachable service
   method. *This is the single highest-value task in the plan.*
5. **P1-2** — `PaymentView` / `ReservationView` response DTOs for the **guest REST**
   surface only. GraphQL untouched. **Coordinate with Frontend Agent before merging.**
6. **P1-4** — security-boundary and booking/payment-transition logging.

**Wave 3 — maintainability**
7. **P2-2** — decompose `BookingServiceImpl.create()` into named private steps
   (validate → resolve guest → price → reserve inventory → persist → publish). Pure
   extraction, zero logic change.
8. **P1-3** — unit tests for `PricingServiceImpl` and the newly extracted booking helpers.
9. **P3-1, P3-2, P3-5** — `MessageDigest.isEqual` for the webhook secret; complexity cap;
   remove weak DB password default; add `Idempotency-Key` to CORS `allowedHeaders`.

**Out of scope for the Backend Agent:** the `Reservation` `EAGER`→`LAZY` change (separate
benchmarked change, after P1-2 lands), any Kafka decision (P2-5, owner's call), any
hexagonal restructuring, any change to `backoffice-hotel`.

## 10. Frontend Remediation Plan (Frontend Agent — `frontend-hotel` ONLY)

1. **P3-3** — clear the 4 lint warnings; **investigate `SearchSheet.tsx:77`** as a
   probable stale-promo bug rather than mechanically adding the dependency.
2. **P2-4** — `Origin`/`Sec-Fetch-Site` check in both BFF route handlers.
3. **P2-3** — relocate `img`/`IMG_FALLBACK`; move the fixture to `src/test/fixtures/`;
   delete the dead exports.
4. **P1-5** — extract hooks from `RoomDetails` (highest value: the quote/stay effect
   cluster), then split `AccountFlow` by tab. One cluster per commit, 73/73 green each time.
5. **Await Backend P1-2** — adopt `PaymentView`/`ReservationView`. **Do not begin before
   the orchestrator confirms the backend shape.**

**Hard boundary:** `backoffice-hotel` is not to be read for modification, audited, or
touched. No new dependencies. No state-management library. No component rewrites where an
extraction suffices.

---

## 11. Cross-Agent Dependencies

**There is exactly one, and it is the only real coordination risk in this plan.**

> **P1-2 (backend REST response DTOs) → frontend REST consumers.**
> `services/reservations.ts`, `services/payment.ts` and `hooks/usePaymentStatus.ts` parse
> the REST responses of `POST /api/v1/reservations`, `/cancel`, `POST /api/v1/payments`,
> `/capture` and `GET /api/v1/payments/{id}`.

**Protocol:** the Backend Agent posts the exact `PaymentView` / `ReservationView` field
lists to the orchestrator **before implementing**. The orchestrator diffs them against
actual frontend field usage and approves. The DTOs must be **supersets of every field the
frontend reads** — this task removes internal fields only. Frontend adopts only after the
orchestrator confirms. Neither agent merges this unilaterally.

Everything else is independent and the two agents may work in parallel.

---

## 12. Testing Strategy

- **Every task ships with a test or a written reason why not.** Pure-deletion tasks
  (P2-3, P3-4) and config defaults are exempt; everything else is not.
- **Gate for backend work:** `mvn test` in `maven:3.9-eclipse-temurin-21` (no JDK on this
  host) — must stay at **182+ passing, 0 failures, 6/6 ArchUnit**.
- **Gate for frontend work:** `tsc --noEmit` clean · `eslint src` 0 errors ·
  `vitest run` **73+/73+** · `next build` clean.
- **New coverage required:** rate-limit burst tests (P0-2); prod-profile fail-fast test
  (P0-1); a negative ArchUnit fixture proving the new authz rule bites (P1-1b); pricing
  unit tests (P1-3); REST payload assertions that internal fields are **absent** (P1-2);
  hook tests for each extracted hook (P1-5).
- **Never** relax or delete an existing assertion to make a change pass. If an existing
  test blocks a change, that is a finding to escalate, not an obstacle to remove.

## 13. Migration / Refactoring Strategy

- **Incremental only.** No rewrites. The layered architecture, the GraphQL-read/REST-write
  split, and the booking/payment state machine all stay as they are.
- **Behaviour is preserved** unless a P0/P1 security or integrity finding requires
  changing it. The only intended behaviour changes in this entire plan are: payments no
  longer self-settle by default (P0-1), abusive request rates get 429 (P0-2), and guest
  REST payloads no longer carry internal fields (P1-2).
- **One concern per commit.** Guard extraction (P1-1a) does not travel with the ArchUnit
  rule (P1-1b); DTO introduction (P1-2) does not travel with fetch-strategy changes.
- **Agents do not expand scope.** A tempting cleanup outside the assigned task is reported
  to the orchestrator, not performed.

## 14. Final Acceptance Criteria

The cleanup is complete when **all** of the following are verified by execution, not
assertion. Ticked items were executed on 2026-08-31.

1. ✅ Backend suite green in-container: **202 tests, 0 failures, 0 errors, 7/7 ArchUnit**
   (was 182 / 6). Executed 2026-09-01 00:27 UTC.
2. 🟡 Frontend: `tsc` clean · `eslint` **0 errors, 1 warning** · **85/85 vitest** (was
   73) · `next build` clean. The one remaining warning is an unused directive inside
   `src/graphql/generated/graphql.ts` — codegen output, not hand-editable.
3. ✅ **P0-1 verified at runtime:** a container run with `SPRING_PROFILES_ACTIVE=prod`
   and `PAYMENT_AUTO_SETTLE_ENABLED=true` exits non-zero with the guard message. The
   guard was moved from `ApplicationRunner` to `@PostConstruct` after the first live run
   logged *"Started HotelPlatformApplication"* before tripping — it was briefly binding
   the HTTP port. It now fails during context refresh; Tomcat never starts.
4. ✅ **P0-2 verified live**, after the two defects in §0.1: rotating `X-Forwarded-For`
   trips at request 6 (was: bypassed entirely); 25/25 payment-status polls return 200
   (was: 429 after 10, then 500 through the BFF); a legitimate booking still succeeds
   end to end.
5. ✅ **P1-1:** verified by sabotage — removing the guard from `AuditServiceImpl` failed
   the build with `AdminGraphQLController.adminAuditLogs() delegates to
   AuditServiceImpl.auditLogs(), which never calls CurrentUserAccessor`; guard restored
   and suite re-run green.
6. ⬜ **P1-2:** not started (blocked on field-list sign-off). Live evidence now exists
   rather than inference: the `201` from `POST /api/v1/reservations` serialised
   `idempotencyKey`, `bookedByUserId`, `notes` and the full `statusHistory` to an
   anonymous caller.
7. ✅ **P1-4 verified live:** `[hotel-platform,traceId=1a184563-…] BookingServiceImpl :
   reservation created as payment hold: reference=RC-3RXMS7 rooms=1 total=5787.99 MAD
   holdExpiresAt=…` — trace id present, no credential material. Webhook rejection also
   emits the standard `ApiError` with a traceId on both a missing and a wrong secret.
8. ✅ No dead code introduced: 9 imports orphaned by the guard de-duplication were removed;
   the deleted `AuthRateLimitFilter`'s last reference (a stale import in
   `AuthRestController`) was caught by the compiler and removed.
9. ✅ `CLAUDE.md` corrected — the false "2 red ArchUnit rules" claim and the false "JDK
   present" claim are gone, replaced with the container command; `docs/ARCHITECTURE.md` §4
   rewritten with a request-flow diagram marking the authorization boundary, and its
   "exhaustive" event list corrected (it was missing `booking.created` and
   `payment.failed`); stale root reports archived.
10. ✅ **Live end-to-end guest journey, twice** — once directly against the backend and
    once through the guest site's own BFF proxies (the path a real browser takes), on
    containers whose image IDs were checked against the freshly built images:
    - 11 guest routes serve (`/hotel` 307 → canonical).
    - Origin check: same-origin 200 · absent `Origin` 200 (SSR/server-side unaffected) ·
      foreign origin 403.
    - `staySearch` → 3 room types with live MAD rates; `quote` 5787.99
      (4947 + City tax 247.35 + VAT 593.64).
    - Book `201` (`RC-CZA7WK`) with 15-min hold, `Idempotency-Key` forwarded, arrival
      slot + special requests persisted → payment `201` → 25/25 polls `200` →
      capture `MOCK-0F66C1CC` → **`confirmed`/`captured`** → GraphQL lookup → cancel
      `200` with **`free` 1 → 2**, proving inventory release.
    - Webhook fails closed: 403 on a missing *and* a wrong secret.

**Nothing in this document may be marked "fixed" without the corresponding verification
above having been executed and its output recorded.** Every item above except 2 and 6 has
now been executed. §0.1 records what that execution caught that the test suites did not —
the reason this criterion was worth keeping.
