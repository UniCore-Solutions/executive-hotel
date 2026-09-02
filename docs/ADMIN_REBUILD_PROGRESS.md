# ADMIN_REBUILD_PROGRESS

> Progress tracker for the new `admin-hotel/` console (Phase 2 of the plan approved
> against [the investigation report](https://claude.ai/code/artifact/9ebec2c4-1366-4ab4-9efc-84502aad27c9)).
> This file is the authoritative live record — update it after every task, in the same
> change, per CLAUDE.md's "Keeping this current".

## Status

| | |
|---|---|
| **Phase** | 2.2 (Inventory) complete; 2.3 (Dashboard) complete; **E-NAV-1, E-ROLES-1, E5 (Rate plans & Availability), E6 (Settings & Media), E7 (Guests & Payments) all complete** |
| **Current module** | E5/E6/E7 built in parallel this session (one agent per module, each in its own worktree off `339e069`), then merged by hand and re-verified as a whole. Next: E-NAV-2 (search/sort/create on `/hotels`), or Promotions (E5, needs rate plans — now unblocked) |
| **Last completed** | E5 (Rate Plans & Pricing, Availability), E6 (Hotel Settings: Profile/Policies/Amenities/Media), E7 (Guests, Payments) |
| **Next READY task** | E-NAV-2 — Hotels list search/filter/sort/create; or E5-T0x — Promotions (rate plans now exist, J-14 unblocked) |
| **Verified against** | Live stack (`hotel-backend` healthy, Flyway V32), 2026-09-02 |

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
2. **Global Hotel Management** (E-NAV-2, not started) — search/filter/sort/paginate on
   `/hotels`, `/hotels/new` create form against the existing REST endpoint.
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
for a `hotel_admin`-scoped view). Not yet wired into a default `docker compose up` —
start it explicitly with `docker compose --profile admin up -d admin`, same convention as
the existing back-office.

| Page | Status | Notes |
|---|---|---|
| `/login` | ✅ redesigned | httpOnly `admin_session` cookie, 7 d; split brand/sign-in panel; shows `?error=not_staff` |
| `/hotels` | ✅ | Server-redirects a single-hotel staff member straight into their hotel; otherwise the global list (`adminHotels`, backend-filtered), client-side name/brand/city search — no server search args exist yet (see J-below). No create form yet (E-NAV-2). |
| `/hotels/[hotelId]/dashboard` | ✅ | 5 headline metrics + 2 labelled "awaiting"/"not yet" metrics + recent reservations. `inHouseToday` intentionally not rendered (always 0 — see below) |
| `/hotels/[hotelId]/reservations` | ✅ | Status filter + server pagination; row click opens a detail sheet; deep-linkable via `?ref=`; cancel with reason |
| `/hotels/[hotelId]/room-types`, `.../room-types/[id]` | ✅ | Create is now a drawer, not `/room-types/new` (gone). Edit: Details / **Rooms (new)** / Amenities / Gallery tabs |
| `/hotels/[hotelId]/rooms` | ✅ | Filterable by room type; create/edit is now a side drawer (`RoomFormSheet`, was a modal `Dialog`); status, housekeeping, maintenance |
| `/hotels/[hotelId]/rate-plans`, `.../rate-plans/[id]` | ✅ | List (`DataTable`) + create drawer (`RatePlanCreateSheet`) + full-page editor (Details / Room-type-&-pricing tabs). One rate plan per room type is a UI/data convention, not a DB constraint — documented as such, not enforced by a unique index. Pricing is inclusive date-range rows (`rate_plan_prices`), not per-day — the price editor is a range editor, not a literal day-grid |
| `/hotels/[hotelId]/availability` | ✅ | Full-page 31-day calendar (today..+30, per J-10, confirmed exactly live), colour-coded to the backend's scarcity rule; block/out-of-order editor (`AvailabilityBlockSheet`) against a real, previously-undocumented REST write path (see Backend gaps) |
| `/hotels/[hotelId]/settings` | ✅ | Full-page Profile / Policies / Amenities / Media tabs. Policies' write path — flagged "unverified" before this session — is confirmed working end to end (real Postgres rows after a real write) |
| `/hotels/[hotelId]/guests` | ✅ | List (`DataTable`) with server-side debounced search on name/email (not phone — schema doesn't support it) |
| `/hotels/[hotelId]/payments` | ✅ | Read-only list (`DataTable`), no search (schema has none). Shows `reservationId` as plain reference text — no drill-down link (no `adminReservation(id)` query exists, NEW-2) |

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
| E2-T04 | Search & date-range filters | **BLOCKED** — needs J-1 (`adminReservations` has no search/date args) |

### Epic E3 — Inventory

| ID | Task | Status |
|---|---|---|
| E3-T01 | Room types list & create | COMPLETED |
| E3-T02 | Room type editor (details / amenities / gallery) | COMPLETED — gallery uses the Q-5 two-step upload workaround |
| E3-T03 | Rooms list, create, edit | COMPLETED |

### Epic E4 — Dashboard

| ID | Task | Status |
|---|---|---|
| E4-T01 | Honest dashboard | COMPLETED |

### Epic E-NAV — Multi-hotel navigation

| ID | Task | Status |
|---|---|---|
| E-NAV-1 | Routing migration: `/hotels`, `/hotels/[hotelId]/...`, workspace guard | COMPLETED |
| E-NAV-2 | Hotels list search/filter/sort/paginate, `/hotels/new` create | NOT_STARTED |
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
| E7-T02 | Payments list | COMPLETED — read-only, no search (schema has none); J-9 corrected (see Backend gaps) |

### Epics E8–E9 — not started

See the investigation report §S for the full breakdown (Users/Audit/Reviews, and the
backend-blocked modules: Front desk, Extras, Content, Invoices, Reports).

## Backend gaps

Carried from the investigation report (§J), plus two discovered during this session.

| ID | Gap | Status | Blocks |
|---|---|---|---|
| J-1 | `adminReservations` has no search or date-range args | OPEN | E2-T04 |
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
