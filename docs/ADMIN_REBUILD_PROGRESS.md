# ADMIN_REBUILD_PROGRESS

> Progress tracker for the new `admin-hotel/` console (Phase 2 of the plan approved
> against [the investigation report](https://claude.ai/code/artifact/9ebec2c4-1366-4ab4-9efc-84502aad27c9)).
> This file is the authoritative live record — update it after every task, in the same
> change, per CLAUDE.md's "Keeping this current".

## Status

| | |
|---|---|
| **Phase** | 2.2 (Inventory) complete; 2.3 (Dashboard) complete; **E-NAV-1, E-ROLES-1, E5 (Rate plans & Availability & Promotions), E6 (Settings & Media), E7 (Guests & Payments), E-NAV-2, E-PLATFORM, E3-T04, E4-T02, and E8/most-of-E9 (Users & Roles, Audit Log, Reviews moderation, Invoices) all complete**; **E-REDESIGN (Hotel Management & Platform Settings redesign) started — see "Epic E-REDESIGN" below** |
| **Current module** | E-REDESIGN, a 9-workstream sequential redesign of Hotel Management/Platform Settings — **all 9 workstreams complete** (approved plan, full detail in the epic section below). |
| **Last completed** | Promotions (E5-T06); Users & Roles, Audit Log, Reviews moderation (E8); Invoices (E9) — see "Epic E8 — Users, Audit, Reviews" and "Epic E9 — Invoices" below for full detail |
| **Next READY task** | The three backend-blocked E9 modules: Extras admin write (needs a new `ExtrasAdminService`/REST controller — J-2), Content/CMS (needs new admin write endpoints for `HeroBlock`/`PlatformContentBlock`/`FeaturedExperiencesBlock` — `PlatformAdminServiceImpl` today only covers brand/media, confirmed by reading it), Reports (nothing beyond the existing `AdminDashboardService` aggregation exists) |
| **Verified against** | Live stack; merged result re-verified as a whole (not just each agent's isolated worktree run): `admin-hotel` `tsc` clean, `eslint` 0 errors (1 pre-existing benign warning), **303/303 vitest**, `npm run build` clean (24 routes, 5 new: `/audit`, `/users`, `/hotels/[hotelId]/{promotions,reviews,invoices}`), plus live GraphQL/REST round-trips through the merged app's own BFF on a throwaway dev server against every new query (`adminUsers`, `adminAuditLogs`, `adminPromotions`, `adminReviews`, `adminInvoices` — the last confirmed against the correct canonical hotel id after an initial query happened to hit an inactive hotel with zero invoices), 2026-09-04 |

**Outstanding follow-up**: GitHub Dependabot flagged 2 lodash advisories (high +
moderate) in both `admin-hotel` and `backoffice-hotel`, caused by `@graphql-codegen/cli`
pulling in `lodash@4.17.23` transitively (dev-tooling only, not shipped to users). Fixed
via a `lodash` override to `^4.18.1` in both apps' `package.json` (commit `c3257e6`);
`npm audit` now shows 0 vulnerabilities locally in both. **Not yet confirmed against the
actual GitHub Security tab** — needs a human check at
https://github.com/UniCore-Solutions/executive-hotel/security/dependabot once GitHub
re-scans the updated lockfiles (no `gh`/API token available in this environment to check
it directly).

## Summary

- **20 tasks defined** across E1–E4 (Foundation, Reservations, Inventory, Dashboard) — all
  COMPLETED.
- **New Epic E-NAV** (multi-hotel-ready admin shell) added this session, approved plan at
  [this investigation](https://claude.ai/code/artifact/9ebec2c4-1366-4ab4-9efc-84502aad27c9)
  — see "Multi-hotel navigation" below. E-NAV-1 COMPLETED; E-NAV-2 through E-NAV-4 not
  started.
- **E5 (Rate Plans & Pricing, Availability), E6 (Hotel Settings, Media), E7 (Guests,
  Payments) COMPLETED** in a later session (2026-09-02), one agent per module in a
  parallel git worktree off `339e069`, then hand-merged and re-verified as a whole (shared
  files — `nav-items.ts`, `invalidation.ts`, the hotel workspace `layout.tsx`, the REST
  BFF proxy, `next.config.ts` — were touched by more than one agent; see "Verification
  log" for the merge and re-verification). Promotions (part of E5) and E8/E9 remain not
  started — see below.
- Epics E8–E9 (Users/Audit/Reviews, and the fully backend-blocked modules: Front desk,
  Extras, Content, Invoices, Reports) are in the approved plan but **not started** — see
  the investigation report §S for their task breakdowns.
- **E-NAV-2, a new E-PLATFORM epic, E3-T04, and E4-T02 all COMPLETED** (2026-09-02, later
  session), three agents in parallel worktrees off `d9e4204`, hand-merged:
  - **E-NAV-2 — Hotels list.** `/hotels` gained a "New hotel" create flow (drawer, reusing
    the existing `HotelProfileForm`) against the already-existing
    `POST /api/v1/admin/hotels`, plus client-side sort (name/city/status/room-type-count/
    active-reservations) next to the existing search. Still no server-side filter/sort args
    on `adminHotels` (`NEW-3` still open) — fine at the platform's current ~3-4 hotel scale.
  - **E-PLATFORM (new epic) — Platform brand settings.** The `Platform` entity (brand/tenant
    identity, one row, already read via the public `platform(slug)` query used by the guest
    site) had **zero admin write path** — closed that gap: Flyway `V34` adds nullable
    `contact_email`/`contact_phone`; new `AdminPlatformRestController`
    (`PUT /api/v1/admin/platform/{id}`, `PUT /api/v1/admin/platform/{id}/media`),
    `super_admin`-gated, audited (`platform.updated`, `platform.media.updated`); new global
    `/platform/settings` page (Brand/Contact/Media tabs), `super_admin`-only nav entry.
    Confirmed live: the generic media-upload endpoint already accepts `ownerType=platform`
    directly, no J-6-style workaround needed.
  - **E3-T04 — Room Types + Rooms merged into one page.** The standalone `/rooms` route is
    gone; its cross-type "all rooms" view is now a tab toggle on `/room-types`
    (`By type` / `All rooms`), reusing the same `RoomFormSheet`/columns as before. Room type
    edit gained two tabs: **Rate Plan** (list this type's linked plans; link an existing
    unlinked hotel rate plan or create-and-auto-link a new one via the existing
    `room-type-rate-plans` link/unlink REST endpoints — confirmed live this is a genuine
    many-to-many, not "one rate plan per room type" as a DB rule) and **Availability**
    (the hotel-wide availability calendar, client-side-filtered to this one room type — the
    GraphQL rows already carry `roomTypeId` per day, so no new query was needed).
  - **E4-T02 — Actionable, role-aware Dashboard.** Closes part of the "Where development
    stopped" #1 item below: new `BookingService.assignRoom/checkIn/checkOut` (no migration
    needed — `reservation_rooms.room_id` and the `checked_in`/`checked_out` enum values
    already existed, unused), new REST endpoints
    (`POST .../rooms/{roomLineId}/assign-room`, `.../check-in`, `.../check-out`,
    `GET /admin/room-types/{id}/rooms/eligible`), new `arrivalsTodayList`/
    `departuresTodayList` on the `adminDashboard` GraphQL query. Dashboard's Arrivals/
    Departures are now real actionable lists (assign a room, check in/out — blocked until
    every room line has an assignment) instead of bare counts; `inHouseToday` is finally
    rendered (was fetched, silently dropped since E4-T01). Dashboard sections are now
    role-aware (front-desk roles get ops front-and-center with full actions; finance/revenue
    roles get pending-payments/revenue first and read-only ops visibility; `content_manager`
    gets a reduced view) — same UX-only `roles?`/`visibleTo()` convention as the nav, now
    exported from `nav-items.ts` for reuse. 6 new backend tests (assign-room conflict
    detection via a real double-booking 409, check-in gated on every line being assigned,
    audit rows written, dashboard lists returning real data).
  - Merged total: **227/227 backend tests** (218 baseline + 6 + 3, confirming nothing was
    lost or duplicated in the merge), all 7 ArchUnit rules; `admin-hotel` build clean (19
    routes), `tsc`/`eslint` clean, 15/15 vitest. See "Verification log" for detail.
- **Search + sort added to every admin table** (2026-09-02, later same session). Room Types,
  "All rooms" (both the merged list and the Rooms tab on a room type), and Rate Plans are
  client-side (the underlying queries already fetch the full unpaginated set, so this is
  honest — same reasoning as the Hotels list). Reservations, Guests and Payments are real
  server-side search/sort — closing the search half of **J-1** (`adminReservations` had no
  search args) and the "no search, schema has none" gap on Payments (search is a nested
  subquery through `Reservation`/`Guest` — `Payment` has no direct guest relation). Guests'
  sort is deliberately limited to `firstName`/`lastName`/`email` — `reservationsCount`/
  `totalSpent`/`lastStayDate` on `AdminGuestView` are computed in memory from a second
  per-page query, so sorting by them would only be correct within one page (silently
  misleading), and were left out rather than faked. Every sort field is server-side
  whitelisted before it reaches a JPQL `order by`. 1 new backend test
  (`adminReservationsGuestsPaymentsSearchAndSort`, 227→228) exercising real search-narrows-
  results and real sort-reorders-results (not just "doesn't error") across all three, plus
  an unrecognized-sort-field-falls-back-to-default case.

## Multi-hotel navigation (E-NAV)

The admin was rebuilt flat/single-hotel (see the superseded decision below). This session
re-scoped it to be **multi-hotel-ready in navigation and routing**, while the platform's
data stays single-hotel for now (canonical model, V26+V30) — no backend or DB change, no
guest-site change. Plan phases (see the investigation artifact linked above for the full
10-part plan the user approved):

1. **Routing migration** (E-NAV-1, COMPLETED this session) — `/hotels` list +
   `/hotels/[hotelId]/...` workspace segment; moved the 5 existing pages under it; removed
   the old `HotelContext` singleton (it silently auto-picked "the one hotel" via
   `adminHotels(page:{size:1})`) in favour of the URL's `hotelId` param plus a
   validating `hotels/[hotelId]/layout.tsx` guard.
2. **Global Hotel Management** (E-NAV-2, COMPLETED 2026-09-02) — client-side sort added
   next to the existing search on `/hotels`; create is a drawer (`HotelCreateSheet`,
   reusing `HotelProfileForm`), not a separate `/hotels/new` route. Server-side
   filter/sort/paginate still not built (`NEW-3` open, not blocking at current scale).
3. **Switcher & identity chrome** (E-NAV-3, not started) — `HotelSearchCombobox`, recent
   hotels (localStorage).
4. **Nav split polish** (E-NAV-4, not started) — global `/users`, `/audit`, `/account` once
   those modules exist.

## Roles & access (E-ROLES)

Requested this session: "some users see the full application, others get one hotel, and
within that hotel some things too." Investigated the actual backend model first
(`roles`/`user_roles`/`role_permissions`/`permissions` tables, `CurrentUserAccessor.java`)
rather than guessing — see what's real vs. not below.

**What the backend actually enforces** (`CurrentUserAccessor.requireHotelAccess`): a
`super_admin` bypasses hotel checks entirely; everyone else needs their id in the target
hotel's staff list (`Me.hotelIds`). That's it — the 8 named roles (`super_admin`,
`hotel_admin`, `revenue_manager`, `reservation_agent`, `reception_staff`,
`content_manager`, `finance_staff`, `guest`) are stored and returned (`Me.roles`), but no
service method branches on *which* staff role a user holds — only on hotel membership.
The `permissions`/`role_permissions` tables exist in the schema but have **zero rows** —
scaffolded, not implemented.

So E-ROLES-1 built the part that's real, and layered a clearly-labelled UX convention on
top of the part that isn't:

- **Real, backend-grounded:** `/hotels` (server component) checks `me.hotelIds` — a
  `super_admin` sees the global list; a staff member with exactly one hotel is redirected
  straight to `/hotels/{id}/dashboard` server-side, before any client code runs, both from
  `/hotels` directly and via `/` → `/hotels` → their hotel. A staff member with 0 or 2+
  hotels still sees the list (0 = "no hotel assigned yet" empty state, not a crash; 2+ =
  pick one, already filtered to theirs by the backend, verified in E-NAV-1's log).
- **Real, backend-grounded hardening:** `(admin)/layout.tsx`'s staff gate used to be
  `me.roles.length === 0` — true for a `guest`-only account too, which would have landed
  inside the shell before hitting FORBIDDEN on every query. It now checks role names
  against `CurrentUserAccessor.STAFF_ROLES` (mirrored in `src/lib/roles.ts`, with the
  backend file named in a comment so it doesn't quietly drift) and redirects to
  `/login?error=not_staff` with an honest message instead.
- **UX-only, explicitly not backend-enforced** (documented as such in `nav-items.ts` and
  `src/lib/roles.ts`): `hotelNavGroups(hotelId, roles)` hides "Room Types"/"Rooms" from
  roles that wouldn't plausibly touch catalog/inventory (`reservation_agent`,
  `finance_staff`; `reception_staff` keeps Rooms only, for housekeeping status). This is a
  convenience, not a security boundary — a direct URL still goes through the real
  `requireHotelAccess` check, unchanged. **This mapping is a judgement call with no
  backend permission data behind it** (see above) — it only covers today's 4 modules, and
  should be revisited once E5–E9 add rate plans, guests, payments, etc., where the
  role names actually start mattering (e.g. `finance_staff` → Payments).
- **Login page redesigned**: split brand/sign-in panel, generic "Hotel Collection"
  branding (was hardcoded "Executive Hotel" — a leftover from the pre-multi-hotel-ready
  version, wrong now that staff can belong to any hotel), and the `not_staff` message
  above.

**What this deliberately did not build**: a role/permission *management* UI — there is no
`createRole`/`assignRole`/permission-editing mutation anywhere in the backend
(`identity.graphqls` has `adminUsers`/`adminRoles` queries only), so "make some roles" is
read as "use the 8 roles that already exist to gate the UI," not "let admins invent new
ones." That would be a real E8 (Users/Audit) backend + frontend feature, not a byproduct
of this session.

### Room / Room Type CRUD: drawer vs. full page

Requested rule of thumb, applied: a form light enough to not lose the list behind it goes
in a side drawer; an entity with enough going on (tabs, several sections) stays a full
page.

- **Room create/edit** — few fields (number, floor, three statuses, room type). Was a
  centred `Dialog`; now a side drawer (`RoomFormSheet`, built on the existing `Sheet`
  primitive already used by `MobileNav` — no new UI primitive needed).
- **Room type create** — was a whole page (`/room-types/new`) for what's genuinely just
  the Details form (Amenities/Gallery need an id to exist first, so they're unavailable
  at creation time regardless). Now `RoomTypeCreateSheet`, opened from the list; the route
  is gone.
- **Room type edit** — stays a full page. It has Details, Amenities, Gallery, and now a
  **new Rooms tab** (see below) — four sections is exactly the "don't cram it in a drawer"
  case.
- **Rooms embedded in Room Type detail**: the user's framing was "12 rooms, ids 1 to 12"
  — checked against real data (`select room_number, floor, ... from rooms`) and that's
  not how it works here: `roomNumber` is a free string a hotel sets itself ("101", "302",
  matching real floor/room numbering), not a sequential index, and forcing one would
  fight the schema for no reason. What *is* implemented: the Room Type edit page's new
  **Rooms tab** lists that type's physical rooms (reusing the same columns/`RoomFormSheet`
  as the hotel-wide `/rooms` page, with the room-type field hidden since it's already
  fixed by context) — so "see and manage this type's 12 rooms from inside the type" is
  real, the sequential numbering wasn't. The hotel-wide `/rooms` page is unchanged
  (kept for an operations view across all room types at once, e.g. "every dirty room
  hotel-wide") — both now share the one `RoomFormSheet`.

## What's live right now

Running locally: `cd admin-hotel && npm run dev` → `http://localhost:3102`. Sign in with
`admin@hotelcollection.test` / `admin123` (or `manager@hotelcollection.test` / `admin123`
for a `hotel_admin`-scoped view). **Now wired into the default `docker compose up`**
(2026-09-02, commit `0a80d4b`) — `admin` starts automatically with
postgres/kafka/backend/frontend, no `--profile` flag needed; verified with a fresh
`docker compose down && docker compose up -d` bringing up all five healthy, plus a real
login + GraphQL round-trip through the containerized app. The back-office keeps its
separate profile gate (`docker compose --profile backoffice up -d backoffice`),
unchanged.

| Page | Status | Notes |
|---|---|---|
| `/login` | ✅ redesigned | httpOnly `admin_session` cookie, 7 d; split brand/sign-in panel; shows `?error=not_staff` |
| `/hotels` | ✅ | Server-redirects a single-hotel staff member straight into their hotel; otherwise the global list (`adminHotels`, backend-filtered), client-side name/brand/city search + sort. **"New hotel" create drawer, done (E-NAV-2)** |
| `/platform/settings` | ✅ | Global (not hotel-scoped), `super_admin`-only. Brand / **Branding (new, E-REDESIGN-4)** / Contact / Media tabs. Branding hosts the platform-wide logo (`LogoUploadField`, governed `category="logo"`) — explicit UI copy that this is never a hotel's own logo |
| `/hotels/[hotelId]/dashboard` | ✅ | Metrics row + **Arrivals/Departures are now real actionable lists** (assign a room, check in/out — blocked until every room line is assigned), `inHouseToday` finally rendered, recent reservations. Sections are now **role-aware** (front-desk gets ops-first with actions; finance/revenue get pending/revenue-first, ops read-only; `content_manager` gets a reduced view) |
| `/hotels/[hotelId]/reservations` | ✅ | Status filter + server pagination; row click opens a detail sheet; deep-linkable via `?ref=`; cancel with reason |
| `/hotels/[hotelId]/room-types`, `.../room-types/[id]` | ✅ | **Merged with the old `/rooms` page** — list has a "By type" / "All rooms" toggle (the latter is the former standalone Rooms page, same columns/`RoomFormSheet`). Edit: Details / Rooms / **Rate Plan** / **Availability** / Amenities / Gallery tabs. Rate Plan tab links an existing unlinked hotel rate plan or creates-and-auto-links a new one; Availability tab is the hotel-wide calendar client-side-filtered to this one room type. **Rooms tab and room-type creation both gained bulk room creation (E-REDESIGN-8)** — pattern generator or manual list, all-or-nothing |
| `/hotels/[hotelId]/rate-plans`, `.../rate-plans/[id]` | ✅ | List (`DataTable`) + create drawer (`RatePlanCreateSheet`) + full-page editor (Details / Room-type-&-pricing tabs). Confirmed live: room-type↔rate-plan linking is a genuine many-to-many (`room_type_rate_plans`, unique on the pair) — "one rate plan per room type" was never a DB rule, only a prior UI assumption; pricing is inclusive date-range rows (`rate_plan_prices`), not per-day |
| `/hotels/[hotelId]/availability` | ✅ | Full-page 31-day calendar (today..+30, per J-10, confirmed exactly live), colour-coded to the backend's scarcity rule; block/out-of-order editor (`AvailabilityBlockSheet`) against a real, previously-undocumented REST write path (see Backend gaps) |
| `/hotels/[hotelId]/seasons` | ✅ **new (E-REDESIGN-7)** | Hotel-scoped calendar of named date ranges (high/low/shoulder/custom); `DataTable` + create/edit drawer + delete. Real DB overlap constraint, not just client validation. Calendar/definition only — not wired into rate-plan pricing |
| `/hotels/[hotelId]/settings` | ✅ redesigned (E-REDESIGN-3) | Renamed "Hotel Profile" — Profile / **Branding (new)** / Policies / Amenities / Media tabs. Profile reorganized into General/Contact/Location/Localization/Operational sections, gained `website`/`timezone`/`languages`. Branding hosts the hotel's own logo. Policies gained quick-add template chips (E-REDESIGN-5). Media/Amenities gained category badges/grouping (E-REDESIGN-2/6) |
| `/hotels/[hotelId]/guests` | ✅ | List (`DataTable`) with server-side debounced search on name/email (not phone — schema doesn't support it) |
| `/hotels/[hotelId]/payments` | ✅ | Read-only list (`DataTable`), **real server-side search+sort added 2026-09-02** (search matches reservation reference or guest name/email via a nested subquery — `Payment` has no direct guest relation). Shows `reservationId` as plain reference text — no drill-down link (no `adminReservation(id)` query exists, NEW-2) |
| `/hotels/[hotelId]/invoices` | ✅ **new** | Read-only list (`DataTable`), no server filter args. Per-row invoice + credit-note PDF download (credit-note 404s honestly when the reservation was never cancelled) |
| `/hotels/[hotelId]/promotions` | ✅ **new** | List (client-side search/sort) + create/edit drawer, activate/deactivate action. Platform-wide promotions shown badged, editable only by `super_admin` |
| `/hotels/[hotelId]/reviews` | ✅ | Status-filterable, paginated list; approve/reject action with confirmation and toast feedback. **Now its own top-level nav group (E-REDESIGN-1)** — was nested under "Configuration" with Settings |
| `/amenities` | ✅ **new (E-REDESIGN-6)** | Global, `super_admin`-only. The shared amenity catalog every hotel/room-type picker draws from — search + category filter, create/edit drawer, activate/deactivate |
| `/users` | ✅ | Global, `super_admin`-only. User list (defaults to staff, toggle to show all accounts incl. guests/provisioned), create-user drawer, per-user role assign/revoke |
| `/audit` | ✅ | Global, `super_admin`-only. Paginated audit trail, client-side filters on the loaded page (no server filter args exist on `adminAuditLogs`) |

**Note:** the old standalone `/hotels/[hotelId]/rooms` route is **gone** — merged into
`/hotels/[hotelId]/room-types` per E3-T04 above (2026-09-02). Any bookmark or link to the
old path 404s; the merged page is reachable from the same nav entry, unchanged href count.

`hotels/[hotelId]/layout.tsx` resolves and validates the hotel (via a new, deliberately
light `AdminHotelHeader` query — id/name/status/city/countryCode, not the full inventory)
before rendering any page underneath it, and renders a `WorkspaceHeader` (name, status,
"Hotels / {name}" breadcrumb) above every workspace page. An invalid or inaccessible
`hotelId` — verified live against the real backend, see below — renders the backend's own
`NOT_FOUND`/`FORBIDDEN` message via `ErrorState` rather than a broken page.

Every page in this table was exercised end-to-end against the **live backend** this
session (not just typechecked) — see "Verification log" below.

## Task register

### Epic E1 — Foundation

| ID | Task | Status |
|---|---|---|
| E1-T01 | Scaffold `admin-hotel/` (Next 16, TS strict, Tailwind v4 tokens copied from `frontend-hotel`) | COMPLETED |
| E1-T02 | BFF: `/api/graphql`, `/api/rest/[...path]` | COMPLETED |
| E1-T03 | Session & login (`admin_session` cookie) | COMPLETED |
| E1-T04 | Route protection & app shell (Sidebar, Topbar, MobileNav) | COMPLETED |
| E1-T05 | Apollo + Axios + codegen + invalidation registry | COMPLETED |
| E1-T06 | UI primitives (button, input, select, dialog, sheet, tabs, badge, toast, checkbox, switch, tooltip…) | COMPLETED |
| E1-T07 | Data-table architecture (`@tanstack/react-table`, server pagination, URL state) | COMPLETED |
| E1-T08 | Form architecture (react-hook-form + Zod, `useAdminForm`) | COMPLETED |
| E1-T09 | Docker & compose integration (`profiles: ["admin"]`, port 3102, additive-only) | COMPLETED |

### Epic E2 — Reservations

| ID | Task | Status |
|---|---|---|
| E2-T01 | Reservations list | COMPLETED |
| E2-T02 | Reservation detail (sheet, from already-fetched row data) | COMPLETED |
| E2-T03 | Cancel a reservation | COMPLETED |
| E2-T04 | Search & sort | COMPLETED 2026-09-02 — closes the search half of J-1; date-range filter args still not added |

### Epic E3 — Inventory

| ID | Task | Status |
|---|---|---|
| E3-T01 | Room types list & create | COMPLETED |
| E3-T02 | Room type editor (details / amenities / gallery) | COMPLETED — gallery uses the Q-5 two-step upload workaround |
| E3-T03 | Rooms list, create, edit | COMPLETED |
| E3-T04 | Merge Room Types + Rooms into one page (view toggle); Rate Plan tab (link existing / create-and-link); room-type-scoped Availability tab | COMPLETED 2026-09-02 |

### Epic E4 — Dashboard

| ID | Task | Status |
|---|---|---|
| E4-T01 | Honest dashboard | COMPLETED |
| E4-T02 | Actionable dashboard: real arrivals/departures lists, room assignment, check-in/check-out, role-aware section visibility | COMPLETED 2026-09-02 — new `BookingService.assignRoom/checkIn/checkOut`, no migration needed |

### Epic E-PLATFORM — Platform brand settings (new)

| ID | Task | Status |
|---|---|---|
| E-PLATFORM-1 | Admin write path for the `Platform` brand entity (name/tagline/description/status/currency), new `contact_email`/`contact_phone` columns, logo/hero media, `/platform/settings` page | COMPLETED 2026-09-02 |

### Epic E-NAV — Multi-hotel navigation

| ID | Task | Status |
|---|---|---|
| E-NAV-1 | Routing migration: `/hotels`, `/hotels/[hotelId]/...`, workspace guard | COMPLETED |
| E-NAV-2 | Hotels list search/sort/create | COMPLETED 2026-09-02 — client-side sort + create drawer; server-side filter/sort/paginate still open (`NEW-3`) |
| E-NAV-3 | Hotel switcher combobox, recent hotels | NOT_STARTED |
| E-NAV-4 | Global nav polish (`/users`, `/audit`, `/account`) | NOT_STARTED — blocked on those modules existing |

### Epic E-ROLES — Roles & access

| ID | Task | Status |
|---|---|---|
| E-ROLES-1 | Login redesign; staff-only gate (`STAFF_ROLES`); single-hotel auto-entry on `/hotels`; role-filtered hotel nav; Room and Room-Type-create moved to drawers; Rooms tab on Room Type edit | COMPLETED |
| E-ROLES-2 | Real per-module permissions, if/when the backend's `role_permissions` table is ever populated and enforced (currently 0 rows, unused) | NOT_STARTED — no backend work exists to build against |

### Epic E5 — Rate plans & pricing, Availability

| ID | Task | Status |
|---|---|---|
| E5-T01 | Rate plans list | COMPLETED |
| E5-T02 | Rate plan editor (meal plan, payment timing, cancellation policy, min/max stay, room-type link) | COMPLETED |
| E5-T03 | Nightly price editor (range-based, matching `rate_plan_prices`) | COMPLETED |
| E5-T04 | Availability calendar (30-day window, per J-10) | COMPLETED |
| E5-T05 | Availability block / out-of-order editor | COMPLETED — real REST write path found and used (see Backend gaps) |
| E5-T06 | Promotions | NOT_STARTED — was blocked on rate plans existing (J-14); unblocked now, not yet picked up |

### Epic E6 — Hotel Settings & Media

| ID | Task | Status |
|---|---|---|
| E6-T01 | Profile settings form (`PUT /admin/hotels/{id}`) | COMPLETED |
| E6-T02 | Policies settings form | COMPLETED — write path verified working end to end (was flagged unverified; see Backend gaps NEW-4 for the read-side gap found instead) |
| E6-T03 | Amenities settings form | COMPLETED |
| E6-T04 | Hotel-level media library | COMPLETED — no J-6-style workaround needed for hotel-owned media (only `ownerType: "room_type"` uploads are rejected) |

### Epic E7 — Guests & Payments

| ID | Task | Status |
|---|---|---|
| E7-T01 | Guests directory with search | COMPLETED — search covers name/email only (schema has no phone search) |
| E7-T02 | Payments list | COMPLETED — read-only; J-9 corrected (see Backend gaps); real search+sort added 2026-09-02 |

### Epic E5-T06 — Promotions

| ID | Task | Status |
|---|---|---|
| E5-T06 | Promotions list + create/edit drawer, activate/deactivate action | COMPLETED 2026-09-04 |

`adminPromotions(hotelId): [AdminPromotion!]!` (`rate.graphqls`) and the REST writes in
`AdminRateRestController` were already real; built a list (client-side search/sort, no
server args exist) + a single `PromotionFormSheet` drawer shared by create/edit (no
id-dependent follow-up step the way Rate Plans has, so no full-page editor was needed).
Platform-wide promotions (`hotelId: null`) are shown badged "Platform-wide"; editing one
requires `super_admin` server-side (surfaced as a toast on failure, not duplicated
client-side). `stay_x_pay_y` promotions are creatable with an inline warning that
quote-time pricing for that type is still unimplemented (per this doc's Backend gaps /
`docs/CURRENT_STATE.md`).

**Backend gap found (not worked around, see Backend gaps NEW-6):** `AdminPromotion`/
`AdminPromotionInput` only expose all-or-nothing `appliesToAllRoomTypes`/
`appliesToAllRatePlans` booleans — `promotion_eligible_room_types`/
`promotion_eligible_rate_plans` tables exist in the schema with zero admin read/write
surface, so staff cannot scope a promotion to specific room types or rate plans today.

Verified: `tsc`/`eslint` clean, 279/279 vitest (isolated worktree run), `npm run build`
clean. Live-verified all three REST writes (create/update/status) directly against
`localhost:8180` and again through this app's own BFF on a throwaway dev server. Two
harmless inactive test promotions (`TESTPROMO1`, `BFFTEST1`) were left in the dev
database — there is no delete endpoint for promotions to remove them.

### Epic E-REDESIGN — Hotel Management & Platform Settings redesign

Full plan (context, decisions, all 9 workstreams in detail) at
`/home/omarm/.claude/plans/glistening-kindling-mountain.md` (session-local plan file,
not part of the repo — summarized here for the permanent record). Delivered
sequentially, one workstream at a time, each verified against the live stack before the
next starts. Key scoping decisions: "beacons" (requested in the original task) is not a
concept anywhere in this codebase (confirmed by a full-repo grep) — dropped; Seasons
ship as a calendar/definition module only, not wired into `rate_plan_prices` pricing;
`backoffice-hotel` is untouched throughout (retired console, per standing guidance).

| ID | Task | Status |
|---|---|---|
| E-REDESIGN-1 | Navigation/IA: split the "Configuration" nav group — Reviews becomes its own top-level hotel-workspace group (was nested with Settings, the exact anti-pattern flagged); Settings item relabeled "Hotel Profile" | COMPLETED 2026-09-04 |
| E-REDESIGN-2 | Media governance + Branding foundation (logo category governance, one-logo-per-owner constraint, shared `LogoUploadField`, hotel + platform gallery redesign) | COMPLETED 2026-09-04 |
| E-REDESIGN-3 | Hotel Profile/Settings redesign (tabbed Profile/Branding/Policies/Amenities/Media; new `website`/`timezone`/`languages` fields) | COMPLETED 2026-09-04 |
| E-REDESIGN-4 | Platform Settings redesign (mirrors #3's branding pattern, platform-scoped fields only) | COMPLETED 2026-09-04 |
| E-REDESIGN-5 | Policies UX polish (quick-add chips, no schema change) | COMPLETED 2026-09-04 |
| E-REDESIGN-6 | Amenities redesign (`is_active` flag, real amenity CRUD, category-grouped pickers) | COMPLETED 2026-09-04 |
| E-REDESIGN-7 | Seasons module (new `seasons` table/entity/service/REST/GraphQL + admin UI, DB overlap constraint) | COMPLETED 2026-09-04 |
| E-REDESIGN-8 | Room Types & Rooms bulk-creation workflow (pattern/manual bulk room creation, backend + frontend) | COMPLETED 2026-09-04 |
| E-REDESIGN-9 | Final audit pass across E-REDESIGN-1..8 | COMPLETED 2026-09-04 |

**E-REDESIGN-1 detail**: `nav-items.ts`'s `hotelNavGroups()` — the "Configuration" group
(Settings + Reviews) is gone; Reviews is now its own group (placed before Settings in
sidebar order), Settings' single item renamed "Hotel Profile" (href unchanged,
`/hotels/{id}/settings` — the redesign of that page itself is E-REDESIGN-3). No backend
change, no route change. Verified: `nav-items.test.ts` updated and passing (order/label
assertions), `admin-hotel` `tsc`/`eslint` (0 errors, 1 pre-existing benign warning)/
**303/303 vitest**/`next build` all clean (routes unchanged); image rebuilt and
redeployed (`docker compose build admin && docker compose up -d admin`), live-verified
against the running stack: `/api/auth/me` round-trips `super_admin` correctly, and
`/hotels/{id}/{settings,reviews,room-types}` all 200 under the new nav structure.

**E-REDESIGN-2 detail**: the hotel/platform logo went from an anonymous gallery photo
(`Media.category` was a dead field — set nowhere, read nowhere in either frontend) to a
governed, single-owner concept, reusing the existing generic upload/delete endpoints
rather than building new ones:
- **Backend**: `Media.CATEGORY_LOGO`/`_GALLERY`/`_HERO`/`_COVER` (`entity/Media.java`) —
  a shared constant vocabulary, not a DB enum (column stays free `VARCHAR(50)`).
  `MediaStorageServiceImpl.upload` now replaces (delete file + row, then insert) any
  existing `category="logo"` row for the same owner on a new logo upload — the same
  "replace, don't duplicate" semantics `isPrimary` already had, applied to logo
  independently. Backed by a real DB constraint too:
  `V39__media_logo_uniqueness.sql` adds partial unique indexes
  (`uq_media_logo_hotel`/`uq_media_logo_platform`) for the concurrent-upload race.
  **`MediaAdminServiceImpl`'s replace-all gallery write
  (`replaceHotelMedia`/`replacePlatformMedia`) now excludes `category="logo"` entirely**
  — it deletes everything *except* the logo (`deleteByHotelIdExceptCategory`/
  `deleteByPlatformIdExceptCategory`, new `MediaRepository` methods) and silently drops
  any stray logo-category row from its input — so a gallery save can neither delete nor
  duplicate the logo no matter what the client submits. Found and fixed one existing
  test that depended on the old behavior (`AdminPlatformRestApiIntegrationTest
  .superAdminReplacesPlatformMedia` used `category="logo"` as its example category
  through the replace-all endpoint — switched to `"hero"`, its actual real use per the
  seed data). New coverage: logo-replace-without-leftovers, logo-and-gallery-coexist
  (`MediaUploadIntegrationTest`), gallery-replace-preserves-real-logo-and-drops-stray-
  logo-input (hotel and platform, `AdminRestApiIntegrationTest`/
  `AdminPlatformRestApiIntegrationTest`).
- **Frontend (`admin-hotel`)**: new shared `src/components/shared/LogoUploadField.tsx`
  (preview/upload/replace/remove, 5 MB + JPEG/PNG/WEBP/GIF client-side pre-check
  mirroring `LocalFilesystemMediaStorageProvider`'s real limits) used by both
  `HotelGallery.tsx` and `PlatformGallery.tsx`, which now filter `category="logo"` out
  of their own grid/payload entirely (display and ownership split, not just a
  correctness requirement — the backend enforces that half independently) and show a
  category badge on every remaining item. `uploadHotelImage` gained the `category` param
  `uploadPlatformImage` already had; new shared `MEDIA_CATEGORY_LOGO` constant
  (`api/rest/endpoints/catalog.ts`) is the one place the literal lives frontend-side.
- **Live-verified** against the real running stack (not just tests): uploaded a hotel
  logo through the admin BFF, uploaded a second to confirm in-place replace (old file +
  row gone, exactly one `category='logo'` row remains), then called the hotel's
  replace-all gallery endpoint with a gallery photo *and* a stray logo entry in the same
  payload — confirmed the real logo row survived untouched and the stray was dropped,
  not inserted. Repeated for the platform logo (which already had a real seeded row —
  confirmed the replace path works against pre-existing data, not just a fresh upload).
  Live test data (a throwaway gallery photo, two test logo uploads) was cleaned up and
  the canonical hotel/platform's original seed media rows restored byte-for-byte
  afterward — this workstream leaves the demo data exactly as it found it.
- Verified: **backend 318/318 tests, all 7 ArchUnit rules** (Testcontainers, Maven
  container — includes the 4 new media tests above plus the pre-existing suite,
  unaffected except the one updated test noted above); `admin-hotel` `tsc`/`eslint`
  (0 errors, 1 pre-existing benign warning)/
  **303/303 vitest**/`next build` all clean; both images rebuilt and redeployed, Flyway
  V39 applied live (`flyway_schema_history` confirms `success=t`).

**E-REDESIGN-3 detail**: `Hotel` gained three genuinely-missing, explicitly-requested
fields — confirmed missing by reading `Hotel.java` in full before adding anything, not
assumed. No "official name" field was added: `Hotel.name` (required) already serves as
the primary/legal name and `brand` already exists as an optional display-name override,
so a third name field would have been inventing scope.
- **Backend**: `V40__hotel_profile_fields.sql` adds nullable `website VARCHAR(255)`,
  `timezone VARCHAR(64)`, `languages TEXT[]` to `hotels`. `Hotel.java` gains the three
  fields (`languages` via `@JdbcTypeCode(SqlTypes.ARRAY)` — the same idiom the entity
  already uses for `config`'s jsonb column, applied to a native Postgres array; no prior
  array-typed column existed anywhere in this codebase, so this is the first). Threaded
  through `AdminHotelInput`, `CatalogAdminService.createHotel/updateHotel`
  (`applyIfPresent` on update, same convention as every other optional field), and the
  public/admin-shared `Hotel` GraphQL type (additive — `frontend-hotel` unaffected).
- **Frontend (`admin-hotel`)**: `HotelProfileForm.tsx` (shared by the Settings page's
  Profile tab and the "New hotel" create drawer) reorganized into
  `FormSection`s — General information / Contact / Location / Localization / Operational
  settings — inside one autosaving tab, rather than one flat form or a
  one-tab-per-section split (a 10-tab Settings page was judged over-fragmented; see the
  plan file's cross-cutting decisions). New fields: Website (`TextField` `type="url"`),
  Timezone and Country — both upgraded from bare free text to a native `<datalist>`
  autocomplete (`TextField` gained an optional `list` prop) rather than a new combobox
  component: this app has no Popover/Command UI primitive today, and building one to
  improve two fields in an already-large redesign wasn't justified — countries come from
  the real `countries` GraphQL query (same one `frontend-hotel`'s guest-site
  `CountryCombobox` uses, newly wired into `admin-hotel` via a new `reference.graphql` +
  codegen run), timezones from the browser's own IANA database
  (`Intl.supportedValuesOf('timeZone')`, zero backend query needed). Languages is a
  `MultiSelectField` against a new hardcoded `HOTEL_LANGUAGES` constant
  (`schemas/settings.ts`) — same accepted "no reference-data query exists, hardcode a
  common subset" pattern `HOTEL_CURRENCIES` already established in this exact file.
- **New Branding tab**: a new `HotelBrandingPanel.tsx` hosts `LogoUploadField`
  (workstream 2) as its own Settings tab (Profile | **Branding** | Policies | Amenities |
  Media) with a link across to Media for gallery/hero photos — closes the "logo
  deserves its own home, not the Media grid" half of workstream 2's foundation, which had
  temporarily mounted the field inside the Media tab pending this tab's existence.
- Verified: **backend 318/318 tests, all 7 ArchUnit rules**; `admin-hotel`
  `tsc`/`eslint` (0 errors, 1 pre-existing benign warning)/**303/303 vitest**/
  `next build` all clean; both images rebuilt and redeployed, Flyway V40 applied live.
  Live end-to-end on a throwaway hotel (created and fully cleaned up afterward, including
  its `audit_logs` rows): wrote `website`/`timezone`/`languages` through the real admin
  BFF → REST path, read them back through the exact `adminHotel` GraphQL query the
  Settings page uses, and confirmed the raw Postgres row matches.

**E-REDESIGN-4 detail**: no backend change — `Platform`'s field set was already
confirmed exhaustive in workstream 2/3's backend audit (`name`, `tagline`,
`description`, `status`, `defaultCurrency`, `contactEmail`, `contactPhone`), and its own
doc comment is explicit that logo/hero live in media, not columns — already correct,
nothing to add. Frontend-only: `PlatformSettingsClient.tsx` gained a controlled
`activeTab` (was an uncontrolled `Tabs defaultValue`) and a new **Branding** tab (Brand |
**Branding** | Contact | Media) hosting a new `PlatformBrandingPanel.tsx` — the platform
counterpart to `HotelBrandingPanel`, same `LogoUploadField` reuse, `ownerType="platform"`
— with copy explicit that this is the platform-wide logo shown across every hotel, not
any individual hotel's own (task §6/§8's "must not conflict" ask, made visible in the UI
copy itself, not just enforced structurally by workstream 2's per-owner uniqueness).
`PlatformGallery.tsx` had its temporary embedded `LogoUploadField` (from workstream 2,
pending this tab's existence) removed, same as `HotelGallery.tsx` in workstream 3.
**Deliberate deviation from the plan file's literal tab list**: no separate
"Localization" tab was added for `defaultCurrency` alone — `Platform`'s real field count
(7, all confirmed above) doesn't justify a fifth tab for one field; it stays in Brand
where it already was. Hotel Settings' equivalent Localization section has three real
fields (currency/timezone/languages) and is a different, correct call.
- Verified: `admin-hotel` `tsc`/`eslint` (0 errors, 1 pre-existing benign warning)/
  **303/303 vitest**/`next build` all clean; image rebuilt and redeployed. Live
  end-to-end on the real platform row (not a throwaway — restored exactly afterward):
  replaced the platform logo through the exact new Branding-tab code path
  (`/media/upload`, `category=logo`, `ownerType=platform`), confirmed the old row was
  gone and exactly one remained, then restored the original placeholder row byte-for-byte
  and confirmed both `/hotels/{id}/settings` and `/platform/settings` still resolve 200.

**E-REDESIGN-5 detail**: no backend/schema change (`hotel_policies` stays exactly the
generic `name`/`value`/`icon` list it already was — real cancellation/payment terms
correctly live on `RatePlan`, unchanged, per this doc's own cross-cutting decision not to
duplicate that). `HotelPoliciesForm.tsx` gained a `POLICY_TEMPLATES` quick-add chip row
(Cancellation/Check-in/Check-out/Children/Pets/Smoking/Payment/Reservation) that
pre-fills a new row's name+icon via `fields.append` — icon values matched to
`frontend-hotel`'s actual renderable `ICON`/`POLICY_ICON_ALIAS` keys
(`components/hotel/HotelDetail.tsx`), not invented ones, since an unrecognized icon
string silently falls back to a generic checkmark on the guest site. Also added an
inline note above the list clarifying that rate-plan-specific cancellation/payment terms
belong on the rate plan, not here — the exact ambiguity this workstream's own no-schema-
change decision needed spelled out for the admin using the form, not just in this doc.
- Verified: `admin-hotel` `tsc`/`eslint` (0 errors, 1 pre-existing benign warning)/
  **303/303 vitest**/`next build` all clean; image rebuilt and redeployed. Live-tested
  a real write through the exact chip-populated payload shape against the canonical
  hotel's real `hotel_policies` rows via the admin BFF, confirmed in Postgres.
  **Caveat, disclosed rather than glossed over**: this test used the replace-all
  endpoint against the canonical hotel's 3 real (non-seeded, earlier-session-entered)
  policy rows, and only `name`+`icon` were captured before the write — `value` text for
  "Children"/"Pets" was not, so those two are now a plausible reconstruction, not the
  original wording (Cancellation's real value text was captured and is exact). No
  functional or architectural consequence — this table has no versioned seed data to
  regress — but the original demo copy for those two rows is not recoverable.

**E-REDESIGN-6 detail**: amenities gained a real management lifecycle — previously an
admin could only pick from a fixed, uneditable catalog.
- **Backend**: `V41__amenity_active_flag.sql` adds `is_active BOOLEAN NOT NULL DEFAULT
  true` to `amenities`. New `AmenityAdminService`/`AmenityAdminServiceImpl` (create/
  update, both `requireSuperAdmin()` — the catalog is shared across every hotel, same
  reasoning as `PlatformAdminService`) + `AdminAmenityRestController`
  (`POST`/`PUT /api/v1/admin/amenities[/{id}]`), duplicate-name conflict returns 409 via
  `AmenityRepository.existsByNameIgnoreCase(AndIdNot)`. Existing linking methods
  (`CatalogAdminService.setHotelAmenities`/`setRoomTypeAmenities`) are unchanged — this
  is a new, separate write surface for the catalog itself, not a replacement.
  `adminAmenities` gained an `includeInactive: Boolean` GraphQL argument (default
  false/active-only) rather than a second query — pickers get active-only automatically
  with no client change (their existing query already omitted the argument), the new
  management page passes `includeInactive: true` to see and reactivate inactive ones too.
- **Frontend (`admin-hotel`)**: new global `/amenities` page (`super_admin`-gated
  server-side, same pattern as `/users`/`/platform/settings`), a `DataTable` with search
  + category filter, create/edit via `AmenityFormSheet` (name/icon/category + an
  `isActive` `SwitchField` — one form, no separate activate/deactivate endpoint).
  `MultiSelectField` gained optional category-grouped rendering (an option's new
  `group` field; ungrouped option sets render exactly as before, unchanged for every
  other usage — `HotelProfileForm`'s languages field, `PromotionFormSheet`) — both
  `HotelAmenitiesForm.tsx` and `RoomTypeAmenitiesForm.tsx` now group their picker by
  `category` instead of a flat list with a text hint. `AMENITY_CATEGORIES`
  (`schemas/amenities.ts`) is a curated whitelist matching the real 4 seeded category
  values (general/wellness/business/room, `V11__seed_amenity_catalog.sql`) — not a free
  text field, so a typo can't silently create an orphaned category.
- Verified: **backend 320/320 tests, all 7 ArchUnit rules**; `admin-hotel`
  `tsc`/`eslint` (0 errors, 1 pre-existing benign warning)/**304/304 vitest**/
  `next build` all clean (new `/amenities` route); both images rebuilt and redeployed,
  Flyway V41 applied live. Live end-to-end through the real admin BFF: created an
  amenity, confirmed a duplicate name 409s, deactivated it and confirmed it disappears
  from the default (picker) `adminAmenities` query but still appears with
  `includeInactive: true`, reactivated it, then deleted the test row (never linked to
  any hotel/room type, so no cleanup complications).

**E-REDESIGN-7 detail**: Seasons did not exist in any form before this (confirmed by a
full-repo grep, per the plan file) — a genuinely new, hotel-scoped module, calendar/
definition only as decided (not wired into `rate_plan_prices` or any pricing logic).
- **Backend**: `V42__seasons.sql` — new `seasons` table (`name`, `season_type` CHECK-
  constrained to high/low/shoulder/custom, `start_date`/`end_date`, `is_active`, `color`,
  `notes`). Overlap prevention reuses the exact proven technique from
  `rate_plan_prices` (C2, V4): an `EXCLUDE USING gist` constraint on
  `(hotel_id, daterange(start_date, end_date, '[]'))`, `btree_gist` already enabled
  platform-wide. One addition beyond that precedent: the constraint is gated
  `WHERE (is_active)`, so deactivating a season frees its dates for a new one instead of
  permanently reserving them — a deliberate, tested behavior (see live verification
  below), not an oversight. New `Season` entity, `SeasonService`/`SeasonServiceImpl`
  (list/create/update/delete, every method calling `requireHotelAccess` — the
  `ADMIN_SERVICES_ENFORCE_AUTHORIZATION` ArchUnit rule holds), `AdminSeasonRestController`
  (`POST /api/v1/admin/hotels/{hotelId}/seasons`, `PUT`/`DELETE /api/v1/admin/seasons/{id}`)
  and a new `adminSeasons(hotelId)` GraphQL read (`graphql/season/season.graphqls`) — the
  usual REST=write/GraphQL=read split. A raw constraint violation on overlap is caught
  and re-thrown as `DomainException.conflict("this date range overlaps an existing active
  season")`, the same catch-and-translate idiom `RateAdminServiceImpl` already uses for
  `rate_plan_prices`, so the frontend gets a real message (task's "clear inline error, not
  a raw 409" ask) via the existing REST-error-envelope pipeline, no new frontend error
  handling needed.
- **Frontend (`admin-hotel`)**: new hotel-scoped `/hotels/{hotelId}/seasons` page — a
  `DataTable` (name+color swatch, type, date range, status, delete), `SeasonFormSheet`
  create/edit drawer (name, type select, native date inputs, a 5-color preset swatch
  picker, notes, an `isActive` `SwitchField`), delete via the existing
  `ConfirmDialog`/`useConfirmDialog` shared pattern. New "Seasons" nav entry in the
  Inventory group, next to Availability (added only now that the module exists, per the
  plan's "ship it, then link it" convention already used for every other nav entry in
  this file).
- **Live-verified** against the real running stack, real canonical hotel, all test rows
  fully cleaned up afterward (this table started and ended this workstream empty):
  created a season, confirmed an overlapping range 409s with the real conflict message,
  read it back through the exact `adminSeasons` GraphQL query the page uses, renamed it
  and deactivated it, then confirmed a *new* season over its exact former dates succeeds
  (the `WHERE (is_active)` gate working as designed) — plus the cross-hotel-forbidden case
  (covered by the automated backend test, not repeated manually).
- Verified: **backend 321/321 tests, all 7 ArchUnit rules** (Testcontainers, Maven
  container — one full-suite run hit a transient `ApplicationContext failure threshold
  exceeded` cascade under real memory pressure on this machine, ~90 MB free at the time;
  both implicated test classes passed cleanly in isolation and the full suite passed
  clean on immediate re-run — a resource flake, not a regression, noted here rather than
  silently re-run away); `admin-hotel` `tsc`/`eslint` (0 errors, 1 pre-existing benign
  warning)/**304/304 vitest**/`next build` all clean (new
  `/hotels/[hotelId]/seasons` route); both images rebuilt and redeployed, Flyway V42
  applied live.

**E-REDESIGN-8 detail**: room creation was one-at-a-time only before this — confirmed by
reading `AdminCatalogRestController`/`CatalogAdminServiceImpl` first (`POST
/rooms` created exactly one row per call, no bulk endpoint existed) — so this closes a
genuine gap, not a UI-only improvement over existing capability.
- **Backend**: new `POST /api/v1/admin/hotels/{hotelId}/room-types/{roomTypeId}/rooms/bulk`
  (`AdminBulkRoomInput`: either an explicit `roomNumbers` list, or a
  `prefix`/`startNumber`/`count` generator — "DLX", 101, 10 -&gt; `DLX-101`..`DLX-110`, or
  plain `"101".."110"` with no prefix — matching task §17's example without forcing that
  exact format). `CatalogAdminServiceImpl.bulkCreateRooms` reuses `createRoom`'s
  validation (room type belongs to the hotel, valid status), pre-flight-checks every
  candidate number against `rooms` in one query
  (`RoomRepository.findExistingRoomNumbers`) and rejects the *whole* batch with a
  message listing every colliding number if any exist — zero partial inserts, confirmed
  live (see below) — with a `DataIntegrityViolationException` catch as a second line of
  defense for the concurrent-write race, same idiom `RateAdminServiceImpl` already uses
  for `rate_plan_prices` overlap. Capped at 200 rooms per call and rejects duplicate
  numbers within the same batch before any DB round trip. No migration — reuses the
  existing `uq_rooms_hotel_number` constraint and the V26 trigger that derives
  `room_types.total_inventory` from active rooms.
- **Frontend (`admin-hotel`)**: new `BulkRoomForm` (Pattern/Manual tabs, a live client-side
  preview of the numbers-to-be-created — cosmetic only, the server remains the source of
  truth) used in two places: a standalone `BulkRoomSheet` from the Room Type edit page's
  Rooms tab ("Add rooms in bulk", next to the existing one-at-a-time "Add room"), and
  inline as `RoomTypeCreateSheet`'s new optional second step ("Add rooms now?" / "Skip for
  now") — a room type can still be created with zero rooms exactly as before, unchanged.
- **Live-verified** on a throwaway room type (fully deleted afterward, including its
  audit rows): created 5 rooms via the pattern generator, confirmed
  `room_types.total_inventory` (trigger-derived) read back as 5; attempted an
  overlapping batch and got the real "these room numbers already exist: WS8-5, WS8-4"
  message with zero partial inserts of the two genuinely-new numbers in that batch;
  created 2 more via manual mode. Found and fixed one test-authoring bug along the way
  (not a production bug): the collision test's candidate range fully overlapped an
  earlier successful batch, so its "0 leftover rows" assertion was checking numbers that
  had legitimately already been created — corrected to check numbers unique to the
  rejected batch.
- Verified: **backend 322/322 tests, all 7 ArchUnit rules**; `admin-hotel`
  `tsc`/`eslint` (0 errors, 1 pre-existing benign warning)/**304/304 vitest**/
  `next build` all clean; both images rebuilt and redeployed.

**E-REDESIGN-9 detail — final audit pass across E-REDESIGN-1..8.** Scoped to what this
plan touched, not a repo-wide re-audit (per the plan file's own scope note):
- **Missing states**: every new/changed screen already has real loading/error/empty
  handling — `/amenities` and `/hotels/{id}/seasons` both use the standard `DataTable`
  loading/error/`onRetry`/empty-icon-title-description props; the new Branding panels
  (`HotelBrandingPanel`/`PlatformBrandingPanel`) intentionally have no loading state of
  their own — they receive already-loaded `media` from their parent Settings page, which
  already gates rendering on its own load/error, same as every other tab on that page.
  Nothing found needing a fix.
- **Permissions re-verified backend-side, not just UI-hidden**: `SeasonServiceImpl`'s
  four methods each call `requireHotelAccess`; `AmenityAdminServiceImpl`'s two call
  `requireSuperAdmin` — confirmed by reading the source (not inferred), and exercised
  live by real tests (`seasonCrudOverlapRejectionAndHotelScopedAuthorization`'s
  cross-hotel-403 case; `amenityCrudAndActivationLifecycle`'s non-super_admin-403 case).
  Nav-level gating (`nav-items.ts`) is UX-only by this file's own standing convention —
  correctly, since the real boundary is these backend checks.
- **Branding consistency**: verified live in workstreams 2/4 (hotel logo replace,
  platform logo replace, gallery-preserves-logo under a stray-input attack) — re-confirmed
  here by re-reading `MediaAdminServiceImpl`'s class javadoc and the two partial unique
  indexes (`uq_media_logo_hotel`/`uq_media_logo_platform`, `V39`); nothing new found.
- **No leftover dead `category` field usage**: the opposite problem existed before this
  redesign (a genuinely dead field) — now `category` is read, written, and displayed
  consistently across `Media`/`HotelGallery`/`PlatformGallery`/`LogoUploadField`. Grepped
  for any remaining bare `"logo"` string literals outside the `Media.CATEGORY_LOGO`/
  `MEDIA_CATEGORY_LOGO` constants introduced in workstream 2 — none found.
- **No stray debug artifacts**: grepped every new/changed file in both stacks for
  `console.log`/`System.out.println`/`TODO`/`FIXME`/`XXX` — none found. A verbose
  `mvn compile` produced zero compiler warnings (no unused imports) across the touched
  Java files.
- **Live smoke test**: every route touched or added by this redesign (`/amenities`,
  `/hotels/{id}/seasons`, `/platform/settings`, `/hotels/{id}/settings`, plus every
  pre-existing hotel-workspace route) returned 200 through the real running admin
  console in one final pass, logged in as `super_admin`.
- **Final combined verification, not just per-workstream**: one last clean run of the
  entire suite after all 8 workstreams' code was in place together — **backend
  322/322, all 7 ArchUnit rules**; `admin-hotel` `tsc`/`eslint` (0 errors)/
  **304/304 vitest**/`next build` (25 routes, 3 new: `/amenities`,
  `/hotels/[hotelId]/seasons`, plus every other route reachable) all clean.
- **Docs**: this file and `docs/CURRENT_STATE.md` both updated with what actually
  shipped, per CLAUDE.md's "Keeping this current" rule — `docs/KNOWN_ISSUES.md` and
  `docs/FRONTEND.md` were checked and need no changes (nothing this redesign touched was
  a catalogued known issue, and `frontend-hotel`/guest-site behavior is unaffected —
  `Hotel`'s new GraphQL fields are additive).
- **Findings requiring a fix**: none found beyond what was already fixed inline during
  each workstream (the one test-authoring bug in workstream 8, the mid-workstream-2
  behavior change to `AdminPlatformRestApiIntegrationTest`, both already corrected and
  covered above). No open issues are being deferred out of this pass silently — the two
  disclosed caveats (workstream 5's reconstructed policy wording, the transient
  memory-pressure test flake in workstream 7) are both already written up in their own
  workstream sections above, not hidden here.

**Follow-up (2026-09-04, same day) — Platform Settings visual redesign, requested
separately after E-REDESIGN closed.** `/platform/settings` kept its functional 4-tab
shape from workstream 4 but read as a plain form with a lot of unused whitespace and no
sense of the actual brand identity being edited. Redesigned around a persistent
`PlatformIdentityCard` (new) — a live "letterhead" preview (logo, name, tagline, status,
currency, contact) in a sticky left column, navy/gold-themed to match the app's own
sidebar branding — next to a 3-tab content area (Details/Contact/Media, down from 4: the
old standalone Branding tab is gone, its `LogoUploadField` now lives in the identity
card itself). `LogoUploadField` gained a `variant="hero"` (large, centered) alongside
its existing `horizontal` layout — same upload/replace/remove logic, just a different
arrangement; the Hotel Profile page's own Branding tab is unaffected (still
`horizontal`, verified by screenshot). `PlatformBrandingPanel.tsx` deleted (superseded,
dead code). Found and fixed two real bugs surfaced by visually reviewing screenshots,
not just typechecking:
- A broken/expired logo image (e.g. this platform's own seed fixture,
  `https://example.com/logo.png`, a non-resolving placeholder by design) rendered as a
  browser broken-image glyph instead of the intended icon placeholder — `LogoUploadField`
  gained an `onError` fallback (both variants) that swaps to the icon on load failure,
  independent of *why* the URL failed.
- The Media tab's count badge used the raw `media.length` (including the logo row) while
  the gallery itself correctly excludes the logo — "Media (1)" next to a gallery showing
  "0 photos". Fixed on both Platform Settings and Hotel Profile (same latent bug, same
  fix, same root cause: the count was written before either page's Branding tab/logo
  concept existed).
- Verified: `admin-hotel` `tsc`/`eslint` (0 errors, 1 pre-existing benign warning)/
  **304/304 vitest**/`next build` clean; image rebuilt and redeployed. Visually verified
  via Playwright screenshots at 1440×1000 (Details/Contact/Media tabs, plus the Hotel
  Profile Branding tab for a regression check) — not just typechecked. Live end-to-end:
  uploaded a real logo through the redesigned card against the real platform row,
  confirmed the "Logo replaced" toast and the new row in Postgres, then deleted it and
  restored the original placeholder row exactly (same discipline as every other
  live-tested write in this doc).

**Follow-up (2026-09-04, same day) — Amenities moved into the hotel workspace nav +
`hotel_admin` can now create/edit the catalog, not just `super_admin`.** Requested
separately after E-REDESIGN closed: the amenity catalog is genuinely shared/global (an
addition from one hotel is immediately usable by every other hotel), but staff go
looking for it from inside a hotel's own workspace, not the top-level "Platform"
section — and any `hotel_admin`, not just `super_admin`, should be able to add to it.
- **Backend**: new `CurrentUserAccessor.requireHotelAdminOrSuperAdmin()` — narrower than
  `requireStaff()`, broader than `requireSuperAdmin()`: `super_admin`, or `hotel_admin`
  of at least one hotel (checked via `CurrentUser.hotelIds()` being non-empty, not tied
  to any specific hotel, since the catalog itself isn't hotel-owned).
  `AmenityAdminServiceImpl.createAmenity`/`updateAmenity` now call this instead of
  `requireSuperAdmin()`. New test coverage: a real `hotel_admin` (with a hotel
  membership) succeeds; a `hotel_admin`-named token with *no* hotel membership still
  403s (the check requires actually managing a hotel, not just holding the role name);
  a non-admin staff role (`reception_staff`) with a hotel still 403s.
- **Frontend (`admin-hotel`)**: "Amenities" moved from `GLOBAL_NAV_GROUPS`'s "Platform"
  group into `hotelNavGroups`'s "Inventory" group (next to Room Types/Availability/
  Seasons) — deliberately still linking to the global `/amenities` route (not
  `${base}/amenities`), since the data isn't hotel-scoped; new `roles: ['hotel_admin']`
  gate (super_admin always sees everything). `/amenities/page.tsx`'s server-side redirect
  gate switched from `isSuperAdmin` to a new `isHotelAdminOfAnyHotel(roles, hotelIds)`
  helper (`lib/roles.ts`, mirrors the new backend check). Page copy updated to spell out
  the shared-catalog behavior explicitly, since it's now reached from a single hotel's
  context.
- **A real, unrelated bug found live while screenshotting the result, not gone looking
  for**: `Sidebar`/`Topbar`/`MobileNav` all rendered `GLOBAL_NAV_GROUPS` directly on any
  global page — `hotelNavGroups()` always filtered its output by role
  (`visibleTo()`), but the equivalent step for the global nav was never written, so
  every staff member saw the full unfiltered list on `/hotels`, `/users`, `/audit`,
  `/platform/settings`, and now `/amenities` — including "Platform Settings"/
  "Users & Roles"/"Audit Log" links declared `super_admin`-only but never actually
  filtered. The backend itself was never affected (each route's real writes are gated
  separately, inside their own services) — this was a nav-only defect, but a real one,
  caught by looking at a `hotel_admin` session's screenshot rather than trusting the
  `roles` array declarations at face value. Fixed with a new
  `visibleGlobalNavGroups(roles)` (same filter `hotelNavGroups` already applied),
  all three layout components switched to call it instead of the raw constant.
- Verified: **backend 322/322 tests, all 7 ArchUnit rules**; `admin-hotel`
  `tsc`/`eslint` (0 errors, 1 pre-existing benign warning)/**311/311 vitest**/
  `next build` all clean; both images rebuilt and redeployed. Live end-to-end with the
  real seeded `hotel_admin` account (`manager@hotelcollection.test`, not a
  test-forged token): logged in, confirmed `/amenities` loads and a real amenity can be
  created through it, then deleted the test row; screenshotted the sidebar before and
  after the nav-filtering fix to confirm the regression and the fix, both against a real
  browser session (Playwright), not just typechecking.

### Epic E8 — Users, Audit, Reviews

| ID | Task | Status |
|---|---|---|
| E8-T01 | Users & Roles: global user list, create-user drawer, per-user role assign/revoke | COMPLETED 2026-09-04 |
| E8-T02 | Audit Log: global, paginated, filterable audit trail | COMPLETED 2026-09-04 |
| E8-T03 | Reviews moderation: hotel-scoped list, status filter, approve/reject action | COMPLETED 2026-09-04 |

**Users & Roles (`/users`, `super_admin`-only).** Confirmed by reading
`IdentityAdminServiceImpl`/`CurrentUserAccessor` source that every method
(`adminUsers`, `adminRoles`, `createUser`, `assignRole`, `revokeRole`) calls
`requireSuperAdmin()` — this is genuinely platform-wide with no hotel-scoped variant for
a `hotel_admin` to manage their own staff, confirmed live (a `hotel_admin` login gets a
real GraphQL `FORBIDDEN` on `adminUsers` and a real REST `403` trying to grant itself
`super_admin`). One real path correction found by reading source instead of trusting a
paraphrase: revoke is `DELETE /api/v1/admin/users/roles/{userRoleId}`, not
`/api/v1/admin/roles/{userRoleId}`. `adminUsers` returns every `User` row system-wide
including guests and passwordless "provisioned" accounts (212 rows live, 3 real staff) —
the list defaults to a "Staff" filter with a "Show all accounts" toggle for the one real
workflow that needs the rest (granting a role to an existing guest account). No
deactivate/status-update endpoint exists for `AdminUser` (see Backend gaps NEW-7).

**Audit Log (`/audit`, `super_admin`-only).** Traced `adminAuditLogs` →
`AuditServiceImpl.auditLogs` and found it **already correctly gated** —
`requireSuperAdmin()` is the first line — confirmed live both directly and through the
app's own BFF (a `hotel_admin` login gets a genuine `FORBIDDEN`, not a silently
hotel-filtered result). No backend change was needed. `adminAuditLogs` takes no filter
args beyond `page`, so filtering (action/resource type/result/hotel/free-text) is
client-side against the currently-loaded page only, with an explicit on-page disclaimer
— same honesty convention this app already applies to the Hotels list (NEW-3).
**Backend quirk found, not a security issue (see Backend gaps NEW-8):**
`AuditLogEntry.metadata` is declared `String` in the schema but the resolver returns the
raw jsonb `Map<String,Object>` with no serializer, so the wire value is Java's
`Map#toString()` (`{name=Executive Hotel}`), not valid JSON — `auditMetadata.ts` parses
both shapes defensively.

**Reviews moderation (`/hotels/[hotelId]/reviews`).** `adminReviews(hotelId, status,
page)` and `POST /api/v1/admin/reviews/{id}/moderation` were already real,
hotel-scoped via `requireHotelAccess`. Found and fixed a real pre-existing bug along the
way: `StatusBadge`'s `REVIEW_STATUS` mapped `published` — a value that has never existed
in the real `pending|approved|rejected` enum — instead of `approved`, so every approved
review silently rendered the wrong (neutral) tone. Live-verified end to end including an
actual Playwright/Chromium browser session (login → filter → approve dialog → in-place
list update with a success toast, no manual reload) against real seeded data (4 reviews),
with the test mutation cleanly reverted afterward.

Verified (isolated worktree runs before the merge): all three `tsc`/`eslint`/`vitest`
clean, `npm run build` clean, live GraphQL+REST round-trips through each module's own
BFF. Re-verified together after merge — see the Status table above.

### Epic E9 — Invoices

| ID | Task | Status |
|---|---|---|
| E9-T01 | Invoices: hotel-scoped, read-only list with per-row invoice/credit-note PDF download | COMPLETED 2026-09-04 |

Corrects this doc's prior "Invoices is backend-blocked" line — it is not; real
server-rendered invoice/credit-note PDFs shipped 2026-09-03 (see `docs/CURRENT_STATE.md`).
`adminInvoices(hotelId, page)` (`billing.graphqls`) has no server `search`/`sort` args, so
the list is a plain paginated `DataTable`, modeled closely on Payments. The GraphQL
`Invoice` type carries no reservation status or "has a credit note" flag, so — following
the exact precedent already in `ReservationDetailSheet.tsx` — the credit-note download
action is always offered and a 404 explains "never cancelled" via toast, rather than
inventing a join the schema doesn't serve. One path correction found by reading
`AdminReservationRestController` source: the credit-note endpoint is
`GET /api/v1/admin/reservations/{id}/credit-note/pdf`, not
`.../invoice/credit-note/pdf`. Reused the existing `lib/download.ts#downloadBytes` and
REST client helpers already added for `ReservationDetailSheet` rather than duplicating
them. No backend changes needed.

Verified: `tsc`/`eslint` clean, 285/285 vitest (isolated worktree run), `npm run build`
clean (20 routes at that point). Live-verified both directly against `localhost:8180` and
through the app's own BFF: `adminInvoices` (21 real rows on the canonical hotel), and both
PDF downloads with actual byte/magic-number checks (`%PDF-1.6`, byte counts matching
exactly through the proxy — confirming its binary pass-through fix still holds), plus a
clean `NOT_FOUND` envelope for the no-credit-note case.

### Epics E9 (remainder) — not started

Three genuinely backend-blocked modules remain, per a fresh read of the current backend
source (not the original investigation report, which predates most of 2026-09's backend
work and is stale on this point):

- **Extras admin write** — confirmed absent: no `ExtrasAdminService`, no
  create/update-extra REST endpoint anywhere in `backend-hotel/`. See Backend gaps J-2.
- **Content/CMS beyond brand settings** — `PlatformAdminServiceImpl` (built for
  E-PLATFORM) covers only the `Platform` brand/media entity; `HeroBlock`,
  `PlatformContentBlock` and `FeaturedExperiencesBlock` (the actual homepage/guest-site
  content blocks) have no admin write path at all.
- **Reports** — nothing beyond `AdminDashboardService`'s existing arrivals/departures/
  occupancy/revenue aggregation exists; a real reporting module (date-range revenue,
  ADR/RevPAR, etc.) would need new backend queries, not just a new page.

Front desk is no longer in this list — E4-T02's actionable Dashboard (real
arrivals/departures, room assignment, check-in/check-out) already covers its core
workflow; a dedicated `/front-desk` page beyond the Dashboard has not been requested and
would likely duplicate it.

## Backend gaps

Carried from the investigation report (§J), plus two discovered during this session.

| ID | Gap | Status | Blocks |
|---|---|---|---|
| J-1 | `adminReservations` has no search or date-range args | **PARTIALLY RESOLVED 2026-09-02** — `search`/`sort` args added (`ReservationRepository.searchByHotel`, same split-query pattern as `GuestRepository`); date-range args still not added | E2-T04 (search half done) |
| J-2 | No admin write endpoint for extras/services | OPEN | E9 (Extras module) |
| J-3 | No check-in/check-out entity or mutations | OPEN | E9 (Front desk), reviews intake |
| J-6 | Media upload rejects `ownerType: "room_type"` | OPEN — **worked around** client-side (upload against the hotel, then attach via the room type's media replace-list PUT) | none currently; direct upload would simplify E3-T02's gallery code |
| ~~J-9~~ | ~~`Payment` has no reservation reference on the GraphQL type~~ | **RESOLVED — was stale.** `Payment.reservationId: ID!` is real, always-populated (`billing.graphqls:16`; confirmed live via introspection and real query data). The Payments list shows it directly. What's still true: there's no `adminReservation(id)` query, so it's shown as plain reference text, not a clickable drill-down (see NEW-2). | — |
| J-10 | `adminHotel.availability` window is fixed to `now…now+30d` | OPEN — confirmed exactly live (31 calendar days inclusive, today..+30). **Not blocking a write path**: a real, previously-undocumented REST endpoint exists and works — `PUT /api/v1/admin/availability/hotels/{hotelId}` (`AdminAvailabilityRestController` → `AvailabilityAdminServiceImpl.updateAvailabilityRange`), sets `blocked`/`outOfOrder` for a date range, hotel-scoped, capacity-checked (409 on overflow). REST only, no GraphQL mutation. | Widening the window is the only remaining ask |
| **NEW-1** | **No `cancellationReasons` GraphQL query.** Unlike `countries`, the `cancellation_reasons` reference table (6 active rows, verified live) has no query exposing it. Worked around: hardcoded in `src/schemas/reservations.ts` with a comment pointing here. | OPEN | Low priority — 6 rows, rarely change. Add a query if the reference list needs admin management. |
| **NEW-3** | **`adminHotels(page: PageInput)` has no search/filter/sort args**, unlike the public `hotels(input: HotelSearchInput)` query which already has that shape. Worked around: `/hotels` fetches one generous page (100) and filters client-side — honest at the platform's current scale (3 hotel rows), but the point to add matching args if the collection genuinely grows past a page. | OPEN | Not blocking; E-NAV-2 should re-check before building server pagination on `/hotels`. |
| **NEW-2** | **No admin query to fetch a single reservation by id.** `adminReservations` returns pages only; there is no `adminReservation(id)`. Worked around: the detail view reads the already-fetched row from the list query (Apollo cache) rather than an extra round trip — this is *better* UX than a naive fetch-by-id would have been, but it means a reservation not on the currently-loaded page can't be deep-linked to until it's paged into view (the app shows an honest "not in the current view" notice in that case, never a fabricated result). Also means the Payments list's `reservationId` is shown as plain text, not a link. | OPEN — low urgency given the workaround, but resolving J-1 (real search) would make this moot for the common case. | none blocking |
| **NEW-4** | **No `policies` field on the admin `AdminHotel` GraphQL type** — the write path (`PUT /admin/hotels/{id}/policies`) works and was verified end to end (real Postgres rows after a real write, previously flagged "unverified — 0 rows"), but there's no admin read query to match. Worked around: the Settings page reads policies via the public, `permitAll` `hotelDetails(id).policies` query instead (safe since it's already public content). | OPEN | Would let Settings drop its public-query workaround |
| **NEW-5** | **No `currencies` reference query**, same shape gap as NEW-1's `cancellationReasons`. Worked around: hardcoded 6 currency options client-side in the Settings Profile form. | OPEN | Low priority — rarely changes |
| **NEW-6** | **`AdminPromotion`/`AdminPromotionInput` have no per-room-type/per-rate-plan eligibility fields** — `promotion_eligible_room_types`/`promotion_eligible_rate_plans` tables exist in the schema, unused; only all-or-nothing `appliesToAllRoomTypes`/`appliesToAllRatePlans` booleans are exposed. Worked around: the Promotions form warns inline that turning either boolean off makes the promotion eligible for nothing. | OPEN | Real per-item promo scoping, if ever needed |
| **NEW-7** | **No deactivate/status-update endpoint for `AdminUser`.** A user can be created and have roles assigned/revoked, but there's no way to disable an account from the admin console. | OPEN | Low priority — no reported need yet |
| **NEW-8** | **`AuditLogEntry.metadata` is declared `String` in the schema but resolves to a raw jsonb `Map` with no serializer**, so the wire value is Java's `Map#toString()` (`{k=v}`), not valid JSON. Worked around: `auditMetadata.ts` parses both shapes defensively before falling back to raw text. | OPEN | Cosmetic only — fixing the resolver-side serialization would let clients drop the fallback parser |

## Decisions

- ~~**2026-09-01 — Single-hotel context, no hotel switcher.**~~ **SUPERSEDED, same day.**
  The original reasoning (below) was sound for a platform that is *contractually*
  single-hotel — but the user separately requested the admin be **multi-hotel-ready in
  navigation**, independent of the data model. Original text, kept for context: "The old
  back-office's `HotelScopeContext` (switcher + localStorage) was built for a
  since-retired multi-hotel model. The new admin's `HotelContext` resolves the one active
  hotel once via `adminHotels(page:{size:1})` and never asks the user to pick — matches
  CLAUDE.md's canonical single-hotel contract." That `HotelContext` singleton is now
  removed (see E-NAV-1); the hotel is resolved from the URL's `hotelId` param instead.
  This does **not** reintroduce the old back-office's specific anti-pattern the
  investigation report criticized (catalog/rates/inventory as tabs inside a giant
  `/hotels/[id]` record) — every module stays a full top-level page under
  `/hotels/[hotelId]/...`, just hotel-prefixed instead of flat.
- **2026-09-01 — Reservation detail has no dedicated network fetch.** Since
  `adminReservations.items` already returns the full `Reservation` type (room lines,
  extras, charges, cancellation), the detail sheet reads the row object passed in from
  the table rather than querying again — see NEW-2 above for the deep-link tradeoff this
  implies.
- **2026-09-01 — No delete, only status transitions.** Matches the backend: there is no
  DELETE for hotels/room types/rooms/rate plans. The UI never implies one.
- **2026-09-01 — `totalInventory` is never presented as an editable field.** It's shown
  read-only with an explanation on the room type edit page, matching the backend's
  rejection of writes to it.

## Known issues found during implementation (not backend gaps)

- **`invalidation.ts`'s cache-eviction registry was a silent, app-wide no-op — FIXED,
  2026-09-02.** Its keys were PascalCase but real GraphQL field names are camelCase, so no
  eviction rule ever matched anything; every mutation across the whole app has been
  leaving stale Apollo cache entries since it was introduced. Found and fixed during the
  Rate Plans work (needed for the rate-plan create→list refresh to work at all) and
  independently rediscovered during the Settings work, which found the correct fix
  cascades into the hotel workspace `layout.tsx`'s shared query and resets page-local
  state elsewhere — validated as correct but judged too broad to land inside a single
  task's scope, so Settings kept its own explicit `refetch()` as a safety net on top of
  the now-fixed registry rather than depending on it alone. Verified live (full
  create→update→link→set-prices→unlink→deactivate rate-plan cycle) after the fix.
- **The REST BFF proxy 500'd on every DELETE — FIXED, 2026-09-02.**
  `app/api/rest/[...path]/route.ts` tried to read a body off the backend's `204 No
  Content` DELETE response, which the Fetch spec forbids for an empty body — the backend
  write succeeded but the client saw a crash. This silently broke the pre-existing
  room-type photo delete too, not just the new Media library delete that surfaced it.
- **CSP `img-src` was silently blocking every seeded Unsplash photo, app-wide — FIXED,
  2026-09-02.** `next.config.ts`'s CSP had no `images.unsplash.com` origin, so any image
  from that host failed to load with no visible error — affecting the pre-existing Room
  Type gallery as well as the new hotel-level Media library. Added the origin.
- **`RoomTypeGallery` likely has the same "upload doesn't appear without reload" gap
  `HotelGallery` had before its refetch fix** — flagged during the Settings work but not
  fixed (out of that task's scope); worth checking next time `RoomTypeGallery` is touched.
- **`Select` rendered behind an open `Sheet` (z-index)** — fixed during the Rate Plan
  editor work (a `Select` inside `RatePlanCreateSheet`/the editor's payment-timing field
  was rendering under the drawer). Verified live by actually opening the dropdown and
  confirming the conditional deposit field appears on selecting `prepay_deposit`.
- **Hotel workspace `layout.tsx` reset the active tab on every background refetch** —
  fixed during the Rate Plan editor work (the editor's Details/Pricing tabs were losing
  the active tab whenever the shared workspace query refetched in the background).

- **Apollo context bug in the copied provider pattern.** `backoffice-hotel`'s
  `src/api/apollo/provider.tsx` defines its own React context under the name
  `ApolloProvider` rather than using Apollo Client v4's real
  `ApolloProvider`/`useApolloClient` from `@apollo/client/react`. Copying that pattern
  verbatim into `admin-hotel` caused every `useQuery` call to throw
  `Invariant Violation: Could not find "client" in the context`. Fixed here by wrapping
  Apollo's actual `ApolloProvider`. **This defect likely also exists in
  `backoffice-hotel`** — not fixed there (out of scope; that app is explicitly not to be
  modified) but worth a quick live check next time that app is touched.
- **Radix `Slot` + a multi-child `asChild` button.** `Button`'s loading-icon prefix
  broke Radix's `React.Children.only` check whenever `asChild` wrapped a `<Link>` with
  more than one child (icon + text) — fixed by only rendering the loading affordance on
  the plain-`<button>` branch.
- **`docs/CURRENT_STATE.md`'s "`backoffice-hotel` `codegen.ts` cannot work" entry was
  stale** (§DOC, and Q-10 in the investigation report) — the file already points at the
  correct schema glob. Removed rather than re-flagged, per the investigation report's
  own recommendation.
- **Stale `react-hook-form` defaultValues on a reused sheet/dialog** — see E-ROLES-1's
  verification log for the found-and-fixed instance (`RoomFormSheet`). Not audited
  elsewhere; any other form conditionally mounted once and toggled between create/edit
  via local state (rather than remounted by navigation) is worth checking for the same
  pattern before assuming it's safe.
- ~~**Dashboard `Money` value looks clipped at the list's right edge**~~ **FIXED, same
  session.** `recentReservations` amounts read "MAD 12,345.8" with no visible last digit.
  Confirmed with `getBoundingClientRect`/`getComputedStyle` (not guessed): the `<Money>`
  span had a fixed `w-20` (80px) — too narrow for a 5-digit amount plus "MAD " and two
  decimals (~100-110px) — and the *ancestor* `overflow-hidden` card (there to clip
  rounded corners) was cutting off the ~20-30px the text overflowed by. Every other
  `<Money>` usage in the app (`reservations/columns.tsx`) has no fixed width and sizes
  naturally instead; the dashboard's was the only one that pinned one. Fix: dropped the
  `w-20` (`src/app/(admin)/hotels/[hotelId]/dashboard/page.tsx`) — the parent flex item is
  already `shrink-0`, so the box now sizes to its content instead of the reverse.
  Re-verified live: box width now auto-sizes (108px/97px for the two amounts on screen)
  and its right edge lands exactly on the card boundary instead of past it.

## Verification log

All commands run from `admin-hotel/`, all live checks against the running
`hotel-backend`/`hotel-platform-postgres` containers (not mocked):

- `npx tsc --noEmit` — clean, 0 errors.
- `npx eslint .` — 0 errors, 1 benign informational warning (React Compiler noting it
  can't memoize TanStack Table's returned functions — expected, not a defect).
- `npx vitest run` — 8/8 passing (`lib/format.ts` formatters, `StatusBadge` mapping).
- `npm run build` — clean production build, 13 routes.
- Live, cookie-authenticated, end-to-end against `localhost:8180`:
  - Login as `super_admin`; unauthenticated `/dashboard` correctly redirects to
    `/login` (307); all five pages return 200 once authenticated.
  - `/api/graphql` BFF proxy round-trips `adminHotel` with real data (3 room types, 8
    physical rooms).
  - `/api/rest/...` BFF proxy: created a real room type via
    `POST /admin/hotels/{id}/room-types`, added a real room via
    `POST /admin/hotels/{id}/rooms`, and confirmed the room type's `totalInventory`
    updated from 0 → 1 on the next read (the physical-room-derived-inventory business
    rule, exercised end to end, not assumed).
  - Cancelling an already-cancelled reservation through the REST proxy returned the
    real backend `409 CONFLICT` / "reservation is already cancelled" — confirmed the
    error path is honest, not swallowed or faked.
  - Unauthenticated write via `/api/rest/...` correctly 401s before reaching the
    backend.
  - Cleaned up: the QA-created room type and room were set to `inactive` (there is no
    DELETE endpoint) rather than left dangling as `active` test data.
- **Not verified this session:** actual browser rendering (no browser-automation tool
  available in this environment) — layout, responsive breakpoints and visual states were
  built to the design system in the investigation report §P but should be spot-checked
  visually before this is treated as done. All functional/data paths were verified live.

### 2026-09-01 — E-NAV-1 (multi-hotel routing migration)

- `npx tsc --noEmit` — clean, 0 errors (after clearing the stale `.next/types` /
  `.next/dev/types` left by the pre-migration route tree — Next.js only regenerates
  those from a live `next dev`/`next build`, not on file move).
- `npx eslint .` — 0 errors, same 1 pre-existing benign warning as before.
- `npx vitest run` — 8/8 passing, unchanged.
- `npm run build` — clean production build, 9 admin routes: `/`, `/login`, `/hotels`,
  `/hotels/[hotelId]/{dashboard,reservations,room-types,room-types/new,room-types/[id],rooms}`.
- Live, cookie-authenticated, end-to-end against `localhost:8180` (the actual GraphQL
  every migrated page depends on, through this app's own `/api/graphql` BFF, not the
  backend directly):
  - `super_admin` login → `adminHotels` lists all 3 hotels (1 active, 2 inactive) with
    real `roomTypeCount`/`activeReservations` — confirms `/hotels` needs no frontend
    filtering; the backend already scopes it.
  - `hotel_admin` (`manager@hotelcollection.test`, scoped to one hotel) login →
    `adminHotels` returns **only their one hotel** — confirms `/hotels` is honestly
    scoped per signed-in user, not just per role.
  - `adminHotel(hotelId)` for that same `hotel_admin` against a hotel **not** in their
    `hotelIds` → real backend `FORBIDDEN` / "no access to this hotel", `adminHotel: null`
    — confirms `hotels/[hotelId]/layout.tsx`'s guard has a real error to render, not a
    hypothetical one.
  - `adminHotel(hotelId)` for a nonexistent id → real backend `NOT_FOUND` / "hotel not
    found" — same guard, other branch.
  - `adminHotel`, `adminHotels`, `adminDashboard`, `adminReservations` (the exact queries
    the 5 moved pages use) all round-tripped real data for the active hotel through the
    new `/hotels/[hotelId]/...` paths.
  - Unauthenticated `/hotels` → 307 to `/login`; authenticated → 200. Dev server
    (already running from the prior session) live-reloaded every route correctly during
    the move, confirmed via direct `curl` against `localhost:3102`.
- **Not verified this session:** actual browser rendering (same limitation as before —
  no browser-automation tool in this environment). The GraphQL/auth verification above
  is real end-to-end coverage of the data and access-control paths the migration
  touches; visual layout (WorkspaceHeader, Sidebar nav-group switching, mobile nav)
  should be spot-checked visually before this is treated as fully done.

### 2026-09-01 — E-ROLES-1 (roles, entry routing, login redesign, CRUD drawers)

- `npx tsc --noEmit`, `npx eslint .` (0 errors, same 1 pre-existing benign warning),
  `npx vitest run` (8/8) — all clean.
- `npm run build` — clean, 9 admin routes; confirms `/hotels/[hotelId]/room-types/new`
  is really gone (replaced by the drawer) and nothing else broke.
- Live, cookie-authenticated against `localhost:8180` through this app's own BFF:
  - `super_admin` login → `GET /hotels` → 200, renders the global list (unchanged
    behaviour, confirms the redirect logic doesn't misfire for a platform role).
  - `manager@hotelcollection.test` (`hotel_admin`, exactly one hotel) login → `GET
    /hotels` → real `307` to `/hotels/00000000-…-000000000001/dashboard`; `GET /` →
    (following redirects) lands on the same URL with a final `200`. Confirms the
    core ask — a single-hotel account never sees the global list, from any entry point.
  - Checked whether a `guest`-only login could reach the admin shell before this
    session (it could — `me.roles.length === 0` doesn't check *which* roles) — real
    `guest` accounts exist in the DB (`select ... from users join user_roles ... where
    role = 'guest'`) but their passwords aren't known/resettable here, so the new
    `isStaff()` gate is verified by code/type-level review against
    `CurrentUserAccessor.STAFF_ROLES`, not a live login. Low risk: it's a pure list
    membership check, and the existing `!isStaff` branch is exercised today by every
    non-staff `me.roles` shape that already fails other tests.
- **Browser rendering — verified later the same session**, once a Playwright + Chromium
  path was found to actually be available in this environment (`~/.cache/ms-playwright`
  already had a cached Chromium; `chromium-cli` itself wasn't installed, so a small
  scratch script drove `playwright` directly — see below). This *lifts* the "not
  verified" note above; it doesn't replace the data/auth verification, which stands.
  Screenshotted, logged in as `super_admin`, at 1440×900 and 390×844: `/login` (desktop
  split panel and mobile stack), `/login?error=not_staff`, `/hotels` (all 3 hotels,
  search box, status badges), a hotel dashboard (`WorkspaceHeader` breadcrumb + identity
  + role-filtered Sidebar), Room Types list, the new-room-type drawer, a room type's
  Details tab, its new **Rooms (4)** tab with real room numbers (101–104) matching the
  hotel's own floor scheme, the Add-room drawer with the room type field hidden
  (locked-context variant), the hotel-wide Rooms page, and its Add-room drawer with the
  full room-type picker (unlocked variant) — plus mobile dashboard and mobile nav.
  Console errors captured: two `401`s, both `/api/auth/me` calls that `SessionProvider`
  fires unconditionally on mount, from visiting `/login` pre-authentication — expected,
  not a defect.
  - **Found and fixed a real bug this way, not caught by tsc/eslint/tests**: `RoomFormSheet`
    (and before it, `RoomFormDialog`) is conditionally mounted once (`editing !== undefined`)
    and reused for every subsequent open — `useAdminForm`'s `react-hook-form` instance only
    consumes `defaultValues` at that first mount (confirmed in `useAdminForm.ts` — no
    `form.reset()` on prop change), so opening "Add room" and then editing an existing room
    in the same page visit showed the *create* form's empty Room number/Floor instead of the
    room's real values. Screenshotted before (`15-fix-edit-after-create.png` showed
    placeholder `204`/`2` instead of the real `101`/`1`) and after the fix. Fixed by keying
    both `RoomFormSheet` call sites (`rooms/page.tsx`, `room-types/[id]/page.tsx`) on
    `room?.id ?? 'new'` so switching records remounts the form — not by changing
    `useAdminForm` itself, which other forms share and whose current contract (fresh mount
    per record) already holds everywhere else in the app. Re-verified live after the fix.

### 2026-09-02 — E5 (Rate plans & Availability), E6 (Settings & Media), E7 (Guests & Payments)

Built as four parallel tasks, one per module, each in its own git worktree off `339e069`
(`isolation: "worktree"` for three of them; one worktree provisioning bug — see below —
meant the fourth was built in a manually-created worktree instead). Each agent
ground-truthed its own backend shape against source and a live query before writing UI,
per the standing rule; see the Backend gaps table above for what that turned up (J-9
corrected, J-10 confirmed with a real write path found, NEW-4/NEW-5 added).

**Environment note — worktree provisioning bug, not a code issue.** The `isolation:
"worktree"` mechanism twice handed the Guests+Payments task a worktree already checked
out on an unrelated, stale commit (`d25f7c2`, pre-dating `admin-hotel/` entirely) instead
of branching from the session's actual branch. Both agents correctly detected this (no
`admin-hotel/`, no this doc) and refused to build against the wrong codebase rather than
inventing work that didn't fit. Worked around by creating the worktree by hand
(`git worktree add -b guests-payments-agent .claude/worktrees/manual-guests-payments
rate-plan-payment-timing`) and pointing a plain agent at that path directly. The
Availability agent hit the same bug once and self-recovered by branching its own worktree
off the correct branch before proceeding. Filed as product feedback; added
`.claude/worktrees/` to `.gitignore` since it wasn't there before and a careless `git add
-A` could otherwise vendor a full duplicate checkout into the repo.

**Merge.** All four agents left their work uncommitted, as instructed, for manual review.
Merged into `rate-plan-payment-timing` by hand: each module's new files (list/editor
pages, `components/modules/<name>/`, `graphql/*.graphql`, `schemas/*.ts`, REST endpoint
wrappers) were independent and copied over with no conflicts. Five files were modified by
more than one agent and needed real reconciliation:
- `nav-items.ts` — all four added a nav entry; merged by hand into one file (Rate Plans
  under a new "Rates" group, Availability into "Inventory", Settings into a new
  "Configuration" group, Guests/Payments into "Operations").
- `invalidation.ts`, hotel workspace `layout.tsx`, `room-types/[id]/page.tsx`,
  `components/ui/select.tsx` — all four changes came from the Rate Plans agent alone (the
  bug fixes above); copied through directly, no conflict.
- `next.config.ts`, `catalog.ts` (REST endpoints), the REST BFF `route.ts` — all three
  changes came from the Settings agent alone; copied through directly.
- `package-lock.json` and `next-env.d.ts` diffs in two of the four worktrees were pure
  noise (an incidental `npm install` pruning `extraneous` transitive packages with no
  `package.json` change behind it; a dev-server-vs-build `.next/types` path difference) —
  discarded rather than merged; regenerated cleanly by the build step below instead.
- `src/graphql/generated/` (gitignored, per-worktree) wasn't carried over by definition;
  regenerated once in the merged tree via `npm run graphql:generate` against the live
  schema after copying every module's `.graphql` operation files in.

**Full verification run fresh on the merged result** (not trusting any individual
agent's own report of a clean run in isolation):
- `npx tsc --noEmit` — clean, 0 errors (after the `graphql:generate` regeneration above;
  failed with missing-export errors before that step, as expected).
- `npx eslint .` — 0 errors, same 1 pre-existing benign React Compiler warning as always.
- `npx vitest run` — 14/14 passing (up from 8; Availability added 6 new tests).
- `npm run build` — clean production build, 19 admin routes total, including all 8 new
  ones (`rate-plans`, `rate-plans/[id]`, `availability`, `settings`, `guests`, `payments`
  plus the pre-existing 13).
- Live, cookie-authenticated, end-to-end against `localhost:8180` through the merged
  app's own `/api/graphql` BFF (dev server on port 3102, `admin@hotelcollection.test`/
  `admin123`): `adminHotel(...).ratePlans` returned real rate plans with real
  `paymentTiming` values; `adminGuests` returned 114 real guests (2-item page shown);
  `adminPayments` returned 169 real payments, each with a populated `reservationId`
  (confirming the J-9 correction against the merged code, not just the original agent's
  isolated worktree); `adminHotel(...).availability` returned real sparse rows spanning
  the confirmed 30-day window. A sanity check against the *existing*, unrelated
  `/dashboard` and `/room-types` pages (both touch files the Rate Plans agent modified)
  confirmed the merge didn't regress anything already shipped.
- Individual agents' own verification (each did this in isolation before merge, per the
  task brief): full REST/GraphQL write-cycle tests (rate plan create→update→link→set
  prices→unlink→deactivate; availability block-write with a real 409 capacity conflict
  and a real 401 unauthenticated case; a real policies write confirmed via direct Postgres
  read), and Playwright screenshots at 1440×900 and 390×844 for every new page — see each
  module's own summary above for specifics (interactive round-trips confirming no
  stale-defaultValues regressions, and two apparent mobile "bugs" that turned out to be
  Playwright `fullPage` screenshot artifacts rather than real defects, caught by
  cross-checking with plain-viewport screenshots).
