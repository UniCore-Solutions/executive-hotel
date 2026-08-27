# CURRENT_STATE

**Assessed:** 2026-08-27 · **Branch:** `main` · **HEAD:** `82c4414`
**Working tree:** ~66 modified files, ~2 266 insertions / 1 996 deletions **uncommitted**,
plus 11 untracked paths. Read §Stopping point before touching anything.

Verified against: source, `docker exec` into the live PostgreSQL, live GraphQL queries
against the running backend, the last `surefire-reports`, and freshly executed
`tsc --noEmit` + `vitest`.

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
- RBAC by role name with hotel scoping; IDOR guards inside every admin service.
- Catalog: hotels/room types/rooms/amenities/media/extras/FAQs/experiences/restaurants, search + sort.
- Pricing: DB-driven `quote` — nightly rates, extras (per-stay/night/guest), promos,
  taxes/fees by four calculation methods, totals identity.
- Booking: idempotent creation, server-side re-pricing, pessimistic inventory
  lock-and-sell, status history, cancellation with penalty evaluation + inventory release.
- Payments: real persistence, server-validated amount/currency/balance, overpayment
  rejected, owner-or-staff guard, provider-reference idempotency.
- Transactional outbox with claim/publish/settle phases and stale-claim recovery.
- Media upload/serve behind a storage port.
- Audit logging on every admin mutation.
- Uniform error envelope across REST, GraphQL and security filters.
- Homepage + platform CMS content served from the database.

**Back-office** — all 14 pages wired to real GraphQL through a BFF with httpOnly-cookie
auth. The most finished client in the repo.

**Guest frontend** — search, hotel/room detail (backend mode), quote, reservation
create/lookup/cancel, payment, confirmation, account bookings list.
> A second, frontend-only deep audit (2026-08-27) found these flows **reach the backend
> correctly but carry 4 P0 defects at the seams** — currency mis-denomination, orphaned
> bookings on payment decline, wrong-stay availability, and a broken post-payment
> handoff. See [FRONTEND.md](FRONTEND.md) for the full matrix and fix plan; do not treat
> "REAL" here as "correct".

**Database** — 54 tables, Flyway V1–V22 green, `ddl-auto: validate` in force.
Seed present: 3 hotels, 9 room types, 13 rooms, 6 rate plans, 18 prices, 12 extras,
12 reviews, 5 users, 28 amenities, 33 media, CMS blocks.

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
| **Eventing** | full outbox + Kafka producer | zero consumers; `event_consumption` unused |
| **Invoicing** | `issueInvoice` + admin listing | never exercised — `invoices` / `invoice_items` empty |
| **Notifications** | read API + tables | **no writer anywhere**; the back-office page will always be empty |
| **Guest session** | login/register work | token lives in a JS variable; reload logs the user out; `restoreSession()` never called |
| **Promotions** | percentage + fixed_amount | `stay_x_pay_y` throws `VALIDATION` |
| **RBAC** | roles + hotel scope | `permissions` / `role_permissions` empty; `Permission` entity has no repository and no usages |

---

## ⚠ Mocked / simulated / hardcoded

| Where | What |
|---|---|
| `PaymentServiceImpl.capture()` | no PSP — invents `MOCK-XXXXXXXX` and marks captured |
| `CheckinFlow.tsx` | `setTimeout(900)` then flips local state; comment: *"Backend has no check-in mutation"* |
| `services/newsletter.ts` | `localStorage`, returns "(double opt-in, mocked)" |
| `services/siteSearch.ts` | scans the static fixture — and is **unreferenced dead code**; no UI consumes it |
| `services/auth.ts` `reset()` | canned success, no request |
| `services/homepage.ts` | `catch { return EMPTY_HOMEPAGE }` — a backend outage is indistinguishable from normal content |
| `services/availability.ts` `demandFor` | deterministic `hash % 1000` pseudo-demand |
| `services/consent.ts`, `activity.ts` | `localStorage` — by design |
| `lib/qr.ts` | deterministic fake QR |
| FX rates | duplicated and inconsistent: `catalog.ts` reads `NEXT_PUBLIC_FX_*`; `lib/format.ts` **hardcodes** its own table and ignores the env vars. The backend converts nothing (FRONTEND.md F-2). |
| `app/booking/page.tsx` metadata | still advertises "secure (simulated) payment" |
| `data/index.ts:205` | FAQ answer states "In this prototype, payment is simulated" |

Email/SMS is not mocked — it **does not exist**. No `JavaMailSender`, no provider, no
SMTP config, no template rendering.

---

## ✗ Broken

1. **`./mvnw test` is RED.** `ModuleArchitectureTest` 2/5 failing:
   `StaySearchGraphQLController.staySearch()` calls `HotelRepository.findAllActive()` at
   `StaySearchGraphQLController.java:48`, violating both
   `REPOSITORIES_ARE_ONLY_ACCESSED_FROM_SERVICES` and `CONTROLLERS_DELEGATE_TO_SERVICES`.
   Verified still present in the current source.
2. **`backoffice-hotel` `npm run graphql:generate` cannot work.** `codegen.ts` points at
   `../backend-hotel/src/main/resources/graphql/schema.graphqls`, which is only the
   skeleton (`type Query` / `type Mutation` empty, scalars). The real schema lives in
   `graphql/<domain>/*.graphqls`. `frontend-hotel/codegen.ts` uses the correct glob.
3. **Back-office is off by default.** `profiles: ["backoffice"]` in `docker-compose.yml`
   (commit `1e52894`) — `docker compose up` never starts it, contradicting the README.

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

Two threads, in order:

**Thread A — pricing unification (committed, `82c4414`).** The guest frontend's second
pricing engine was removed. `services/pricing.ts` is now promo-validation only, hydrated
from the backend offer catalog; `RoomDetails.tsx` and `BookingFlow.tsx` call
`getQuote()`. **This closes findings M2/M2a/M2b of `CURRENT_STATE_AUDIT.md`, which was
written one commit earlier and is therefore already stale.**

**Thread B — "replace all mocks with real backend integration" (IN PROGRESS,
UNCOMMITTED).** `INTEGRATION_CHANGELOG.md` (untracked) declares Phases 1–5 complete:
auth, reservations, payment, the booking/confirmation/check-in/account flows, plus
deletion of `services/cancellation.ts` and rewritten tests. The working tree also
carries backend changes (room-type `slug`: `V22`, `RoomType`, `RoomTypeRepository`,
`CatalogQueryService`, `catalog.graphqls`), the EUR→MAD conversion (`V21`), and the
documentation correction (new `ADR-009`, `ADR-008` marked superseded, `architecture.md`
rewritten).

Its own "Files NOT Modified" list is the exact remaining scope: home page, room details
extras, search results, offers grid, promo field, header/footer/FAQ, and the
`src/data/index.ts` fixture itself.

**Nothing from Thread B is committed.** The last commit predates it.

Also stranded in the tree: `frontend-hotel/cloudflared-linux-amd64.deb` (a downloaded
installer, ~15 MB, untracked) and `backoffice-hotel/debug{2,3,4,5,6,-e2e}.mjs`.

---

## Highest-priority next work (evidence-based, ordered)

1. **Decide the fate of the uncommitted tree.** It is large, coherent, typechecks and
   passes 63 unit tests. Either commit it (after running `./mvnw test` for the backend
   half) or explicitly park it. Leaving ~2.2 k lines uncommitted is the single largest
   risk to every subsequent session.
2. **Fix the two ArchUnit failures.** Small, mechanical: move `findAllActive()` behind
   `CatalogQueryService` and inject that into `StaySearchGraphQLController` instead of
   `HotelRepository`. This turns the backend gate green and unblocks `make test`.
3. **Finish Thread B's remaining scope** — the fixture-backed marketing surface. Until
   this lands, the home page advertises a hotel the booking engine cannot sell.
4. **Fix `backoffice-hotel/codegen.ts`** to the same glob `frontend-hotel` uses.
5. **Resolve the Kafka dead end** — either add a consumer (notifications is the obvious
   candidate, and would give `NotificationQueryService` a writer) or drop the hard
   `depends_on` so the backend can boot without a broker.
6. **Implement check-in / check-out mutations.** They unblock the reservation lifecycle
   *and* the review proof-of-stay, which are both currently unreachable.
7. **Persist the guest session** (call `restoreSession`, or move to the httpOnly-cookie
   BFF pattern the back-office already proves out).
8. **Work the frontend P0s** — currency (`FRONTEND.md` F-2), booking/payment atomicity
   (F-1), wrong-stay availability (F-3), confirmation handoff (F-4). All four are small,
   frontend-only changes; F-2 is the one that writes wrong money to the database.
9. **Reconcile `AGENTS.md` in both sub-projects** — both describe structures that no
   longer exist. See [KNOWN_ISSUES.md](KNOWN_ISSUES.md) §Documentation.
