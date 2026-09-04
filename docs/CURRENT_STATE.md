# CURRENT_STATE

> ## Verified baseline — 2026-09-01, branch `refactor/architecture-cleanup`
>
> | | Result |
> |---|---|
> | Backend (`mvn test` in `maven:3.9-eclipse-temurin-21`) | **202 tests, 0 failures, 7/7 ArchUnit rules** |
> | Guest frontend | `tsc` clean · **0** eslint errors (1 warning, generated file) · **85/85** vitest · `next build` clean |
> | Live guest journey | search → quote → book → hold → pay → confirm → look up → cancel, **passing** both directly and through the BFF |
>
> **The numbers in the dated "Update" blocks below are historical** — each was true
> when written and is kept as a changelog. Do not read them as current state. For what
> is fixed, still open, and deliberately deferred, see
> [`investigations/PROJECT_CLEANUP_AUDIT_2026-08-31.md`](investigations/PROJECT_CLEANUP_AUDIT_2026-08-31.md)
> §0, which distinguishes verified-by-execution from asserted.
>
> **Known shape problem with this file:** it is a changelog wearing a state document's
> name. Restructuring it (current state at the top, history moved to a changelog) is
> logged as an open task, not done.

**Assessed:** 2026-08-27 · **Branch:** `feature/canonical-single-hotel`

> **Update 2026-08-31 (asynchronous booking/payment — closes F-1).** Full design in
> [`docs/investigations/BOOKING_PAYMENT_UX_PLAN_2026-08-31.md`](investigations/BOOKING_PAYMENT_UX_PLAN_2026-08-31.md),
> baselined on [`FULL_SYSTEM_AUDIT_2026-08-31.md`](investigations/FULL_SYSTEM_AUDIT_2026-08-31.md).
> The audit's headline finding — a reservation was `confirmed` and sold inventory before
> payment ran, with no compensation on failure/abandonment — is fixed:
> - **Backend (Flyway V31):** `BookingServiceImpl.create()` now assigns
>   `ReservationStatus.pending` with a `holdExpiresAt` TTL (`app.reservations.hold-minutes`,
>   default 15) instead of `confirmed` — activating a hold-expiry column that had existed
>   unused in the schema since V6. A new `ReservationHoldExpiryJob` (`@Scheduled`, styled on
>   `OutboxRelay`) releases expired holds through the existing cancellation/inventory-release
>   path. Payment settlement is now genuinely asynchronous: `createPayment` (provider
>   `"card"`) schedules a simulated provider callback 1.5–4s later
>   (`app.payments.simulated-settlement-delay-*-ms`) that resolves through a new,
>   idempotent `PaymentServiceImpl.processProviderEvent` — exercising `PaymentStatus.failed`
>   for the first time (previously declared, never assignable). A decline leaves the
>   reservation `pending` (room still held) so the guest can retry with a new payment
>   attempt rather than losing the booking or being double-charged. A shared-secret
>   `POST /api/v1/payments/{id}/webhook` and a staff-gated
>   `POST /api/v1/admin/payments/{id}/simulate-webhook` exist for manual QA of
>   success/decline/duplicate/late/unknown-payment/invalid-event/already-paid scenarios.
>   `GET /api/v1/payments/{id}` is a new narrow status read. **181/181 backend tests green**
>   (11 new, `PaymentSimulationIntegrationTest`), including live curl verification against
>   the running stack (create → pending hold → async capture → confirmed; decline → retry
>   same reservation → confirmed; timeout scenario genuinely never settles; webhook rejects
>   a missing/wrong secret).
> - **Frontend:** `BookingFlow.tsx` no longer calls `/capture` directly — it only starts the
>   payment attempt, then redirects immediately to `/confirmation?...&status=processing`.
>   A new `usePaymentStatus` hook polls the reservation's real status (`network-only`, 2s
>   interval, 120s/60-attempt ceiling — raised from the initial 30s/15 after
>   live testing) instead of the frontend ever assuming success.
>   `ConfirmationFlow` gained Processing/Timeout states and a Failed state with a "Try
>   another card" CTA to the new `/booking/retry` page (`RetryPaymentFlow.tsx`), which starts
>   a fresh payment attempt against the **same** still-held reservation. The reservation
>   idempotency key is now persisted to `sessionStorage` (keyed by room/plan/dates), closing
>   the reload gap where a page reload between reservation-create and payment-settle used to
>   mint a fresh key and sell a second unit of inventory. New `success`/`info` design tokens
>   replace ad hoc `emerald-*` classes on the success/checked-in states; the confirmation
>   page's timeline and stay-details cards were merged into one (fewer stacked white cards);
>   the payment form gained a lock icon + card-brand trust line and the price summary a real
>   skeleton loader instead of a "Calculating…" text line. Verified: `tsc`, `eslint`,
>   **73/73 vitest**, `next build` all clean; live-verified on the running stack
>   (`/confirmation`, `/booking/retry`, `/reservation` all 200; full images rebuilt and
>   redeployed).

> **Update 2026-08-28 (anonymous booking fixed end to end).** Accountless
> checkout was broken in two places and is now verified live through the BFF:
> - The `/api/rest` proxy doubled the API version prefix (`/api/rest/v1/reservations`
>   → backend `/api/v1/v1/reservations` → 401 "authentication required") and
>   dropped client headers (Idempotency-Key). It now strips the redundant `v1/`
>   and forwards the client's headers (auth is still injected server-side).
> - The backend filter chain required authentication for `/api/v1/payments` even
>   though `PaymentServiceImpl` documents the accountless guest-email proof path;
>   `SecurityConfig` now permits the payment endpoints (the service still enforces
>   owner-or-staff-or-guest-email, returning 401/403 itself).
> - Verified anonymously through `localhost:3000`: create reservation → 201 with a
>   silent `provisioned` passwordless account linked (V27), pay with guest email →
>   201, capture with guest email → captured, cancel → cancelled, idempotent replay
>   → same reference. New backend test `accountlessGuestCanPayWithGuestEmail`.

> **Update 2026-08-28 (hotel identity + gallery).** The single-hotel identity was
> split across two records — the platform brand ("Executive Hotel", header/footer)
> and the canonical hotel ("Azure Bay Resort", breadcrumb/H1/gallery). **V30
> unifies them**: the canonical hotel record (name/brand/slug), its media alt
> texts, the platform description and the hero block are all "Executive Hotel"
> now; seed.sql matches; the live DB is updated. Guest frontend: layout metadata +
> JSON-LD derive from the canonical hotel, Header/Footer brand comes from the
> hotel entity (no hardcoded fallback), and the hotel page gallery is a clean
> 1-large + 2-stacked section below the solid header (dark-theme overlap removed;
> mobile gets a snap carousel). Verified: typecheck/lint/build clean, 73/73
> vitest, live SSR checks on all routes.

> **Update 2026-08-28 (hotel→room→booking redesign).** Guest journey redesigned and
> data-plumbed end to end (details in docs/FRONTEND.md):
> - **`/booking` SSR crash fixed** — `useApollo()` threw during server render
>   (Apollo cache is browser-only) and `/booking` lacked the `<Suspense>` boundary the
>   other flows use; the page 500'd (the stale prod build surfaced it as a 404 page).
>   Fixed on both layers.
> - **Money:** `Quote.charges[]` (itemized tax/fee lines from `tax_fee_types`) exposed
>   in the schema and rendered; the client-side "Taxes & fees (17%)" percentage label
>   and the date-less "MAD 0" placeholder total are gone. The backend remains the only
>   price source.
> - **Reference data:** new `countries` GraphQL query (code+name+calling code,
>   `V28__country_calling_codes.sql`); searchable country combobox + rebuilt phone
>   field (E.164 output unchanged).
> - **Booking form:** arrival slot + special requests now persisted (`V29`) — they
>   were collected by the form and silently dropped by the API.
> - **Room identity:** `ReservationRoomLine.roomTypeName`/`roomTypeImageUrl` replace
>   the hardcoded "Room"/broken image in reservation/confirmation/check-in views.
> - **Room page:** dedicated room experience (hotel gallery/identity hidden when a
>   room is selected, room header, vertical essentials/good-to-know); hotel room-grid
>   cards carry the stay state and show per-night rates only (no local
>   price×nights total).
> - **Cleanup:** single FX table (`lib/format.ts`, env-driven), header/footer phone
>   from the hotel record, mock constants removed, `useApollo()` no longer throws.
> - Verified: guest `tsc`/`eslint`/`vitest` (73/73)/`next build` clean; all guest
>   routes live 200. **Backend fully verified too**: compiled + `./mvnw test`
>   **169/169 green** (all 6 ArchUnit rules) in a maven container; images rebuilt
>   (`./scripts/build.sh` + backoffice), stack restarted, V28/V29 applied to the live
>   DB. Live-verified end to end: `countries` query, `Quote.charges[]` (City tax 5% +
>   VAT 12%), `/booking` 200 on the deployed frontend, and a create→read→cancel
>   booking round-trip (arrival slot + special requests persisted, room identity +
>   itemized charges returned, inventory released on cancel).

> **Canonical single-hotel task (this session).** The platform was consolidated to
> exactly ONE active hotel (Executive Hotel, Lisbon) and inventory became
> physical-room-derived end to end. Everything below is re-verified against the live
> stack: backend on Flyway **V26** (152/152 tests green, all 5 ArchUnit rules), guest
> frontend typecheck/lint/build clean (72/72 vitest), back-office typecheck/lint/build
> clean. See [ARCHITECTURE.md](ARCHITECTURE.md) §8 for the business model.
> Sections of this file that describe pre-canonical multi-hotel state are marked.

> **Update 2026-08-28 (later) — GraphQL read consolidation (frontend-hotel).**
> Per the API audit, guest reads now flow through the Apollo cache:
> - `reservations.find/list` (lookup, my-bookings) execute via Apollo
>   `client.query` (cache-first; REST writes evict via `src/api/invalidation.ts`).
> - `getStayRoom`/`getStay` rebuilt on one `staySearch` round trip (room types +
>   availability + rates) instead of 5 separate queries; the runtime
>   string-built `StayBatch` aliasing query was deleted (single-hotel platform);
>   `RoomDetails` stay edits now refresh only the stay-variant data.
> - Shared `HotelSummary`/`RoomTypeSummary` fragments replace three duplicated
>   selections (codegen `fragmentMasking: false`).
> - Dead GraphQL surface removed: `HotelReviews`, `HotelExperiences`, `Hotels`
>   queries + services; `Homepage.featuredHotels` selection.
> - `PlatformBySlug` memoized per session (layout + home shared it as two
>   requests); promo hydration is now one cached offers request via the
>   canonical hotel (was hotels-list + per-hotel offers).
> - Result: home 7→6 (with platform dedup 7→5 fresh), hotel page 4–5→3, room
>   page 9→4 first load (staySearch + quote + extras + hydration), refreshStay
>   5→1. Guest: typecheck/lint clean, 73/73 vitest, build green.

> **Update 2026-08-28 — API architecture migration.** The whole platform now follows
> one rule — **GraphQL = READ, REST = WRITE/ACTION** (see
> [API_GUIDELINES.md](API_GUIDELINES.md)):
> - The GraphQL schema has **no Mutation root** (35 mutation fields deleted); the
>   ArchUnit rule `NO_GRAPHQL_MUTATIONS` bans them. All writes are REST under
>   `/api/v1/**`, including the new `/api/v1/admin/**` family (catalog/rate/
>   availability/promotions/users/reservations/reviews CRUD + profile).
> - Guest frontend: Apollo Client (browser reads) + Axios (writes via the new
>   `/api/rest/...` BFF proxy) + an invalidation registry; booking/payment/cancel
>   writes go over REST; de-mocked newsletter/contact/password-reset/check-in to
>   honest "unavailable" states; 73/73 vitest.
> - Back-office: reads migrated to Apollo Client, all 20 writes to Axios/REST
>   (TanStack Query keeps mutation lifecycle only), availability tab on the range
>   endpoint, real media file upload added; codegen fixed. 10/10 vitest.
> - Backend: **169/169 tests green** (was 152) including the new admin REST suite.

Verified against: source, `docker exec` into the live PostgreSQL, live GraphQL queries
against the running backend, the last `surefire-reports`, and freshly executed
`tsc --noEmit` + `vitest`.

**Update 2026-08-27 (later):** all 13 tasks of `docs/IMPLEMENTATION_PLAN.md` are now
code-complete, tested and deployed — currency correctness, booking/payment atomicity
(the approved subset), availability params, confirmation handoff, promo soft-failure,
hotel-details aggregation + a new `hotel_policies` model, extras fixture cleanup +
itemization, phone/country data + UI, auth/profile with httpOnly-cookie sessions, and
GraphQL error-code plumbing. Backend is on Flyway **V25** (144 tests, only the 2
pre-existing `ModuleArchitectureTest` failures). Frontend: `tsc`, `eslint`, `vitest`
(70/70) and `next build` all clean. Both containers rebuilt and redeployed with this
work. Most of the rest of this file (below) predates that work and describes the
pre-fix state — cross-check against `KNOWN_ISSUES.md`'s equivalent update note and the
source before trusting any "not yet implemented" claim in the sections that follow.

---

## Runtime right now

| Container | State |
|---|---|
| `hotel-backend` | **Up 18 h (healthy)** — `/actuator/health` → `UP` |
| `hotel-platform-postgres` | **Up 18 h (healthy)** — Flyway V1–V22 all `success=t` |
| `hotel-platform-kafka` | **Up 18 h (healthy)** |
| `hotel-frontend` | **Exited (143)** 17 h ago |
| `hotel-backoffice` | **Exited (143)** 20 h ago — also profile-gated off |

Toolchain note: **`mvn` is not on PATH** — use `./mvnw`. JDK 21 and Node 24 are present.

---

## ✅ Implemented and verified working

**Backend**
- Auth: register/login, bcrypt(12), HS256 JWT with fail-fast secret validation, rate limiting.
- **Google OAuth2/OIDC SSO (V38, 2026-09-04)**: a provider-agnostic `identity/` abstraction
  (`ExternalIdentityProvider`/`IdentityProviderRegistry`) with Google as its first
  implementation — `GoogleIdentityProvider` is absent from the registry (feature off) when
  `GOOGLE_CLIENT_ID` is blank. Backend-managed authorization-code flow with a single-use
  `state`/`nonce` (`oauth_states`) and a single-use post-callback login grant (`login_grants`)
  that hands off to the frontend's existing httpOnly-cookie session mechanism — the raw JWT
  never appears in a URL. Account linking (`user_external_identities`, unique on
  `(provider, provider_subject)`) auto-links to an existing account only when the provider
  itself reports the email as verified; new users are created `active` with no password.
  Full design, flow diagram and the account-linking table: `docs/AUTHENTICATION.md`. Verified:
  314/314 backend tests (up from 273), all 7 ArchUnit rules; guest frontend `tsc`/`eslint`
  clean, 130/130 vitest (up from 120), `next build` clean.
- **Mandatory OTP verification (V37)**: registration is blocking — `register()` sends a
  code and returns no session until `POST /api/v1/auth/register/verify` confirms it
  (account stays `pending_verification` until then); guest reservation lookup
  (no account) requires the same code-in-email proof before `verifiedReservation`
  reveals anything, replacing reference+email alone. See the 2026-09-03 OTP update
  below for the full design and a real transaction-rollback bug it caught.
- **Silent account provisioning (V27)**: accountless bookings create passwordless
  `provisioned` user accounts linked to the guest; registration with the same email
  completes the account (password set, status active) and pre-registration bookings appear
  under "My bookings" — closes F-13.
- RBAC by role name with hotel scoping; IDOR guards inside every admin service.
- **Canonical single hotel** (V26): exactly one active hotel; `canonicalHotel` query
  enforces it; non-canonical hotels and content deactivated; homepage featured queries
  scoped to active hotels.
- Catalog: hotels/room types/rooms/amenities/media/extras/FAQs/experiences/restaurants, search + sort.
- **Physical-room inventory**: `room_types.total_inventory` is trigger-derived from
  active rooms; availability = physical rooms − sold/ooo/blocked per night;
  `RoomAvailability.free` exposes remaining units; admin totalInventory writes are
  rejected with a clear message (manage rooms instead).
- Pricing: DB-driven `quote` — nightly rates, extras (per-stay/night/guest), promos,
  taxes/fees by four calculation methods, totals identity.
- Booking: idempotent creation, server-side re-pricing, pessimistic inventory
  lock-and-sell (one unit per room line per night, half-open date intervals),
  status history, cancellation with penalty evaluation + inventory release,
  overbooking blocked at the database.
- Payments: real persistence, server-validated amount/currency/balance, overpayment
  rejected, owner-or-staff guard, provider-reference idempotency.
- Transactional outbox with claim/publish/settle phases and stale-claim recovery.
- **Invoicing/refund documents (2026-09-03)**: invoices auto-issue on reservation
  confirmation, credit notes on cancellation (both idempotent, one per reservation) —
  and each now gets a real server-rendered PDF (Thymeleaf template → openhtmltopdf →
  local filesystem storage behind a `DocumentStorageProvider` port, same shape as
  media). Generated eagerly, best-effort, at issuance; regenerated on demand if the
  stored file is ever missing. Authenticated download:
  `POST /api/v1/reservations/{reference}/invoice/pdf` (+`/credit-note/pdf`, guest
  reference+email proof) and `GET /api/v1/admin/reservations/{id}/invoice/pdf`
  (+`/credit-note/pdf`, staff hotel-scoped). `invoices`/`credit_notes` are no longer
  empty tables.
- Media upload/serve behind a storage port.
- Audit logging on every admin mutation.
- Uniform error envelope across REST, GraphQL and security filters.
- Homepage + platform CMS content served from the database.

**Back-office** — all 14 pages wired to real GraphQL through a BFF with httpOnly-cookie
auth. The most finished client in the repo. Availability tab: inventory column is now
read-only (derived from physical rooms); staff manage out-of-order/blocked only.

**Guest frontend** — search, hotel/room detail (backend mode), quote, reservation
create/lookup/cancel, payment, confirmation, account bookings list — all real.
**Canonical single-hotel behavior:** no hotel picker anywhere (static hotel segment),
index page renders the canonical property entirely from the backend (no collection
section, no fixture fallbacks for facts/rooms/offers/reviews), `/hotel` without a
`hotelid` redirects to the canonical property, FAQ/offers pages backend-driven,
homepage service no longer swallows backend failures.

**Database** — 54 tables, Flyway V1–V26 green, `ddl-auto: validate` in force.
**Canonical single-hotel seed** (V26 + V30 + rewritten `scripts/seed.sql`): 1 active hotel
(Executive Hotel, Lisbon), 3 room types, 8 physical rooms, 2 rate plans, 6 prices,
1 promotion, 4 reviews, 12 media, CMS blocks. Inventory is trigger-derived from
physical rooms; no availability rows are pre-seeded (sparse model) and no reservations
are seeded — bookings are made live through the API.

**Tests that pass** — `frontend-hotel`: `tsc --noEmit` clean, **63/63 vitest green**
(run today). Backend: 13 of 15 test classes green including 26 database-integrity,
23 admin-GraphQL and 16 GraphQL-API integration tests on Testcontainers.

---

## ◐ Partially implemented

| Item | What exists | What is missing |
|---|---|---|
| **Guest content sourcing** | booking funnel is live; home renders backend `FeaturedRooms`/`FeaturedHotels` while the backend is healthy | legacy `/hotel`, `/index-2`, FAQ, offers, header/footer and the home hero facts still render `src/data/index.ts`. Legacy `/hotel` room links (`roomId=executive-suite` …) are **dead** — verified live. `/offers` advertises 5 promo codes that do not exist in the DB. |
| **Reviews** | create + moderate + list, proof-of-stay check | the check requires `checked_out`, which no code path can produce → guests can never review |
| **Reservation lifecycle** | `confirmed` and `cancelled` transitions | `pending`, `modified`, `checked_in`, `checked_out`, `no_show` are declared in the enum and never set |
| **Eventing** | full outbox + Kafka producer + a real consumer (`EmailEventConsumer`, since 2026-09-03) | only one consumer exists so far — nothing else reacts to the bus yet |
| **Notifications** | read API + tables + a real async writer (`NotificationServiceImpl`, via Kafka, since 2026-09-03) | delivery is `simulated` (logged, not sent) unless `EMAIL_PROVIDER=smtp` is configured with real SMTP credentials |
| **Promotions** | percentage + fixed_amount; `stay_x_pay_y` soft-fails (`Quote.valid:false` + message) instead of throwing — fixed 2026-08-27 (later) | `stay_x_pay_y`'s actual pricing logic is still unimplemented, only its failure mode changed |
| **RBAC** | roles + hotel scope | `permissions` / `role_permissions` empty; `Permission` entity has no repository and no usages |

---

## ⚠ Mocked / simulated / hardcoded

| Where | What |
|---|---|
| `PaymentServiceImpl.capture()` | no PSP — invents `MOCK-XXXXXXXX` and marks captured |
| `CheckinFlow.tsx` | `setTimeout(900)` then flips local state; comment: *"Backend has no check-in mutation"* |
| `services/newsletter.ts` | `localStorage`, returns "(double opt-in, mocked)" |
| `services/auth.ts` `reset()` | canned success, no request |
| `services/availability.ts` `demandFor` | deterministic `hash % 1000` pseudo-demand (display sort only — never availability) |
| `services/consent.ts`, `activity.ts` | `localStorage` — by design |
| `lib/qr.ts` | deterministic fake QR |
| FX rates | duplicated and inconsistent: `catalog.ts` reads `NEXT_PUBLIC_FX_*`; `lib/format.ts` **hardcodes** its own table and ignores the env vars. The backend converts nothing (FRONTEND.md F-2). |

None of these touch the canonical hotel / availability / reservation flow: a backend
failure there propagates (no mock fallbacks — `catalog.ts`, `canonicalHotel.ts`,
`homepage.ts` all throw).

Email is real and async (since 2026-09-03 — see the Update block near the top of this
file and `docs/ARCHITECTURE.md` §5a); `SimulatedEmailProvider` (the default) is the one
deliberately-mocked piece — it logs the rendered email and never delivers. SMS still
does not exist at all.

---

## ✗ Broken

1. ~~**`./mvnw test` is RED.**~~ **Fixed in this task**: `StaySearchGraphQLController`
   now resolves its hotel scope via `CatalogQueryService.canonicalHotel()`; all 5
   ArchUnit rules pass (152/152 tests).
2. **Back-office is off by default.** `profiles: ["backoffice"]` in `docker-compose.yml`
   (commit `1e52894`) — `docker compose up` never starts it, contradicting the README.
3. **Playwright e2e suite is stale** — targets the retired fixture world
   (`e2e/helpers.ts` fixture room ids, `index-2.spec.ts` for a deleted route). Not part
   of the build gates; needs a rewrite against the canonical flow.

---

## ❓ Unverified

- **Backend test suite has not been re-run at HEAD.** The results above come from
  `target/surefire-reports/` dated 2026-08-26 13:28; HEAD (`82c4414`) and the uncommitted
  tree are newer. A full `./mvnw test` needs Docker for Testcontainers.
- **Backoffice `tsc`/`vitest` not run this session.**
- **Playwright e2e not run** (needs the full stack up + installed browsers).
- **Whether the uncommitted working tree builds end-to-end.** Guest-frontend typecheck
  and unit tests pass; the backend portion (RoomType slug, `V22`, catalog changes) was
  not compiled.
- **`docs/api/frontend-contract.md` and `architecture.md`** have uncommitted edits whose
  accuracy was not audited line by line.
- Whether the `.opencode/` agent definitions in `backend-hotel/` and `frontend-hotel/`
  are still in use by anyone.

---

## 🛑 Where development stopped

**Canonical single-hotel task complete on `feature/canonical-single-hotel`**
(not merged). Everything described above is deployed to the live stack and verified.
Remaining known scope, in order:

1. **Check-in / check-out mutations.** They unblock the reservation lifecycle *and* the
   review proof-of-stay, which are both currently unreachable.
2. ~~Resolve the Kafka dead end~~ **Done (2026-09-03)** — `EmailEventConsumer` is a
   real consumer, and `NotificationQueryService` has a real writer. See the Update
   block near the top of this file and `docs/ARCHITECTURE.md` §5a.
3. **Rewrite the stale Playwright e2e suite** against the canonical single-hotel flow
   (search → availability → book → verify inventory → sell-out).
4. **Reconcile `AGENTS.md` in both sub-projects** — both describe structures that no
   longer exist. See [KNOWN_ISSUES.md](KNOWN_ISSUES.md) §Documentation.
5. **Newsletter/password-reset/contact remain local or canned.** An email provider now
   exists (item 2), and so does an OTP flow (see the 2026-09-03 OTP update below) —
   registration email-verification and guest reservation lookup both use it.
   Password-reset itself is still not wired to it: `services/auth.ts`'s `reset()`
   returns a canned "not available yet" message. Newsletter/contact were never about
   transactional email in the first place.

> **Update 2026-09-01 — new admin console (`admin-hotel/`), foundation + first three
> modules.** Per `docs/ADMIN_REBUILD_PROGRESS.md`: a new Next.js 16 admin console was
> scaffolded at the repo root (port 3102, `profiles: ["admin"]` in `docker-compose.yml`,
> additive-only), isolated from and leaving `backoffice-hotel` untouched. Shipped and
> live-verified against the running stack: auth (httpOnly `admin_session` cookie, distinct
> from the old admin's `bo_session`), route protection, a reusable data-table/form/toast
> architecture, Dashboard (only the metrics verified correct — `inHouseToday` deliberately
> omitted, see KNOWN_ISSUES §A4-derived dashboard defects), Reservations (list, detail,
> cancel), Room Types and Rooms (full CRUD, amenities, gallery). `tsc`, `eslint`, 8/8
> vitest and `next build` all clean. Also fixed here: the "`backoffice-hotel`
> `codegen.ts` cannot work" entry above was stale — the file already points at the
> correct glob — removed rather than re-flagged.
> **Superseded by the 2026-09-02 update below** — `profiles: ["admin"]` is gone and
> three more modules have since shipped.

> **Update 2026-09-01 (later) — multi-hotel routing + RBAC entry (`admin-hotel/`).**
> Routing migrated to `/hotels` (global list) + `/hotels/[hotelId]/...` (workspace
> segment), replacing the old single-hotel `HotelContext` singleton with a validating
> layout guard on the URL's `hotelId`. Login redesigned; a staff-only gate
> (`STAFF_ROLES`) replaced a weaker `roles.length === 0` check; a single-hotel staff
> account is now server-redirected straight into their hotel instead of seeing a global
> list; hotel-scoped nav is role-filtered (UX-only, not a security boundary — the real
> enforcement stays in `CurrentUserAccessor.requireHotelAccess`). Room and Room-Type
> create moved from full pages/dialogs to side drawers; Room Type edit gained a Rooms
> tab. `tsc`, `eslint`, 8/8 vitest, `next build` all clean; live-verified against the
> running backend including real `FORBIDDEN`/`NOT_FOUND` cases for cross-hotel and
> invalid `hotelId` access.

> **Update 2026-09-02 — Rate Plans & Pricing, Availability, Hotel Settings & Media,
> Guests & Payments (`admin-hotel/`); admin joins the default Docker stack.** Four
> modules built in parallel (one per module, each ground-truthing its backend shape
> against source and a live query before writing UI) and merged by hand:
> - **Rate Plans & Pricing** — list, editor (meal plan/payment timing/cancellation
>   policy/min-max stay/room-type link), range-based nightly pricing (the real schema is
>   inclusive date ranges, not per-day). "One rate plan per room type" is a UI/data
>   convention, not a DB constraint.
> - **Availability** — a 31-day calendar (today..+30, the real backend window) and a
>   block/out-of-order editor against a real, previously-undocumented REST endpoint
>   (`PUT /api/v1/admin/availability/hotels/{hotelId}`).
> - **Hotel Settings & Media** — Profile/Policies/Amenities/Media tabs. The Policies
>   write path — previously flagged unverified with 0 DB rows — was verified working
>   end to end (a real write produced real Postgres rows).
> - **Guests & Payments** — a searchable guest directory and a read-only payments list.
>   Corrected a stale claim that `Payment` has no reservation reference — it does
>   (`Payment.reservationId`, confirmed live via introspection).
>
> Along the way, three real cross-cutting bugs were found and fixed: `invalidation.ts`'s
> cache-eviction registry was a silent, app-wide no-op (PascalCase keys never matched
> real camelCase field names); the REST BFF proxy 500'd on every DELETE (a `204` response
> can't carry a body); and a CSP gap silently blocked every Unsplash-hosted image
> app-wide (including the pre-existing Room Type gallery).
>
> **`admin` is no longer profile-gated** — `docker compose up` now starts it
> automatically alongside `postgres`/`kafka`/`backend`/`frontend`, verified with a fresh
> `docker compose down && docker compose up -d` (no profile flags) bringing up all five
> healthy, plus a real login + GraphQL round-trip through the containerized app.
> `backoffice-hotel` keeps its separate profile gate, unchanged.
>
> Also fixed this session, unrelated to `admin-hotel`: a transitive `lodash` dependency
> (pulled in by `@graphql-codegen/cli`, dev-tooling only) carried two GHSA advisories;
> pinned via `package.json` overrides in both `admin-hotel` and `backoffice-hotel`, `npm
> audit` now clean in both. A letters-only-query bug in the guest site's
> `CountryCombobox` that silently returned every country unfiltered, fixed alongside
> removing "Western Sahara" as a selectable country (`V32`). A race condition in
> `BookingFlow.tsx` that flashed a false "Nothing to book yet" panel while the room/rate
> plan were still resolving asynchronously, fixed with a proper three-state model and a
> skeleton loader. Full detail, verification logs and backend-gap corrections in
> `docs/ADMIN_REBUILD_PROGRESS.md`.

> **Update 2026-09-02 (later) — Platform settings, Room/Room-Type merge, actionable
> check-in/check-out (`admin-hotel/`).** Three tasks built in parallel worktrees, hand-merged
> and re-verified as a whole (backend: **227/227 tests**, all 7 ArchUnit rules; `admin-hotel`
> build/tsc/eslint clean, 15/15 vitest). Full detail in `docs/ADMIN_REBUILD_PROGRESS.md`
> ("What's live right now" and the E-NAV-2/E-PLATFORM/E3-T04/E4-T02 entries):
> - **Check-in/check-out is now real**, closing half of this section's old #1 item below —
>   `BookingService.checkIn/checkOut/assignRoom` set the reservation's already-declared
>   `checked_in`/`checked_out` status (no migration needed; the enum values and
>   `reservation_rooms.room_id` column already existed, unused) via new admin REST
>   endpoints, gated on every room line having a physical room assigned first. This is a
>   **staff-driven admin action**, not a guest-facing or date-triggered flow — the review
>   proof-of-stay gate (`hasCompletedStayAt` checking `checked_out`) is consequently
>   reachable for the first time, but only when staff actually check a guest out through the
>   admin console.
> - **Platform brand settings**: the `Platform` entity (brand identity, already read-only via
>   the public `platform(slug)` query) had zero admin write path; now has one
>   (`AdminPlatformRestController`, `super_admin`-gated, audited), plus new
>   `contact_email`/`contact_phone` columns (`V34`) and a `/platform/settings` page.
> - **Room Types + Rooms merged** into one page (the standalone `/hotels/[hotelId]/rooms`
>   route is gone); room type edit gained Rate Plan (link/create) and room-type-scoped
>   Availability tabs.
> - Confirmed live during this work: room-type↔rate-plan linking is a genuine many-to-many
>   (`room_type_rate_plans`, unique on the pair) — "one rate plan per room type" was a prior
>   UI assumption, never a DB rule.

> **Update 2026-09-03 — server-side invoice/refund PDF generation.** The client-side
> "build HTML, let the browser Print-to-PDF" invoice/credit-note download
> (`lib/invoice.ts`, duplicated in `frontend-hotel` and `admin-hotel`) is replaced with
> real backend PDF generation:
> - **Backend**: `Invoice`/`CreditNote` gain `pdf_storage_key`/`pdf_generated_at`
>   (`V35`, no new status enum — a non-null key plus "does the file exist" is the whole
>   generation-state signal). A new `DocumentGenerationService`
>   (Thymeleaf → `openhtmltopdf-pdfbox` 1.1.73, XML template mode, a locked-down
>   `UriResolver` that refuses every external/`file:` fetch) renders
>   `templates/invoices/{payment-invoice,refund-invoice}.html` into PDF bytes and
>   stores them via a new `DocumentStorageProvider` port (same shape as
>   `MediaStorageProvider`, PDF-specific, `app.documents.storage-path`). Generation is
>   eager + best-effort at issuance (same call sites and try/catch idiom that already
>   issue the invoice/credit-note row) and idempotent/concurrency-safe on demand
>   (`@Lock(PESSIMISTIC_WRITE)` on the invoice/credit-note row, same idiom as
>   `ReservationRepository`'s inventory lock — reuses the stored PDF if the file is
>   still present, regenerates if the DB has a key but the file went missing).
>   **Deliberately no new Kafka consumer** — this repo has zero `@KafkaListener`s
>   (`booking.confirmed`/`payment.refunded` already fire but nothing reads them), and the
>   eager-inline + on-demand-regenerate combination already gives the same guarantees a
>   consumer would, without standing up the first retry/DLQ convention in the codebase
>   for a sub-second, dependency-free render. New download endpoints:
>   `POST /api/v1/reservations/{reference}/invoice/pdf` (+`/credit-note/pdf`, guest
>   reference+email, `permitAll` like their JSON siblings) and
>   `GET /api/v1/admin/reservations/{id}/invoice/pdf` (+`/credit-note/pdf`, staff,
>   `requireHotelAccess` inside the service — verified by the
>   `ADMIN_SERVICES_ENFORCE_AUTHORIZATION` ArchUnit rule same as every other admin path).
> - **Frontend**: `lib/invoice.ts` deleted from `frontend-hotel` and `admin-hotel` (not
>   `backoffice-hotel` — legacy, left untouched); the three call sites
>   (`ConfirmationFlow.tsx`, `ReservationFlow.tsx`, `ReservationDetailSheet.tsx`) now
>   request the PDF (`responseType: 'arraybuffer'`) and blob-download the real bytes via
>   a small shared `lib/download.ts` helper. Both apps' `/api/rest` BFF proxies were
>   fixed to stop reading every backend response with `res.text()` — that silently
>   corrupted binary bodies; non-text responses now pass through as an `ArrayBuffer`.
> - Verified: **240/240 backend tests, all 7 ArchUnit rules** (Testcontainers, Maven
>   container); both frontends `tsc`/`eslint` clean, `frontend-hotel` 120/120 vitest,
>   `admin-hotel` 279/279 vitest. New integration coverage: eager generation, on-demand
>   generate-or-reuse, regeneration after the stored file is deleted, guest wrong-email
>   rejection, staff cross-hotel rejection (403), credit-note-not-yet-issued (404).

> **Update 2026-09-03 (later) — event-driven email notification system (Kafka).** The
> synchronous email path the previous update quietly introduced (`NotificationService`
> calling `EmailProvider` directly, in-transaction, from `BookingServiceImpl`) is
> replaced with the fully async, provider-agnostic architecture requested: business
> services publish facts to the existing transactional outbox; a new
> `EmailEventConsumer` (**the first `@KafkaListener` in this codebase** — closes A2/A3)
> reacts and drives email delivery entirely outside any business transaction. Full
> design in `docs/ARCHITECTURE.md` §5a.
> - **Reused, not rebuilt:** the outbox/Kafka producer pipeline (`EventOutbox`,
>   `OutboxEventPublisher`, `OutboxRelay`, `KafkaOutboxPublisher`, topic convention
>   `hotelcollection.<type>.v<n>`) — all pre-existing and untouched. The
>   previously-unused `event_consumption` table (schema since V8) is now the
>   idempotency ledger. `EmailProvider`/`SimulatedEmailProvider`/`NotificationService`/
>   `Notification` (added in a prior session, `c3f4b5b`) are kept and extended, not
>   replaced — same entity, same table, same "log-only by default" provider posture.
> - **New events:** `user.registered` (`AuthServiceImpl#register`, platform-wide,
>   `hotelId=null`). **Fixed a gap** in existing events: `booking.confirmed` previously
>   only published from the payment-capture path (`markFullyPaid`) — a pay-at-property
>   reservation, confirmed immediately at creation, fired no such event at all.
>   Centralizing the publish inside `BookingServiceImpl#onReservationConfirmed` (called
>   from both paths) closes that gap for free.
> - **Provider abstraction:** `EmailProvider` (`to/subject/htmlBody/attachments` +
>   `ProviderType`) → `EmailProviderFactory`/`EmailProviderFactoryImpl` (fails fast at
>   startup if `app.email.provider` names a type with no registered bean) →
>   `SimulatedEmailProvider` (default, logs only) or `SmtpEmailProvider` (new — generic
>   `JavaMailSender`-based SMTP adapter; Gmail is a configuration value
>   `MAIL_HOST=smtp.gmail.com` + an app password, never a code dependency). Adding
>   SendGrid/SES/Mailgun later is one more `EmailProvider` implementation + enum value —
>   no business service, consumer or template changes, verified by a dedicated
>   provider-switching unit test (`EmailProviderFactoryImplTest`).
> - **Email types:** welcome (`user.registered`), booking confirmation + invoice (both
>   from `booking.confirmed`, tracked/retried independently), cancellation
>   (`booking.cancelled`), refund (`payment.refunded`), payment-failed
>   (`payment.failed`, judged a useful addition beyond the mandatory list — lets a
>   guest whose card declined know their room hold is still open). Invoice/credit-note
>   PDFs are attached via two new narrow `InvoiceService` entry points
>   (`getInvoicePdfForNotification`/`getCreditNotePdfForNotification`) that reuse the
>   existing idempotent generate-or-reuse logic — **never regenerated inside the email
>   path**. No OTP email: no OTP/email-verification flow exists anywhere in this
>   codebase to deliver one for (see `NotificationService`'s class comment) — building
>   that generation/validation/rate-limiting logic is a distinct authentication feature,
>   out of scope here.
> - **Idempotency/retry/DLQ:** `event_consumption` keyed per email type (e.g.
>   `"email:booking_confirmation"`, `"email:invoice"`) so one event's several emails
>   dedupe and retry independently; checked before work, recorded after a successful
>   send. `KafkaConsumerConfig` (new) retries a transport failure with exponential
>   backoff (~15s total) then routes to `<topic>.DLT`; a `DomainException` (deterministic
>   business outcome) skips straight to the DLT.
> - **6 Thymeleaf templates** (`templates/email/*.html`, XML mode like the existing
>   invoice templates) — separate from `NotificationServiceImpl`'s Java, auto-escaped.
> - **Migration V36**: `notifications.event_id`/`correlation_id` (nullable,
>   observability only — idempotency itself is `event_consumption`, not this).
> - **Frontend:** no changes — there was never any client-side email sending to remove.
> - Verified: **250/250 backend tests (was 240), all 7 ArchUnit rules** (Testcontainers,
>   Maven container — real Postgres + real Kafka, no mocks). New coverage: provider
>   switching (unit), welcome/confirmation/invoice/cancellation/refund/payment-failed
>   happy paths end to end through the real outbox→Kafka→consumer pipeline, and a
>   duplicate-delivery idempotency test (replays a real processed envelope directly into
>   the consumer, asserts exactly one `notifications` row and one `event_consumption`
>   record). KNOWN_ISSUES A2/A3 deleted as resolved.

> **Update 2026-09-03 (later still) — premium email templates, theme system, and a
> transaction bug found live.** The 6 wired emails (welcome, booking confirmation,
> invoice, cancellation, refund, payment-failed) plus a 7th design-only one (OTP) were
> redesigned from plain text-in-a-`<div>` markup to a proper branded HTML email system,
> and one real bug in the previous update surfaced and was fixed along the way.
> - **Theme + data, not loose variables.** Every template now receives exactly two
>   Thymeleaf variables — `theme` (`dto/email/EmailTheme`: colors/fonts fixed to
>   `frontend-hotel`'s actual navy/gold/paper palette, `src/app/globals.css`'s `@theme`
>   block, so the emails read as the same product as the guest site; hotel
>   name/logo/address/phone/email are real data) and `data` (a per-email
>   `*EmailData` record — `WelcomeEmailData`, `BookingConfirmationEmailData`,
>   `InvoiceEmailData`, `CancellationEmailData`, `RefundEmailData`,
>   `PaymentFailedEmailData`, `OtpEmailData` — already-formatted content, the same
>   "authoritative data in, presentation-only template out" split
>   `DocumentGenerationServiceImpl`/`InvoiceDocumentData` already uses for invoice PDFs).
> - **Shared layout**: `templates/email/fragments/layout.html` (header/footer/button
>   Thymeleaf fragments) gives all 7 templates one visual identity from one file.
>   Markup is table-based with inline styles throughout (not the app's Tailwind
>   classes — email clients, Outlook desktop especially, don't run a CSS framework);
>   one `@media (max-width:620px)` block per template is progressive enhancement only.
> - **Logo**: resolved via new `MediaRepository` queries
>   (`findByHotelIdAndCategory`/`findByPlatformIdAndCategory`, `category='logo'`) —
>   hotel-scoped first, then platform-scoped (matches the actual seed data, where the
>   logo is a platform-level asset), then a graceful text-only header when neither
>   exists. The seeded logo URL (`https://example.com/logo.png`) is a fixture
>   placeholder that won't actually resolve — a real deployment would seed a real one;
>   the header degrades to text if the image 404s, by design.
> - **A real bug found live, not just in tests**: the welcome email's theme resolution
>   originally tried `catalog.canonicalHotel()` (for nicer real-hotel branding) wrapped
>   in try/catch, reasoning a caught exception would be harmless. It wasn't —
>   `canonicalHotel()` is `@Transactional` and joins the caller's transaction; when it
>   throws, Spring marks that transaction rollback-only at the AOP boundary *before* the
>   exception reaches any try/catch in the caller. `sendWelcomeEmail` then appeared to
>   return normally but failed at commit with `UnexpectedRollbackException`, which the
>   Kafka consumer correctly treated as a retryable transport failure — so it retried
>   uselessly and no welcome email ever sent. Caught by live testing (a real
>   `POST /api/v1/auth/register` against the rebuilt stack produced no email), not by
>   the test suite alone, though the suite reproduced it once pointed at it
>   (`EmailNotificationIntegrationTest.welcomeEmailSendsOnRegistration`, flaky —
>   depended on how many other hotels earlier tests in the class had already created).
>   Fixed by not routing a platform-wide email through a call that can poison the
>   transaction: welcome now resolves a static `EmailTheme.forPlatform(...)` outright,
>   which is also the architecturally correct choice for an email with no `hotelId`.
> - **Preview/testing**: `EmailTemplatePreviewTest` renders all 7 templates with
>   realistic + edge-case data (long/injected names, missing optional fields, different
>   currencies) via a bare `SpringTemplateEngine` (no Spring context, no send — same
>   posture `DocumentGenerationServiceImplTest` already takes) to
>   `target/email-previews/*.html`; a generated preview gallery was also published as a
>   Claude Artifact for visual QA (session-local, not part of the repo).
> - **Verified live** on the rebuilt Docker stack, real Gmail SMTP, full guest journey:
>   register → book → pay/capture → cancel produced all 5 triggered emails (welcome,
>   confirmation, invoice-with-PDF, cancellation, refund), each `sent`/`smtp` with no
>   errors in `notifications`, no duplicate `event_consumption` rows, and a clean
>   backend log (no warnings/errors, no leaked SMTP credentials or protocol transcript —
>   `mail.debug` is not enabled).
> - Verified: **264/264 backend tests (was 250), all 7 ArchUnit rules** (Testcontainers,
>   Maven container).

> **Update 2026-09-03 (later still) — mandatory OTP verification: registration
> (blocking) and guest reservation lookup (replaces reference+email alone).** The
> "OTP" template from the previous update was design-only until now; both real flows
> are built end to end and live-verified. Two decisions were made explicitly by the
> user before implementation: registration is **blocking** (no session until the code
> is confirmed — closes item 5's "email-verification needs a token/OTP flow that does
> not exist yet" below) and reservation lookup **replaces** reference+email as proof,
> rather than layering on top of it.
> - **Backend (Flyway V37, `otp_codes`)**: a purpose-scoped (`registration_verification`
>   · `reservation_lookup`), SHA-256-hashed OTP table (`OtpService`/`OtpServiceImpl`) —
>   `issue`/`verify`/`isGrantValid`, anti-enumeration (identical response whether or not
>   the target matches anything), a resend cooldown, and a per-code max-attempts lockout.
>   `AuthServiceImpl.register()` now returns `RegistrationPendingResult` (202, no
>   session) and sets `users.status = 'pending_verification'`; a new
>   `POST /api/v1/auth/register/verify` confirms the code, flips the account `active`,
>   sets `email_verified_at`, and **only then** publishes `user.registered` (the welcome
>   email fires on real verification, not on the initial request).
>   `POST /api/v1/auth/register/resend` re-issues silently. Reservation lookup gained a
>   parallel `verifiedReservation` GraphQL query + REST `POST
>   .../lookup/otp` / `.../lookup/otp/verify` pair; the existing `reservation(reference,
>   email)` query and `getByReferenceAndEmail` are deliberately untouched — they still
>   back the same-session payment-status poller and cancellation, which must not be
>   OTP-gated.
> - **A real, security-critical bug found via the test suite, not by inspection**:
>   `OtpService.verify()`'s wrong-code path saves an incremented `attempts` count, then
>   throws — `@Transactional(noRollbackFor = DomainException.class)` alone stopped
>   *its own* rollback, but every real caller (`AuthServiceImpl#verifyRegistration`,
>   `BookingServiceImpl`'s lookup verify) is itself `@Transactional` with the *default*
>   rollback rule and no `noRollbackFor` of its own — with the default `REQUIRED`
>   propagation, the caller's own rollback-on-exception undid the save anyway the
>   moment the exception reached its boundary, so the attempt counter could never
>   actually reach the lockout threshold (unlimited brute-force guessing against any
>   code). Fixed by making `verify()` run in its own transaction
>   (`propagation = Propagation.REQUIRES_NEW`) — the attempt count and the verified
>   marker now commit unconditionally, independent of what the caller does with the
>   exception afterward. Caught by `OtpVerificationIntegrationTest
>   .tooManyWrongAttemptsLocksOutTheCurrentCode`, which failed with "expected: CONFLICT
>   but was: VALIDATION" on the 6th attempt even after the first (insufficient) fix.
> - **Frontend**: `AccountFlow.tsx`'s register tab gained an OTP-entry step (code input,
>   verify, resend, "use a different email"); `SessionContext`'s `register()` no longer
>   establishes a session — `verifyRegistration()`/`resendRegistrationOtp()` do.
>   `ReservationFlow.tsx`'s self-service lookup is now a two-step
>   `lookup → otp → view` (was a single-step read); the deep-link "Manage booking" path
>   still auto-fills reference/email but now also auto-requests the code rather than
>   reading directly. New BFF routes `POST /api/auth/register/verify` (sets the session
>   cookie — this is the step that actually signs the guest in, `register` itself no
>   longer does) and `POST /api/auth/register/resend`.
> - **Verified live** on the rebuilt Docker stack, real Gmail SMTP, real HTTP (no
>   backend-code shortcuts — codes were recovered by matching each OTP row's stored
>   SHA-256 hash against a local brute force, the same proof-of-correctness technique
>   `OtpService.issue()`'s test-only plaintext return uses, applied against the live
>   database instead): register → 202 pending → wrong code → 400 with `attempts`
>   persisted in Postgres → correct code → 200 with a working token → `me` query
>   succeeds → `user.registered` published only now → welcome email `sent`. Reservation
>   lookup: request → 202 → wrong code → 400 with `attempts` persisted → correct code →
>   `lookupToken` → `verifiedReservation` returns the real reservation; the unrelated
>   `reservation(reference, email)` query still resolves directly (poller unaffected);
>   the grant correctly rejects when replayed against a different reservation reference.
> - Verified: **273/273 backend tests (was 264), all 7 ArchUnit rules** (Testcontainers,
>   Maven container). Guest frontend: `tsc` clean, 0 eslint errors, **120/120 vitest**
>   (was 85/85).

> **Update 2026-09-04 — Hotel Management & Platform Settings redesign, 8 workstreams
> (`admin-hotel/`).** Full detail in `docs/ADMIN_REBUILD_PROGRESS.md`'s "Epic E-REDESIGN"
> section; summary here per this file's own scope. `backoffice-hotel` untouched
> throughout (retired console, per standing guidance).
> - **IA**: Reviews is now its own top-level hotel-workspace nav group (was nested under
>   "Configuration" with Settings — the exact anti-pattern the task flagged).
> - **Branding, real for the first time**: the hotel/platform logo was an anonymous
>   gallery photo (`Media.category` set nowhere, read nowhere admin-side) — now a
>   governed, single-owner concept. Uploading `category="logo"` replaces any existing one
>   for that owner; a DB partial-unique-index (`V39`) backs it for the concurrent-upload
>   race; the gallery's replace-all write can neither drop nor duplicate the logo no
>   matter what it submits (`MediaAdminServiceImpl`, live-verified). New dedicated
>   Branding tabs on both Hotel Settings and Platform Settings.
> - **Hotel Profile**: `Hotel` gained `website`/`timezone`/`languages` (`V40`, the first
>   native-array-typed column in this codebase) — genuinely missing, not invented; no
>   "official name" field added (`name`+`brand` already cover it). Settings page
>   reorganized into General/Contact/Location/Localization/Operational sections; country
>   and timezone are now real-reference-data-backed autocomplete instead of free text.
> - **Amenities**: gained `is_active` (`V41`) and a real management surface — new
>   `AmenityAdminService` (create/edit/activate-deactivate, `super_admin`-gated), a new
>   global `/amenities` page, and category-grouped hotel/room-type pickers (was one flat
>   list with a text hint).
> - **Seasons — new module.** Did not exist in any form before (confirmed by a full-repo
>   grep). New hotel-scoped `seasons` table (`V42`) with a real DB overlap constraint
>   (`EXCLUDE USING gist`, gated `WHERE (is_active)` so deactivating frees the dates) —
>   the same technique `rate_plan_prices` already proved, applied to a genuinely new
>   entity. Calendar/definition only, deliberately **not** wired into rate-plan pricing.
>   New `/hotels/{id}/seasons` page.
> - **Room Types & Rooms**: a room type could only ever grow one room at a time before —
>   new `POST .../room-types/{id}/rooms/bulk` (pattern generator or manual list,
>   all-or-nothing, zero partial inserts on any collision), reachable from the Room Type
>   edit page and as an optional second step right after creating a room type.
> - Verified across all 8 workstreams: **backend ended at 322/322 tests, all 7 ArchUnit
>   rules** (one transient memory-pressure test-context flake mid-session, confirmed
>   resolved on immediate re-run, not a regression); `admin-hotel` `tsc`/`eslint` clean
>   throughout, ended at **304/304 vitest**, `next build` clean (3 new routes:
>   `/amenities`, `/hotels/[hotelId]/seasons`, plus the existing settings routes
>   redesigned in place). Every workstream live-verified against the real running stack
>   through the actual admin BFF, not just tests — all test data cleaned up afterward,
>   canonical hotel/platform demo content restored where a live test necessarily touched
>   it (one disclosed caveat: two `hotel_policies` rows' exact original wording could not
>   be recovered since it wasn't captured before an overwrite — see the Policies
>   workstream detail in ADMIN_REBUILD_PROGRESS.md for what happened and why it's
>   low-consequence).
