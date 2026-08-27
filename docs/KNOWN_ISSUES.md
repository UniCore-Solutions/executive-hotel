# KNOWN_ISSUES

Discovered during the 2026-08-27 investigation. Severity is engineering impact, not
product priority. **Update 2026-08-27 (later):** the frontend P0/P1 findings that were
here (F-A…F-G — currency mis-denomination, orphaned bookings on decline, wrong-stay
availability, confirmation re-prompt, broken promo codes, dead `Quote.valid`/`message`,
`gqlRequest` swallowing `NOT_FOUND`) and B2 (`stay_x_pay_y` throwing) were all fixed and
live-verified; see `docs/investigations/TASK2-TASK3-CURRENCY-AND-ATOMICITY.md` and
`git log` for the corresponding source changes. Deleted rather than annotated, per this
file's own rule.

---

## Testing

### T1 — `./mvnw test` is red (2 ArchUnit failures)
- **Problem:** `ModuleArchitectureTest` fails 2 of 5 rules.
- **Evidence:** `target/surefire-reports/com.hotelcollection.hotel.architecture.ModuleArchitectureTest.txt`
  — *"Method `StaySearchGraphQLController.staySearch(...)` calls method
  `HotelRepository.findAllActive()` in (StaySearchGraphQLController.java:48)"*, violating
  `REPOSITORIES_ARE_ONLY_ACCESSED_FROM_SERVICES` **and** `CONTROLLERS_DELEGATE_TO_SERVICES`.
  Confirmed still present in current source (`StaySearchGraphQLController.java:32,48`).
- **Affected:** backend build gate, `scripts/test.sh --backend`, `make test`.
- **Severity:** High — the whole backend gate is red, so real regressions can hide behind it.
- **State:** open; introduced with the stay-search feature (commit `5a31143`).
- **Next:** add a `findAllActive`-equivalent to `CatalogQueryService` and inject the
  interface; re-run `./mvnw test`.

### T2 — Backend suite not re-run since 2026-08-26 13:28
- **Problem:** surefire results predate HEAD and the whole uncommitted tree.
- **Severity:** Medium. **Next:** run `./mvnw test` (needs Docker for Testcontainers).

### T3 — No CI
- **Problem:** no `.github/workflows`, no GitLab CI, no Jenkinsfile anywhere.
- **Affected:** every merge. Nothing prevents T1 from persisting.
- **Severity:** Medium. **Next:** a minimal workflow running `scripts/test.sh`.

---

## Architecture

### A1 — Architecture docs describe a system that does not exist
- **Problem:** `backend-hotel/docs/architecture/architecture.md`, `ADR-008-modular-monolith.md`
  (status *"accepted (implemented and verified — 98 tests green)"*) and
  `backend-hotel/AGENTS.md` all describe a hexagonal modular monolith with per-domain
  `admin/ audit/ availability/ …` packages containing `api/application/domain/adapter`.
- **Evidence:** no such packages exist (`find src/main/java -type d`); the actual layout
  is flat `controller/service/repository/entity/dto`; and `ModuleArchitectureTest`
  rule `NO_LEGACY_HEXAGONAL_PACKAGES` **explicitly bans** that layout.
- **Severity:** High — this is the mistake a new contributor is most likely to make.
- **State:** partially addressed **in the uncommitted tree**: a new
  `ADR-009-layered-architecture.md` (untracked) supersedes ADR-008, and ADR-008 has been
  re-labelled. `AGENTS.md` was **not** updated.
- **Next:** commit ADR-009 and rewrite `backend-hotel/AGENTS.md` §Architecture.

### A2 — Kafka is a hard startup dependency with zero consumers
- **Problem:** the outbox → Kafka pipeline is fully built and correct, but no
  `@KafkaListener` exists anywhere; `event_consumption` has never been written; and
  `docker-compose.yml` gates the backend on `kafka: service_healthy`.
- **Evidence:** `grep -rn "@KafkaListener"` → 0 hits; `event_consumption` row count 0;
  `docker-compose.yml` backend `depends_on`.
- **Affected:** backend availability, local dev startup time.
- **Severity:** Medium — pure operational cost for zero delivered behaviour.
- **Next:** either add the first consumer or relax `depends_on`.

### A3 — Dead read path: notifications have no writer
- **Problem:** `NotificationQueryService` + `adminNotifications` + a back-office page all
  read `notifications`; nothing in the codebase ever inserts one.
- **Evidence:** `grep -rn "notificationRepository.save\|new Notification()"` → 0 hits;
  `notifications` and `notification_templates` row counts 0.
- **Severity:** Medium — a shipped screen that can never show anything.

### A4 — Unreachable reservation states
- **Problem:** `ReservationStatus` declares `pending, confirmed, modified, cancelled,
  checked_in, checked_out, no_show`; only `confirmed` and `cancelled` are ever assigned.
- **Evidence:** `setStatus(ReservationStatus.…)` appears exactly twice
  (`BookingServiceImpl:180`, `:482`). `checked_in`/`checked_out` appear only in reads.
- **Knock-on:** `ReviewServiceImpl:92` requires `checked_out` for proof-of-stay ⇒ **no
  guest can ever leave a review**. `CheckIn` entity and `check_ins` table are unused.
- **Severity:** High (blocks two shipped features).

### A5 — Dead RBAC layer
- **Problem:** `Permission` entity exists with no repository and no usage;
  `permissions` and `role_permissions` are empty. Authorization is role-name string
  comparison (`hasRole("super_admin")`) throughout.
- **Severity:** Low — works today, but the schema implies a granularity the code lacks.

---

## Frontend (guest)

> **A dedicated deep audit of `frontend-hotel/` lives in [FRONTEND.md](FRONTEND.md)**
> (28 evidenced defects F-1…F-28, a real/mock matrix, traced flows, and a fix plan).
> Only the P0s are duplicated here. F1–F6 below were superseded by that pass and are
> renumbered there; do not treat this section as the complete frontend list.

### F-H — Playwright e2e suite targets a retired fixture world
- **Problem:** `e2e/helpers.ts:5` uses fixture room ids and re-implements a deterministic
  `availabilityOf()` mirroring `availabilityFor` — a function that no longer exists.
  `booking.spec.ts:10` drives `roomId=executive-suite`.
- **Severity:** P1 (testing) — the guest site has no working end-to-end coverage.
- **State:** UNVERIFIED (not executed this session).

## Backend

### B1 — Mock payment capture
- **Problem:** `PaymentServiceImpl.capture()` synthesises `"MOCK-" + random8` when no
  gateway reference is supplied and marks the payment captured.
- **Evidence:** `PaymentServiceImpl.java:124`; the class javadoc is candid: *"The payment
  gateway is out of scope"*.
- **Severity:** High for production; the surrounding validation (balance, currency,
  overpayment, IDOR, provider-reference idempotency) is genuinely correct and can stay.
- **Note:** no `PaymentProvider` port exists yet, despite `AGENTS.md` claiming one.

### B3 — Stale javadoc on the pricing engine
- **Problem:** `PricingServiceImpl` javadoc says *"Rules mirror the frontend quote math
  (pricing.ts)"*. Since `82c4414` the frontend has no quote math; the backend is the only
  engine.
- **Severity:** Low.

### B4 — Deprecated mutation still in use
- **Problem:** `updateAvailability` is `@deprecated` in `availability.graphqls` in favour
  of `updateAvailabilityRange`; the back-office still calls it.
- **Severity:** Low.

---

## API / developer experience

### D1 — `backoffice-hotel` codegen points at the wrong schema
- **Problem:** `backoffice-hotel/codegen.ts` sets
  `schema: '../backend-hotel/src/main/resources/graphql/schema.graphqls'`. That file is
  a 401-byte skeleton containing only `schema {}`, two scalars and **empty** `type Query`
  / `type Mutation`. Every real type lives in `graphql/<domain>/*.graphqls`.
- **Evidence:** `cat backend-hotel/src/main/resources/graphql/schema.graphqls`.
  `frontend-hotel/codegen.ts` correctly uses `graphql/**/*.graphqls`.
- **Affected:** `npm run graphql:generate` in the back-office. The committed generated
  files predate the schema split.
- **Severity:** Medium — regenerating types is currently impossible there.
- **Next:** one-line fix to the same glob.

### D2 — Back-office disabled by default, contrary to the README
- **Problem:** `docker-compose.yml` gives the `backoffice` service `profiles:
  ["backoffice"]` (commit `1e52894`, *"profile-gated, excluded from build/start"*), so
  `docker compose up` never starts it. The root `README.md` lists it in the quickstart
  table and tells the user to open `http://localhost:3101/login`.
- **Severity:** Medium (onboarding).

### D3 — Debug scripts and a binary committed at project roots
- **Evidence:** `backoffice-hotel/debug{2,3,4,5,6,-e2e}.mjs`;
  `frontend-hotel/cloudflared-linux-amd64.deb` (untracked, ~15 MB).
- **Severity:** Low.

---

## Data

### E1 — Orphaned tables
- `permissions`, `role_permissions` (see A5), `notification_templates`, `notifications`
  (A3), `check_ins` (A4), `event_consumption` (A2),
  `promotion_eligible_rate_plans`, `promotion_eligible_room_types`, `rate_restrictions`
  — all empty, none written by any code path.
- **Severity:** Low individually; collectively they make the schema look more complete
  than the application is.

### E2 — Legacy Oracle schema still shipped
- `database/collection-schema.sql` (+ `-postgresql.sql`) is Oracle-dialect, never
  executed, and superseded by Flyway V1–V22. `backend-hotel/AGENTS.md` still calls it
  *"the existing schema"* and describes a future conversion phase that already happened.
- **Severity:** Low, but a genuine trap.

---

## Documentation

### DOC1 — `AGENTS.md` files are materially wrong in both sub-projects
- **`backend-hotel/AGENTS.md`:** describes the non-existent hexagonal module tree;
  says the contract is one `schema.graphqls` (it is split per domain); says migrations
  run `V1__…V18__` (V22 now); says `ModuleArchitectureTest` has 7 rules (5); claims
  `EmailProvider` and `PaymentProvider` ports exist (neither does); calls
  `database/collection-schema.sql` the current schema.
- **`frontend-hotel/AGENTS.md`:** points at `src/components/cards/` (does not exist);
  describes `src/services/pricing.ts` as the home of "quote math, promo rules,
  cancellation, FX" (the math moved to the backend in `82c4414`); lists
  `services/cancellation.ts` (deleted in the working tree); calls `src/data` the single
  source of truth for content; and **rule 8 mandates keeping "prototype/simulated"
  wording** — the exact copy the in-progress integration work is removing.
- **Severity:** High — these files are the first thing an agent reads.

### DOC2 — Root audit reports are stale by construction
- `CURRENT_STATE_AUDIT.md` is stamped *commit `46d9f02`*, two commits behind HEAD. Its
  headline finding (M2, split-brain pricing) was **fixed** by `82c4414`.
  `AUDIT_REPORT.md` (34 KB) and `FULL_AUDIT_REPORT.md` (47 KB, untracked) are older still.
- **Next:** treat all three as history; this `docs/` folder supersedes them.

### DOC4 — Root README documents credentials and users that do not exist
- **Problem:** `README.md` states seed users *"all share password `password123`"* and
  lists `admin@ · manager@ · analyst@ · frontdesk@ · guest@hotelcollection.test`.
- **Evidence:** `backend-hotel/scripts/seed.sql:34` says *"password for all: admin123"*;
  logging in against the running backend confirms it —
  `admin123` → **200**, `password123` → **403**. The live `users` table contains
  `admin@ · manager@ · content@ · manager.riad@ · manager.rome@` —
  `analyst@`, `frontdesk@` and `guest@` **do not exist**.
- **Affected:** onboarding, back-office e2e, any manual verification.
- **Severity:** Medium — it blocks the first thing a new contributor tries.
- **Next:** correct the README's Database section.

### DOC3 — `frontend-contract.md` claims the frontend runs on mocks
- Uncommitted edits are in flight; accuracy not line-audited.
- **Severity:** Low.
