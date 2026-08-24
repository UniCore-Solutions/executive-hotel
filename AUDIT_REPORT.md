# Hotel Collection Platform — Complete Audit Report

> **Scope:** Full-platform architecture audit + dedicated frontend mock-data audit
> **Date:** August 24, 2026 · **Method:** Static analysis of the actual codebase (no services started, no code modified)
> **Repositories:** `backend-hotel/` · `frontend-hotel/` · `backoffice-hotel/` · `database/`

---

## Table of Contents

- [Part I — Platform Audit](#part-i--platform-audit)
  - [A. Project Overview](#a-project-overview)
  - [B. Technology Stack](#b-technology-stack)
  - [C. Architecture (as-built)](#c-architecture-as-built)
  - [D. Module Map](#d-module-map)
  - [E. Data Model](#e-data-model)
  - [F. API Map](#f-api-map)
  - [G. Main Business Flows](#g-main-business-flows)
  - [H. Feature Status Matrix](#h-feature-status-matrix)
  - [I. Problems Found](#i-problems-found)
  - [J. Technical Debt](#j-technical-debt)
  - [K. Documentation Gaps](#k-documentation-gaps)
  - [L. Recommended Next Steps](#l-recommended-next-steps)
- [Part II — Frontend Mock-Data Audit](#part-ii--frontend-mock-data-audit)
  - [1. Method](#1-method)
  - [2. The Root of All Mock Data](#2-the-root-of-all-mock-data-srcdataindexts)
  - [3. Data-Source Traces per Feature](#3-data-source-traces-per-feature)
  - [4. Complete Mock-Data Inventory](#4-complete-mock-data-inventory)
  - [5. Special-Attention Areas — Verdicts](#5-special-attention-areas--verdicts)
  - [6. Final Tallies & Migration Order](#6-final-tallies--migration-order)
- [Consolidated Roadmap](#consolidated-roadmap)

---

# Part I — Platform Audit

## A. Project Overview

A multi-hotel booking platform ("Hotel Collection") in a **non-git monorepo** with four projects:

| Project | What it actually is |
|---|---|
| `backend-hotel/` | Spring Boot 4.1 / Java 21 API: catalog, availability, pricing/quotes, reservations, billing, reviews, identity/RBAC, media, notifications, platform content, audit. GraphQL primary + small REST split. Kafka transactional outbox. |
| `frontend-hotel/` | Next.js 16 guest frontend. **Hybrid**: real GraphQL for catalog/availability/rates/homepage; localStorage mocks for auth, booking creation, payment, pricing math. |
| `backoffice-hotel/` | Next.js 16 admin console. Fully real: BFF proxy → backend GraphQL, httpOnly cookie session, react-query. |
| `database/` | Two SQL files: Oracle-dialect legacy baseline (`collection-schema.sql`) and the PostgreSQL design (`collection-schema-postgresql.sql`, "locked source of truth" implemented by Flyway V1–V20). |

---

## B. Technology Stack (verified)

| Layer | Technology |
|---|---|
| Backend runtime | Java 21, Spring Boot **4.1.0** (`pom.xml:8`) |
| Persistence | Spring Data JPA/Hibernate (`ddl-auto: validate`), Flyway V1–V20, PostgreSQL 16 |
| Security | Spring Security, stateless JWT (jjwt 0.11.5), BCrypt(12), fail-fast JWT secret |
| API | Spring for GraphQL + extended scalars (query depth limit 15), REST splits (`/api/v1/auth`, `/api/v1/reservations`, `/api/v1/media`) |
| Messaging | Spring Kafka + transactional outbox (`EventOutbox` → `OutboxRelay` → `KafkaOutboxPublisher`) |
| Testing (backend) | JUnit 5, Testcontainers (postgres 16.4, kafka 3.9.1), ArchUnit 1.4.1 — ~131 tests in 15 classes |
| Frontends | Next.js ^16.3.0, React ^19.2.8, TypeScript ~5.9 strict, Tailwind v4, Radix UI |
| Data fetching | `frontend-hotel`: raw fetch GraphQL client + graphql-codegen client-preset · `backoffice-hotel`: graphql-request v7 + TanStack Query v5 behind a BFF route |
| Testing (frontends) | Vitest + Testing Library; Playwright E2E |
| Infrastructure | `docker-compose.yml` only (PostgreSQL + Kafka). **No Dockerfile, no CI/CD, no IaC anywhere** |

---

## C. Architecture (as-built)

### Backend — layered monolith, NOT the documented hexagonal modular monolith

Actual package layout under `com.hotelcollection.hotel`:

```
controller/    16 classes: 12 *GraphQLController + REST (Auth, Reservation, Invoice, Payment, Media)
service/       28 use-case interfaces
service/impl/  29 @Service implementations
repository/    36 Spring Data JPA repositories (incl. pessimistic-lock & upsert queries)
entity/        55 JPA entities/enums (UUID PKs via GenerationType.UUID)
dto/           per-domain records (inputs/outputs)
mapper/        RateMapper only
security/      SecurityConfig, JwtService, JwtAuthFilter, AuthRateLimitFilter, TraceIdFilter,
               CurrentUser(CurrentUserAccessor)
exception/     DomainException / ValidationException / TechnicalException, ErrorCode enum,
               GlobalExceptionHandler (REST) + GraphqlExceptionHandler (GraphQL)
util/          MoneyUtil, CancellationPolicy, ReferenceGenerator, Validation
config/ storage/
```

Key facts:

- Dependency direction is clean and **enforced by ArchUnit** (`ModuleArchitectureTest.java:27–76`): controllers → service interfaces only; repositories/service.impls never accessed outside services; ≤11 constructor dependencies.
- That same test **forbids** hexagonal packages and documents *"Layered architecture (ADR-009)"* — but **no ADR-009 file exists**, and all docs still describe the ADR-008 hexagonal modular monolith. Biggest doc-vs-reality gap in the repo.
- Cross-aggregate access goes through injected service interfaces; **6 `@Lazy` circular-dependency workarounds** exist (`BookingServiceImpl`, `PricingServiceImpl`, `InventoryServiceImpl`, `RateQueryServiceImpl`, `ReviewServiceImpl`, `AuditServiceImpl`) — evidence of service-layer coupling cycles ArchUnit cannot see.
- Eventing: transactional outbox publishing facts (`booking.confirmed`, `booking.cancelled`). **No consumers exist in this repo** — events are produced and relayed only.
- Vendor abstraction partial: `MediaStorageProvider ← LocalFilesystemMediaStorageProvider`. **PaymentProvider / EmailProvider interfaces do not exist** despite docs claiming otherwise.

### Frontends

- **frontend-hotel**: App Router, server components for static pages, client components for interactivity; URL-as-state via `SearchContext`; contexts Search/Toast/Modal/Session; service layer with silent mock fallbacks.
- **backoffice-hotel**: BFF pattern — `(backoffice)/layout.tsx` server guard redirects to `/login` without a valid cookie; `/api/graphql` route proxies to the backend with the Bearer token from httpOnly cookie `bo_session`; client pages use react-query over typed GraphQL documents; hotel-scope switcher context.

---

## D. Module Map (backend)

| Package | Responsibility |
|---|---|
| `controller` | GraphQL resolvers (catalog, rate, availability, reservation, review, identity, billing, admin, platform, homepage, audit, notification) + REST splits |
| `service` / `impl` | Use cases: `BookingServiceImpl` (idempotent server-priced create, penalty cancel), `PricingServiceImpl` (quote engine: nightly rate, promos, tax_fee_types, extras), `AvailabilityServiceImpl` (read model), `InventoryServiceImpl` (lock&sell/release per night), `AuthServiceImpl`, catalog/rate/billing/identity admin services, dashboard aggregation |
| `repository` | Spring Data JPA incl. custom SQL: `ensureRow` upsert, `lockByRoomTypeIdsAndRange` (pessimistic locks), `findByIdForUpdate` |
| `entity` | 55 tables mapped; UUID identities |
| `security` | Stateless JWT chain; hotel-scoped RBAC claims (`roles`, `hotels`) |
| `exception` | Unified taxonomy: NOT_FOUND / FORBIDDEN / CONFLICT / VALIDATION / UNAUTHORIZED / RATE_LIMITED / INTERNAL_ERROR / SERVICE_UNAVAILABLE |

---

## E. Data Model

From Flyway V1–V20 (matches `database/collection-schema-postgresql.sql`):

- **Main entities**: platforms, hotels, room_types, rooms, amenities (+join), experiences, restaurants, faqs, extras, media, rate_plans, room_type_rate_plans (offered pairs), rate_plan_prices, rate_restrictions, promotions, tax_fee_types, availability (sparse), guests, reservations (+rooms/guests/extras/charges/status_history/cancellations), payments, payment_transactions, invoices(+items), check_ins, reviews, notification_templates, notifications, users/roles/permissions/user_roles, event_outbox, audit_logs, countries/currencies/languages.
- **Keys**: UUID PKs everywhere since **V20** (metadata-driven BIGINT→UUID conversion; app generates values).
- **Cross-hotel integrity (C1)**: parents expose `UNIQUE(hotel_id, id)`; children carry composite FKs on `(hotel_id, id)` — an entity of Hotel A can never reference Hotel B.
- **Constraints** (rich): reservations totals identity CHECK (extras-aware after V15/V16), date ordering CHECKs, `total_price = unit_price * quantity`, price > 0, star rating 1–7, lat/long ranges, status enum CHECKs, promotion windows.
- **Exclusion constraint (C2)**: overlapping price ranges impossible via GiST daterange on rate_plan_prices (V4).
- **Trigger (V18)**: prevents reducing `room_types.total_inventory` below already-sold nights.
- **Money**: NUMERIC(10,2) everywhere (C10). **Time**: DATE for stay dates, TIMESTAMPTZ for instants (C11).
- **Notable uniques**: `lower(email)` on users, reservation reference, reservation idempotency_key, one primary image per media owner (partial uniques), platform-scoped roles (partial unique).
- **Soft delete**: none — status columns instead. Audit fields `created_at/updated_at` on domain tables.
- **DB vs JPA drift**: none found; `ddl-auto: validate` green in Testcontainers integration tests.

---

## F. API Map

### GraphQL (`POST /graphql`, schema split per module under `src/main/resources/graphql/`)

| Module | Queries | Mutations |
|---|---|---|
| catalog | `hotels(search/page/sort)`, `hotel`, `hotelDetails`, `roomType(s)`, `experiences/restaurants/faqs/extras` | — |
| homepage | `homepage` (featured hotels/roomTypes/experiences/reviews) | — |
| availability | `availability(stay)` → available/few/soldout + capacityFits | `updateAvailabilityRange` (+ deprecated row version) |
| rate | `offers`, `rates`, `quote` | rate plan CRUD, link/unlink room types, setRatePlanPrices, promotions CRUD/status |
| reservation | `myReservations`, `reservation(ref+email)`, `adminReservations`, `adminGuests` | `createReservation` (idempotencyKey!), `cancelReservation`, `adminCancelReservation` |
| identity | `me`, `adminUsers`, `adminRoles` | `login`, `register`, createUser, assignRole, revokeRole |
| billing | `adminPayments`, `adminInvoices` | createPayment, capturePayment, issueInvoice |
| review | `reviews`, `adminReviews` | createReview, moderateReview |
| admin / audit / notification / platform | dashboard, adminHotels CRUD/workspace, auditLogs, notifications, content blocks, amenities | platform content mutations |

Security model: `/graphql` is anonymously reachable; **authorization enforced inside services** (e.g., `requireStaffAccess`, `BookingServiceImpl:513`, checks `super_admin` or hotel membership from JWT claims).

### REST

- `/api/v1/auth/login|register` — public, rate-limited
- `/api/v1/reservations` POST (`Idempotency-Key` header; 201 vs 200 replay) and `/{reference}/cancel`
- `/api/v1/media/**`, `/api/v1/invoices/**`, `/api/v1/payments/**`
- `/actuator/health`, `/actuator/prometheus`

---

## G. Main Business Flows (traced end-to-end)

**G1. Hotel retrieval & details — REAL, full stack**
`services/catalog.ts getProperty/getStayRoom` → `hotel`/`hotelDetails` queries → `CatalogGraphQLController` → `CatalogQueryServiceImpl` → `HotelRepository`; draft hotels → NOT_FOUND (`CatalogGraphQLController:114`). BatchMappings batch media/amenities/ratings.

**G2. Availability search — REAL**
Frontend parallel `availability` + `rates` + `roomTypes` → `AvailabilityServiceImpl.check` → sparse `availability` rows (missing row = fully free) → available/few/soldout + capacityFits.

**G3. Quote/pricing — SPLIT-BRAIN**
- Backend: `RateGraphQLController.quote` → `PricingServiceImpl.quote` (single nightly rate covering check-in, promo validation, tax_fee_types engine, extras models, totals identity) — DB-tested.
- Frontend: `BookingFlow.tsx:150` computes quotes **client-side** with the ported fixture engine (`pricing.ts`: flat 12% tax, fixture offers, hardcoded FX). The backend `quote` is **never called by the guest UI**.

**G4. Reservation creation — MOCK on guest side**
`BookingFlow.tsx:232–276`: fake `charge()` → `reservations.create()` writes **localStorage** with a locally generated `RC-XXXXXX` ref. The backend flow (`BookingServiceImpl.create`: idempotency dedupe incl. race handling, server re-pricing, capacity checks, pessimistic night locks, guest find-or-create, snapshot lines/extras/charges, status history, outbox event) is exposed via GraphQL **and** REST but has **no caller in either frontend** except tests/Postman.

**G5. Guest authentication — MOCK**
`services/auth.ts` = localStorage user store incl. seeded demo user (`demo@hotelcollection.com` / `demo1234`, plaintext). The backend's real auth (BCrypt, anti-enumeration, JWT, guest provisioning) is used **only by backoffice-hotel**.

**G6. Back-office operations — REAL**
Login via BFF route → JWT into httpOnly cookie → layout guard validates via `me`. All admin screens (hotels CRUD + tabs, reservations list/detail/adminCancel, guests, promotions, payments, invoices, reviews moderation, users/roles, notifications, audit logs, dashboard) call real GraphQL through the proxy; backend re-checks staff access on every call.

---

## H. Feature Status Matrix

Legend: ✅ done · 🟡 partial · ❌ missing · *(mock)* = simulated client-side

| Feature | Backend | Frontend (guest) | Backoffice | Database | Tests | Status |
|---|---|---|---|---|---|---|
| Hotels catalog/search | ✅ | ✅ (reads backend) | ✅ CRUD | ✅ | ✅ | Done |
| Room types / rooms | ✅ | ✅ read-only | ✅ CRUD | ✅ V3+V18 trigger | ✅ | Done |
| Availability | ✅ sparse model | ✅ reads backend | ✅ editor | ✅ V5/V12/V18 | ✅ | Done |
| Rates/plans/prices | ✅ | ✅ reads backend | ✅ manage | ✅ V4+C2 | ✅ | Done |
| Promotions | ✅ engine (stay_x_pay_y rejected) | 🟡 fixture-based validation | ✅ manage | ✅ | ✅ | Partial |
| Quote | ✅ authoritative | ❌ local math instead | n/a | ✅ | ✅ | Split-brain |
| Reservations | ✅ idempotent, priced, locked | ❌ *(mock)* localStorage | ✅ list/cancel | ✅ V6 | ✅ | BE done; FE mock |
| Payments | ✅ create/capture (mock provider) | ❌ *(fake charge)* | ✅ lists | ✅ V7 | ✅ | BE done; FE mock |
| Invoices | ✅ issue/list | ❌ | ✅ list | ✅ | ✅ | Done (BE+BO) |
| Reviews | ✅ moderation + proof-of-stay | ✅ read approved | ✅ moderate | ✅ V8 | ✅ | Done |
| Users / RBAC | ✅ hotel-scoped | ❌ *(mock auth)* | ✅ manage | ✅ V2 | ✅ | Done (BE+BO) |
| Authentication | ✅ JWT | ❌ *(localStorage)* | ✅ real (cookie BFF) | ✅ | ✅ | Guest FE mock |
| Media | ✅ REST upload + provider | consumes URLs | 🟡 URL fields | ✅ V3 C4 | ✅ | Mostly done |
| Notifications | ✅ templates + outbound (outbox) | ❌ | ✅ list | ✅ V8 | 🟡 | BE/BO done |
| Check-in/out | ❌ table exists, no endpoint | ❌ fake flow | ❌ | ✅ table | ❌ | Missing (documented gap) |
| Password reset / refresh / logout | ❌ | ❌ | ❌ | — | — | Missing (ADR-007 accepted) |
| Homepage / platform content | ✅ | ✅ | ✅ blocks | ✅ V13/V14/V19 | ✅ | Done |
| Audit log | ✅ | n/a | ✅ viewer | ✅ | 🟡 | Done |

Test inventory: backend ~131 tests (unit + ArchUnit + Testcontainers); frontend-hotel 11 vitest files (~119 cases) + 13 Playwright specs; backoffice 1 vitest file (~10 cases) + 3 Playwright specs.

---

## I. Problems Found

### CRITICAL

1. **Guest booking never reaches the backend** — `BookingFlow.tsx` stores reservations in localStorage while a complete, concurrency-safe backend booking flow sits unused. Real inventory is not decremented by guest bookings; two systems disagree about bookings.
2. **Silent fallback to mock data on any backend error** — every frontend read seam (`catalog.ts` etc.) catches errors and returns fixtures/homepage-empty. When the API is down, guests see plausible fake hotels/prices with no signal; it also masks outages and can render *fixture rooms under a real backend hotel id*.

### HIGH

3. **Guest auth fully mocked**, including a seeded plaintext password (`demo1234`) in shipped source (`auth.ts:41`).
4. **Client-side money math decides what guests see/pay** — flat 12% tax, hardcoded FX env defaults, fixture promos — guaranteed divergence from the backend's authoritative engine.
5. **Documentation describes a non-existent architecture** (AGENTS.md / README.md / architecture.md = ADR-008 hexagonal monolith, "16 modules", "V1–V18", "109 tests"; reality = layered layout, V1–V20, ~131 tests, no ADR-009 file).

### MEDIUM

6. **6 `@Lazy` circular service dependencies** — layering violated at the dependency-graph level.
7. **Promo rules incompletely enforced** in `applyPromo`: ignores booking window, maxUsageTotal, maxUsagePerGuest, applicableDaysOfWeek (columns exist, no runtime effect).
8. **GraphQL exposes money as `Float!`** throughout — binary float at the currency boundary.
9. **Enum mismatch**: `catalog.ts:153` tests `discountType === 'NIGHT'`, backend emits only `percentage|fixed_amount|stay_x_pay_y` → dead branch; discount always mapped as percent.
10. **Hardcoded display cancellation policy** (`"Free cancellation up to 2 days before check-in"`) regardless of fetched plan refundability.
11. **Back-office unit-test coverage ≈ nil** (1 file); correctness rests on 3 E2E specs.
12. **No CI/CD, no Dockerfile, no deployment artifact** anywhere.
13. **In-memory sort caps** (500 candidates) for PRICE_ASC/RATING_DESC search.
14. **Reference lookup brute-force window**: public `reservation(ref+email)` and cancel are unthrottled.
15. **Weak password policy** (min 6 chars) and no refresh/revocation (60-min tokens).

### LOW

16. Root-level debug debris: `backoffice-hotel/debug2..6.mjs`, `debug-e2e.mjs` with hardcoded demo credentials.
17. Shared dev seed credentials (`admin123`) documented in seed files.
18. EAGER collections + SUBSELECT fetch on `Reservation` aggregate (+4 queries/load).
19. Single-class `mapper/` package; mapping style inconsistent elsewhere.
20. FX display conversion rounding artifacts; static rates.
21. No query-complexity/cost limiting beyond depth 15.
22. Deprecated `updateAvailability` mutation still live (properly marked).

---

## J. Technical Debt

- **Dual pricing engines + dual booking stores** (backend truth vs frontend prototype) — dominant debt; the whole migration matrix exists for this and is half-done.
- Service-layer coupling cycles (@Lazy) awaiting decomposition into module boundaries the docs already describe.
- Doc rot concentrated on newest decisions (layered refactor, V19/V20, test counts).
- Mock seams without kill switches: reads have a flag (`NEXT_PUBLIC_USE_MOCK_SERVICES`), writes have **no backend path at all**.
- Test asymmetry: backend strong, guest frontend medium (fixture-heavy), backoffice minimal unit coverage.

---

## K. Documentation Gaps

**Accurate:** `docs/api/frontend-contract.md` delta matrix (mostly), `docs/security/security.md`, error-code taxonomy docs, `database/collection-schema-postgresql.sql` header, `DATA_FLOW.md` (accurately describes the *mock* rules), backoffice implementation report (matches code).

**Outdated/wrong:**
- `README.md` + `AGENTS.md` (hexagonal modular monolith, 16 modules, V1–V18, 109 tests — all stale post-refactor).
- `docs/architecture/architecture.md` still ADR-008; **ADR-009 cited by code does not exist**.
- `BACKEND_FINAL_AUDIT.md` predates layered refactor + V19/V20 (useful history, wrongly indexed as current).
- `frontend-contract.md` header claims "zero network calls" — now false (reads integrated).
- Migration-count references vs actual V20; `DATABASE_SCHEMA*.md` in frontend-hotel docs.

**Undocumented:** V19 featured flags, V20 UUID strategy rationale, backoffice BFF/session design, frontend mock-fallback semantics.

---

## L. Recommended Next Steps (priority order — do not implement yet)

1. Decide & document the booking integration strategy; wire guest booking to `createReservation`.
2. Kill loud-vs-silent mock fallbacks (banner/telemetry minimum).
3. Route guest pricing through backend `quote` before payment.
4. Switch guest auth to real endpoints; remove seeded plaintext credentials.
5. Docs reconciliation pass (write ADR-009, update README/AGENTS/architecture/test counts/migrations).
6. Enforce remaining promo rules (booking window, usage caps, day-of-week) + usage ledger.
7. Break the 6 `@Lazy` cycles; add ArchUnit rule banning new ones.
8. Add CI + Dockerfiles.
9. Replace Float money in GraphQL schema.
10. Fix small correctness items ('NIGHT' branch, hardcoded policy string, throttle ref lookup, password policy).
11. Clean root debug scripts; consolidate seed strategy.
12. Add backoffice unit tests + contract tests pinning frontend ops to schema.

> **Verification note:** runtime behavior was not exercised; everything above is static analysis plus each project's own suites as evidence. Kafka downstream consumers have no implementation in this repo — nothing downstream was found to verify.

---

---

# Part II — Frontend Mock-Data Audit

> Question answered: *"What frontend data is still fake, where does it come from, and what real API should replace it?"*

## 1. Method

Searched `frontend-hotel/src` (and `backoffice-hotel/src` as control) for: `mock`, `dummy`, `fake`, `demo`, `sample`, `seed`, `TODO/FIXME`, `localStorage`, `sessionStorage`, `useState([...])`, hardcoded arrays/objects/URLs, `@/data` imports, `.json` fixtures, generated GraphQL documents vs mutations.

Findings: **no `.json` fixture files**; all static data lives in TS. Backoffice is clean (one legitimate UI-preference localStorage key). All mocking in the guest app concentrates in one fixture module + 10 service modules + 28 consuming files.

---

## 2. The Root of All Mock Data: `src/data/index.ts`

Single fixture store (641 lines), ported 1:1 from the old static HTML site (`data/index.ts:1`):

| Export | Content | Fake? |
|---|---|---|
| `PROPERTY` (`:32`) | Full hotel "Executive Boutique Hotel Rabat": rating **4.4**, reviewCount **967**, address, amenities, facilities, restaurants, policies, experiences ×4, FAQ ×3 topics, gallery ×10, reviews ×5, images ×4 | Yes |
| `PROPERTY.rooms[3]` (`:327–441`) | `superior-double-or-twin` 1050 MAD · `double-or-twin` 910 · `executive-suite` 1550 — capacity/bed/size/policies/images each | Yes |
| `DEMO_RESERVATIONS[2]` (`:444`) | `RC-DEMO1` Adam Benali suite 6944 MAD · `RC-DEMO2` Claire Marchetti w/ SUMMER2026 | Yes |
| `OFFERS[5]` (`:503`) | SUMMER2026 −10% · STAY4PAY3 night-free · BESTRATE −15% · CORP10 −8% · WELCOME5 −5%, with windows | Yes |
| `EXTRAS[5]` (`:587`) | shuttle 250 · late-checkout 300 · baby-cot 150 · meeting-room 400 · laundry 50 | Yes |
| `BK` / `TRIP` / `img` (`:4–30`) | Hardcoded external image URLs (bstatic/tripcdn/unsplash) + `IMG_FALLBACK` | Static assets |

Consumed by **28 files** (see inventory).

---

## 3. Data-Source Traces per Feature

```text
Homepage (/)
   ↓ app/page.tsx (server component)
   ├─ getPlatformContent() → platform.ts → GraphQL platformBySlug ──► REAL (fallback null)
   ├─ getHomepage()        → homepage.ts  → GraphQL homepage      ──► REAL (fallback EMPTY)
   ├─ hero stats (rating 4.4 / 967 reviews / room count / check-in)
   │      └─ const P = PROPERTY (page.tsx:71)                     ──► MOCK (src/data)
   ├─ hero text/image when backend empty → literal strings        ──► MOCK literals
   └─ Rooms/Experiences sections: homepage.* → platform.* → PROPERTY ──► 3-tier, ends MOCK

Hotel page (/hotel)
   ├─ ?hotelid=<uuid> → HotelDetail → getHotelById/getStay/getExperiences/getReviews
   │      └─ GraphQL hotel/availability/rates/roomTypes/…         ──► REAL
   │      ⚠ any fetch error → falls back to DATA fixtures          ──► E-type hazard
   └─ no param → HotelLegacyPage (page.tsx:96 const P = PROPERTY) ──► 100% MOCK

Room detail (/room/[roomId] → /hotel?roomId=…)
   └─ RoomDetails → getStayRoom() (GraphQL, mock fallback)
      + pricing.compute() client engine + EXTRAS + plans from rates ──► HYBRID

Search (/search) → SearchResults.tsx:84 searchStay(undefined,…)
   └─ GraphQL Hotels + availability + rates per active hotel      ──► REAL (mock fallback)

Offers (/offers) → OffersGrid.tsx: OFFERS array + validatePromo   ──► MOCK (backend offers() unused)

Booking (/booking) → BookingFlow.tsx
   ├─ quote: pricing.compute() — 12% tax, DATA.OFFERS, DATA.EXTRAS ──► MOCK ENGINE
   ├─ payment: payment.charge() — setTimeout + digit rules         ──► FAKE
   └─ creation: reservations.create() → localStorage              ──► LOCAL ONLY
      (no mutation documents exist in src/graphql/ — queries only)

My Reservation (/reservation) → ReservationFlow.tsx → localStorage ──► LOCAL ONLY
Check-in (/checkin)           → CheckinFlow.tsx  → localStorage   ──► LOCAL ONLY
Account (/account)            → AccountFlow.tsx auth.* + LS users ──► LOCAL ONLY
Guests & dates (all pages)    → URL params via SearchContext       ──► UI STATE (not mock)
```

---

## 4. Complete Mock-Data Inventory

Classification: **A** pure mock · **B** hardcoded UI content (intentional) · **C** local demo state · **D** localStorage persistence · **E** API-with-fake-fallback · **F** real API.

| # | Feature/Page | File(s) | Data | Current Source | Real API Available? | Class | What Needs To Change |
|---|---|---|---|---|---|---|---|
| 1 | Homepage hero stats | `app/page.tsx:71` | Rating 4.4, 967 reviews, room count, check-in time | `PROPERTY` fixture | ✅ `homepage` + `hotel(id)` fields | A | Use backend aggregates |
| 2 | Homepage hero fallback | `app/page.tsx:88–117` | Literal eyebrow/title/subtitle/image | Hardcoded strings | ✅ `platformBySlug` HeroBlock | B/E | Placeholder-only, not content |
| 3 | Homepage rooms grid | `components/home/RoomsGrid.tsx:90` | 3 fixture rooms + prices | `PROPERTY.rooms` | ✅ `homepage.featuredRoomTypes` used first | A (tier-3) | Label fallback or remove |
| 4 | Homepage experiences | `app/page.tsx:255+`, `DiscoverSection.tsx` | Rabat attractions | `PROPERTY.experiences` | ✅ homepage/platform blocks | A (tier-3) | Same |
| 5 | `/index-2` variant page | `app/index-2/page.tsx` | Entire page | Fixture | ✅ same APIs | B | Migrate or retire |
| 6 | Hotel legacy page | `app/hotel/page.tsx:96` | Full hotel content + inline hero URL | `PROPERTY` | ✅ `hotelDetails(hotelId)` | A | Needs default-hotel-id strategy |
| 7 | Hotel uuid-mode fallbacks | `services/catalog.ts:97,131,152,168,196,214,230` | On ANY error → fixture hotel/rooms/offers/reviews rendered under real hotel id | Mock fallback in every accessor | ✅ n/a | **E** | Fail loudly; never swap entity identity |
| 8 | Room types | `catalog.ts mapRoomTypeToRoom:87–106` | Correct field mapping | Real + mapping | ✅ `roomTypes(hotelId)` | F | — |
| 9 | Room prices/FX | `catalog.ts:31–37,103` | Hardcoded FX env defaults (EUR .091/USD .100/GBP .078) → "base MAD" | Real price, fake FX layer | 🟡 currencies table exists; no FX endpoint | B | Serve FX from backend or drop conversion |
| 10 | Cancellation text | `catalog.ts:101` | Always "Free cancellation up to 2 days…" | Hardcoded | ✅ `isRefundable`/policy fetched but ignored | A | Map from RoomRateOption |
| 11 | Availability badge | `RoomDetails.tsx:130` et al. | Real statuses | Backend `availability` | ✅ | F | — |
| 12 | Availability mock seam | `services/availability.ts:52–57` | Hash-based sold-out/few (FNV of roomId+date) | Local algorithm | ✅ | A | Delete after #7 fixed |
| 13 | Rate-plan mock seam | `services/availability.ts:15–49 plansFor()` | bb/ro/hb derived base×0.85/×1.12 | Local algorithm | ✅ `rates(input)` | A | Same |
| 14 | Search results | `components/search/SearchResults.tsx:84` | Per-hotel live availability across active hotels | Backend | ✅ | F | — |
| 15 | Demand score | `availability.ts:60–62 demandFor()` | `hashStr(room.id)%1000` | Local algorithm | ❌ **Backend API missing** (no demand field) | A | Server-side sort/relevance or drop |
| 16 | Search facets | `lib/filters.ts`, `filterEntries` | Client-side filtering over mostly-real data | Client logic | ✅ data real | B | Move server-side later |
| 17 | Dates/guest counts | `context/SearchContext`, `lib/dates.ts` | checkin/checkout/adults/children/rooms/ages | URL state (by design) | n/a | B | Keep |
| 18 | Offers listing | `components/offers/OffersGrid.tsx:8,38` | 5 promo codes/windows/conditions | `OFFERS` fixture | ✅ `offers(hotelId)` exists; `getOffers()` implemented but **uncalled** | A | Render backend offers |
| 19 | Promo validation | `services/pricing.ts:13–67 validatePromo()` | Validity vs fixture codes | Local engine | ✅ enforced in `PricingServiceImpl.applyPromo` | A | Call `quote(promoCode)` |
| 20 | Quote math | `BookingFlow.tsx:150` → `pricing.compute():82–124` | subtotal/discount/**12% tax**/extras/original total | Client engine | ✅ `quote(input)` (math proven identical) | A | Replace before payment step |
| 21 | Extras catalog | `data/index.ts:587`, `lib/extras.ts:2` | 5 extras w/ prices | `EXTRAS` fixture | ✅ `extras(hotelId)` exists, unused | A | Fetch + map pricing_model |
| 22 | Reservation storage | `services/reservations.ts` (whole) | Create/find/update/checkIn, local `RC-XXXXXX` refs | localStorage `rc_reservations_v1` | ✅ `createReservation`/`reservation(ref,email)`/`myReservations` | **D** | Swap store for API calls |
| 23 | Demo reservations | `data/index.ts:444–501`, `seedStore()` | RC-DEMO1/2 seeded into every visitor | Fixture seed | ✅ | C | Remove after cutover |
| 24 | Booking idempotency | `reservations.ts bookingKey` | `bk-*` key + done marker | localStorage `rc_booking_done` | ✅ backend UNIQUE + replay | D | Pass UUID to mutation |
| 25 | Login/Register | `services/auth.ts:46–77`, `SessionContext.tsx` | Users w/ plaintext passwords; session `{email,name}` | localStorage `rc_users_v1`/`rc_session_v1` | ✅ REST auth + `login/register/me` | **D** | Use endpoints; httpOnly cookie (proven in BO) |
| 26 | Seeded demo account | `auth.ts:41` | `demo@hotelcollection.com` / `demo1234` | Hardcoded credential | ✅ n/a | A/C | Delete (security-relevant) |
| 27 | Password reset | `auth.ts:80–88` | Fake success "(mock)" | Simulated | ❌ **Backend API missing** | A | New flow needed (email dependency) |
| 28 | Session shape | Session `{email,name}` | No roles/token concept | Local type | ✅ backend `Me{roles,hotelIds}` | A | Extend at swap time |
| 29 | Payment | `services/payment.ts charge()` | setTimeout + card-ending rules | Fake gateway | 🟡 `createPayment/capturePayment` exist (auth required); **guest anonymous pay flow + gateway = Backend API missing** | A | Product decision needed |
| 30 | Check-in | `CheckinFlow.tsx:39,81` | Status flip in LS | localStorage | ❌ **Backend API missing** (`check_ins` table exists, no endpoint) | D | New mutation needed |
| 31 | Confirmation email | `ConfirmationFlow.tsx:156` | "Email is not available in this prototype" | Simulated | 🟡 notification module exists; **no guest-email trigger API** | B | Wire consumer or new use case |
| 32 | Newsletter | `services/newsletter.ts` | Subscribers in LS | localStorage `rc_newsletter_v1` | ❌ **Backend API missing** | D | New endpoint required |
| 33 | Cookie consent | `services/consent.ts` | Consent state | localStorage `rc_consent_v1` | ❌ none (typical client-side) | D/B | Legitimately local |
| 34 | Recent activity | `services/activity.ts`, `RecentActivity.tsx:38–40` | Anonymous history | localStorage ×2 | ❌ none — documented intentional (D-26) | D | Intentionally local — keep |
| 35 | Language | `hooks/useLang.ts:16` | en/fr/ar preference | localStorage `rc_lang` | n/a | B | Keep |
| 36 | Site brand/address | `Header.tsx:36–37,80`, `Footer.tsx:120–122`, `SearchSheet.tsx:142–144` | Name/tagline/"72 Rue Oued Sebou"/hours | `PROPERTY` constants (brand overridden by platform API when present) | ✅ partial: platform identity; hotel address via query | A/B | Resolve hotel/platform in layout |
| 37 | FAQ page | `app/faq/faq-client.tsx` | Topics/answers | `PROPERTY.faq` | ✅ `faqs(hotelId)` unused here | A | Fetch hotel FAQs |
| 38 | Legacy/homepage reviews | `data/index.ts:279–325` | 5 named reviews | Fixture | ✅ `reviews(hotelId)` wired in HotelDetail only | A | Route through backend |
| 39 | Gallery/images | `BK/TRIP/img`, `IMG_FALLBACK` | External CDN URLs | Static | ✅ backend `media`; mappings already use `media[].url` in real mode | B | Move imagery into media tables |
| 40 | Site search service | `services/siteSearch.ts` | Searches fixture content | Fixture | ✅ `hotels(query)` exists; content search missing | A (**DEAD CODE** — no importers) | Delete or wire |
| 41 | Restaurants/facilities/policies | `HotelLegacyPage`; `mapHotelToProperty` leaves them `[]` (`catalog.ts:225–232`) | Fixture-only sections | `PROPERTY` | 🟡 `restaurants(hotelId)` exists; facilities/policies **Backend API missing** (only `hotels.config` JSONB) | A/E | Model server-side if dynamic desired |
| 42 | Backoffice data | `backoffice-hotel/src/**` | All admin features | **Real** via BFF (`app/api/graphql/route.ts`) | ✅ | **F** | — |
| 43 | Backoffice hotel switcher | `context/HotelScopeContext.tsx:43–57` | Selected hotel id | localStorage pref fed by real `adminHotels` | n/a | B | Intentional — keep |

---

## 5. Special-Attention Areas — Verdicts

| Area | Verdict |
|---|---|
| Homepage hotel listings | **Real** (`homepage.featuredHotels`), silent empty-fallback |
| Room types | **Real** in uuid-mode; fixture on legacy surfaces |
| Room prices | **Real amounts**; fake FX layer + hardcoded policy text (#9/#10) |
| Availability | **Real**; hash-fake only in mock seam/fallback |
| Search results | **Real** across all active hotels |
| Dates / guest count | **URL state** — correct by design |
| Experiences | **Real** (hotel/platform/homepage), fixture tier-3 |
| Offers | **MOCK end-to-end** on `/offers`; backend query exists, unused |
| Reviews | **Real** on HotelDetail; fixture on legacy surfaces |
| Hotel details | Split: legacy 100% fixture; uuid-mode real |
| Images/media | Mixed: backend media in real mode; CDN URLs elsewhere |
| Reservations | **100% localStorage** — biggest gap |
| Authentication/user data | **100% localStorage**, seeded plaintext demo creds |
| Admin/back-office | **Fully real** — no business mocks |

---

## 6. Final Tallies & Migration Order

**1. Total mock-data locations found: 43**
- Pure mocks / local engines (A): **19**
- Intentional static UI content (B): **11**
- Local demo state (C): **2**
- localStorage persistence (D): **8** (3 business + newsletter + 3 by-design prefs + consent)
- Real-API-with-silent-fake-fallback (E): **1 systemic pattern** + hero literals
- Real API (F): search, availability reads, rates reads, hotel(uuid), homepage, platform, reviews(detail), entire backoffice

**2. Pages/features still on mock:** `/offers`, `/booking` (quote+payment+create), `/reservation`, `/checkin`, `/account`, `/hotel` without `?hotelid`, `/index-2`, homepage hero-stats + tier-3 sections, header/footer identity, FAQ page, site-search (dead).

**3. Files containing mock data: 28** (frontend-hotel)
Core: `src/data/index.ts` · `src/services/{availability, pricing, cancellation, reservations, auth, payment, newsletter, consent, activity, siteSearch}.ts` · `src/lib/extras.ts`
Consumers: `app/{page, index-2/page, hotel/page, room/[roomId]/page, faq/faq-client}.tsx` · `components/home/{RoomsGrid, DiscoverSection, RecentActivity}.tsx` · `components/layout/{Header, Footer, SearchSheet}.tsx` · `components/offers/OffersGrid.tsx` · `components/hotel/HotelRoomGate.tsx` · `components/room/RoomDetails.tsx` · `components/booking/{BookingFlow, ReservationFlow, ConfirmationFlow, CheckinFlow}.tsx` · `components/account/AccountFlow.tsx`

**4. Mocks with backend API ready today (~24 items — no backend work needed):** reservations CRUD/cancel/lookup, quote, promo validation, offers listing, extras catalog, FAQs, restaurants, login/register/session, media/images, reviews, hotel identity/address, server-side sorting alternative.

**5. Mocks requiring NEW backend APIs:** password-reset flow · guest anonymous payment initiation + real gateway · self-service check-in mutation · newsletter subscription · guest confirmation-email trigger · facilities/policies content model · demand/popularity score.

**6. Intentionally static (keep):** URL-as-stay-state · language preference · consent store · recent-activity history (product decision D-26) · legal/static pages · icon sets · hero fallback *as placeholder only* · backoffice hotel-switcher preference.

**7. Recommended migration order:**

1. **Stop silent fallbacks** (`catalog.ts` catches returning `DATA`) — smallest change, removes wrong-entity rendering risk.
2. **Reservations → backend** (`createReservation` + `reservation(ref,email)` + `cancelReservation`); delete demo seeds after cutover.
3. **Quote → backend** before showing "Pay"; promo validation comes free.
4. **Auth → backend** endpoints with httpOnly cookie (copy backoffice pattern); delete seeded demo credentials.
5. **Offers / extras / FAQ pages → existing read queries** (pure swaps).
6. **Payment**: decide product flow (account-required capture exists today vs. new guest-payment endpoint + provider integration).
7. **New-backend items last** (newsletter, check-in, password reset, policies model) — each needs schema/API/product decisions.

---

---

# Consolidated Roadmap (both audits merged, priority order)

| # | Action | Source | Effort | Impact |
|---|---|---|---|---|
| 1 | Remove silent mock fallbacks in frontend read seams | Mock audit #7 / CRIT-2 | S | Prevents fake data shown as real |
| 2 | Wire guest booking → `createReservation` (REST or GraphQL), delete localStorage store + seeds | CRIT-1 / Mock #22–24 | M | Core product becomes real |
| 3 | Guest quote → backend `quote` before payment | HIGH-4 / Mock #19–20 | M | Single pricing truth |
| 4 | Guest auth → real endpoints + httpOnly cookie; delete `demo1234` seed | HIGH-3 / Mock #25–28 | M | Security |
| 5 | Write ADR-009 (layered arch); update README/AGENTS/architecture.md/migration counts/test numbers | HIGH-5 / K | S | Agent/dev correctness |
| 6 | Offers/extras/FAQ pages → existing queries; fix 'NIGHT' dead branch + hardcoded policy text | MED-9/10 / Mock #18/10 | S | Consistency |
| 7 | Enforce remaining promo rules + usage ledger | MED-7 | M | Revenue correctness |
| 8 | Break 6 `@Lazy` cycles; ArchUnit rule banning new ones | MED-6 | M | Long-term maintainability |
| 9 | CI/CD + Dockerfiles for all three apps | MED-12 | M | Delivery safety |
| 10 | Float money → decimal/string convention in GraphQL schema | MED-8 | S/M | Financial integrity |
| 11 | Throttle ref+email lookup; stronger password policy | MED-14/15 | S | Security hardening |
| 12 | New backend features (newsletter, check-in, reset, guest payment, policies model) | Mock #27/29/30/32/41 | L each | Product completeness |
| 13 | Clean debug scripts; consolidate seeding; backoffice unit tests; contract tests | LOW-16 / MED-11 | S | Hygiene |

---

*End of report. Generated from static verification of the codebase on 2026-08-24; no code was modified during the audit.*
