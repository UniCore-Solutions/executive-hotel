# Current-State Audit — Hotel Collection Platform

**Date:** 2026-08-26 · **Commit:** `46d9f02`
**Scope:** `backend-hotel` · `frontend-hotel` · `backoffice-hotel` · PostgreSQL (Flyway V1–V22) · Kafka · Docker Compose
**Basis:** Source code is the source of truth. No code modified during the audit.

---

## A. Executive Summary

A genuinely substantial, mostly-functional layered system. The **backend is real** (Spring Boot 4 / Java 21, PostgreSQL, Kafka outbox): real bcrypt+JWT auth + RBAC, transactional DB-persisted server-priced reservations with inventory locking/release, DB-driven taxes/promos, idempotency, an outbox relay. The **back-office is 100% wired end-to-end** to that backend (every screen is real GraphQL CRUD behind an httpOnly JWT cookie).

The **guest frontend is the critical gap.** The core search → catalog → availability → quote → booking → confirmation → account path is real. But a large guest surface still renders static fixtures (`src/data/index.ts`) and runs a **second client-side pricing engine** (hardcoded 12% tax, fixture promo codes). The homepage has a silent fallback; newsletter/consent/activity are localStorage; check-in is client-only; the payment "gateway" is a mock; Kafka has zero consumers yet is a hard startup dependency.

**Highest-severity non-obvious discovery — architecture docs contradict the code.** `architecture.md`/`ADR-008` claim a hexagonal "modular monolith" (`api/application/domain/adapter`) is implemented; the actual tree is a flat layered architecture (`controller/service/repository/dto/entity/...`), and `ModuleArchitectureTest` enforces layered rules quoting an **ADR-009 that does not exist**, plus a rule that **bans** the hexagonal package layout ADR-008 says is in production.

---

## B. Feature Status Matrix

| Feature | Frontend | API | Backend | DB | Real/Mock | Status |
|---|---|---|---|---|---|---|
| Search / catalog (staySearch) | `catalog.ts` | `staySearch` | CatalogQueryService | hotels/room_types | **Real** | ✓ |
| Hotel detail (UUID param) | `hotel/page.tsx:85` | `hotel(id)` etc | CatalogQueryService | — | **Real** | ✓ |
| Legacy `/hotel` (no id) + `/index-2` | fixture `PROPERTY` | — | — | — | **Mock** | uses `@/data` |
| Home page sections | `getHomepage()` | `homepage` | HomepageService | content blocks | **Silent fallback** | ◐ |
| Pricing **booking** | `quote.ts` | `quote` | PricingService | tax_fee_types | **Real** (server-priced) | ✓ |
| Pricing **room/offers/search/promo** | local `pricing.ts` `compute`/`validatePromo` | — | — | — | **Mock (split-brain)** | ✗ |
| Reservation (create/cancel) | `reservations.ts` | create/cancel | BookingServiceImpl | reservations + inventory | **Real** | ✓ |
| Check-in | client-only state flip | — | — | `check_ins` (empty) | **Mock** | ✗ |
| Auth guest | `auth.ts` REST | `/api/v1/auth`, GraphQL | AuthService | users | **Real** (no reset) | ✓ |
| Auth backoffice | httpOnly cookie | login/me/logout | AuthService | users | **Real** | ✓ |
| Back-office CRUD (all) | real GraphQL | all admin ops exist | AdminGraphQLController + svc | all | **Real** | ✓ |
| Reviews | list + moderate | `reviews`,`createReview`,`moderateReview` | ReviewService | reviews | **Real** (needs checkout) | ◐ |
| Media | REST `/api/v1/media` | upload/delete | MediaStorageService | media | **Real** (local disk) | ✓ |
| Newsletter | `newsletter.ts` localStorage | — | — | — | **Mock** | ✗ |
| Consent / activity | localStorage | — | — | — | **Mock** (by design) | ◐ |
| Outbox → Kafka | — | bus | OutboxRelay | event_outbox | **Real bus, no consumer** | ◐ |
---

## C. Mock / Demo / Hardcoded Inventory

| # | File/Line | Behavior | Should use | Sev | Fix |
|---|---|---|---|---|---|
| M1 | `src/data/index.ts` | static PROPERTY/OFFERS/EXTRAS/DEMO_RESERVATIONS | backend catalogs | High | migrate consumers then remove |
| M1a | `app/page.tsx:3,8` | fixture hero/property/FAQ | homepage/platform+hotelDetails | Med | wire |
| M1b | `app/hotel/page.tsx:91` | `HotelLegacyPage` fixture | backend | Med | wire |
| M1c | `app/index-2/page.tsx` | alternate landing fixture | backend | Low | delete/wire |
| M1d | `components/home/*` | fixtures | backend | Med | wire |
| M1e | `layout/*` | fixture nav | backend | Low | wire |
| M2 | `services/pricing.ts:5` `taxesRate=0.12` | local pricing engine, hardcoded 12% | server `quote` | **High (split-brain)** | delegate |
| M2a | `room/RoomDetails.tsx:270` | `compute()` local 12% | `getQuote` | High | switch |
| M2b | `search/SearchResults.tsx` | `validatePromo` client | `quote` | Med | switch |
| M2c | `PromoField.tsx` | `validatePromo` client | `quote` | Med | switch |
| M3 | `services/homepage.ts:36` | silent fallback | error/retry | Med | remove |
| M4 | `services/newsletter.ts` | localStorage mock | backend endpoint | High | add |
| M5 | `services/siteSearch.ts` | scans over fixtures | backend | Med | wire |
| M6 | `services/availability.ts` `demandFor` | `hash % 1000` | real demand | Med | replace |
| M7 | `services/catalog.ts:40` + `lib/format.ts` | hardcoded FX ratios | backend currency | Med | single source |
| M8 | `app/terms/page.tsx:38` | hardcodes "Taxes (12%)" | dynamic label | Low | fix |
| M9 | `app/booking/page.tsx` | "simulated" payment copy | payment status | Low | fix |
| M10 | backend `PaymentServiceImpl.java:124` | `MOCK-` provider capture | real PSP | High | integrate |
| M11 | backend `PricingServiceImpl` promos | `stay_x_pay_y` not implemented | support/remove | Med | fix |
| M12 | README vs `seed.sql:34` | password `password123` vs `admin123` | align | Low | fix docs |
| M13 | `architecture.md` / ADR-008 | claims modular monolith | — | **High** | rewrite layered (ADR-009) |
| M14 | `docs/api/frontend-contract.md` | "frontend runs on local mocks" | actual state | Med | refresh |

---

## D. Service inventory (top-level, layered)

**Auth** (real bcrypt+JWT+RBAC+rate-limit) · **Booking** (real server-priced, idempotent, inventory release) · **Inventory/Availability** (real sparse, pessimistic lock) · **Pricing** (real DB-driven; one unsupported promo variant) · **Payment** (real validation, mock gateway) · **Catalog / Rate / Review / Media / Notification / Platform / Homepage / Audit / Invoice / Reference** — all real · **OutboxRelay+Kafka** (real bus, no consumer).

Boundaries are appropriate for the codebase (thin controllers, domain logic in application services, repositories confined to services, enforced by ArchUnit). Largest architectural smell: the **two independent pricing engines** duplicating business rules.

---

## E. Domain/Data Model

Strong schema: 53 tables, FKs/CHECKs/partial-unique idempotency + gist price-range indexes + capacity triggers; Flyway + `ddl-auto: validate`. Gaps: no real PSP fields/webhooks; `check_ins` unused; no newsletter persistence wired; orphaned tables (`role_permissions`, `promotion_eligible_*`, `notification_templates`, `event_consumption`); currency/FX duplicated client-side.

---

## G. Critical Findings

**P0 — Blocking:** Mock payment capture (`PaymentServiceImpl:124`); check-in/check-out not implemented (`check_ins` empty).
**P1 — High:** Split-brain pricing (hardcoded 12% tax label); homepage silent fallback; architecture docs contradict code (ADR-008 vs layered ADR-009); Kafka zero consumers yet hard startup dep; guest newsletter fake.
**P2 — Medium:** no error UX on several backend flows (`.catch(()=>{})` → infinite skeleton); deprecated availability mutation used in admin; read-only list pages lack error cards; no password reset/logout.
**P3 — Low:** stale docs/passwords copy; unused `ConfirmDialog`, `textarea.tsx`, `SetRoomTypeMediaDocument`; dead `siteSearch` fixture path.

---

## Remediation Plan (ordered)

1. **Pricing unification** — one server `quote`, remove local engine, dynamic tax label.
2. **Check-in/out mutations** — enable flows + review proof-of-stay.
3. **Real payment gateway** — provider adapter behind existing port.
4. **Error UX** — replace silent fallbacks with error/retry.
5. **Docs vs code** — layered ADR-009; correct README/migration claims.
6. **Kafka consumer** — wire or remove hard startup dependency.
7. **Newsletter & remaining mocks.**
8. **Admin** — contiguous availability range editor; billing write actions.
9. **Tests for pricing parity.**
10. **Production hardening.**
