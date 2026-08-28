# IMPLEMENTATION PLAN — next development phase

**Written:** 2026-08-27 · **Status:** plan only, nothing implemented, nothing modified in
source. Grounded in `docs/{PROJECT_CONTEXT,ARCHITECTURE,SERVICES,DATA_FLOW,CURRENT_STATE,
KNOWN_ISSUES,FRONTEND}.md` plus fresh source/schema/live-query verification done for this
plan (evidence cited inline).

---

## 0. Tooling used for this planning session

**Existing Claude Code skills discovered** (`.claude/skills/`, authored in a prior session
of this same project): `backend-spring`, `graphql-contract`, `database-flyway`,
`guest-frontend`, `backoffice-frontend`, `platform-testing`, `platform-ops` — one per
architectural concern, each referencing this repo's actual package layout, ArchUnit
rules, migration numbering, and service conventions (not generic tutorials).

**Used:** all four relevant to this plan (`backend-spring`, `database-flyway`,
`graphql-contract`, `guest-frontend`) were consulted for their constraints — e.g. the
ArchUnit ≤11-constructor-dependency limit on `service/impl/*`, the "migrations are
immutable, always add `Vnext__`" rule, and "GraphQL is primary; REST only for the four
approved splits" — all of which shaped the API/DB proposals below. **Note:** the `Skill`
tool in this session did not recognize them (`Unknown skill`) even though the files are
present and correctly formatted on disk; they were most likely written mid-session in an
earlier turn and this session's skill index was not refreshed. I used their content
directly from the repo files instead of through the tool, and the constraints they encode
are cited by name below. Flagging this as a product observation, not a plan blocker.

**Existing agents discovered:** none in `.claude/agents/`. The repo also carries
`.opencode/agents/*` and `.opencode/skills/*` in both `backend-hotel/` and
`frontend-hotel/` — these belong to a different tool (opencode) and are not invocable by
Claude Code's Agent/Skill tools, but were read as reference material (e.g.
`frontend-hotel/.opencode/skills/hotel-project-facts` for product-copy conventions).

**New agents/skills created this session: none.** The seven existing skills already
partition the work this plan requires (backend, API contract, database, both frontends,
testing, ops) with no overlap and no gap — auth/pricing/hotel-room-model/extras/
phone-country all fall inside `backend-spring` + `database-flyway` + `graphql-contract`
+ `guest-frontend`. Creating a narrower one (e.g. "booking-domain") would duplicate their
content rather than add capability. If a recurring need for cross-cutting **domain
business-rule** guidance emerges (pricing invariants, cancellation policy, promo rules
spanning several files), a `docs/architecture/invariants.md`-grounded skill would earn its
keep then — not speculatively now.

**Root-cause investigation performed for this plan** (new evidence beyond the prior
audits, all via `Bash` — reading entities/migrations/schemas and querying the live
backend/DB): `User`/`Guest` entity fields, the `identity.graphqls` `Me` type surface,
`Country` entity/table (confirmed orphaned — no repository, no GraphQL exposure, only 9
rows), `Hotel`/`RoomType` entity fields (confirmed hotel-level vs room-level split is
already correct), hotel-policy modeling (confirmed absent — only rate-plan-level
cancellation/payment policy text exists), `extras.name` column width, `ExtrasPicker.tsx`
rendering, and the `ReservationGuestInput.countryCode` field (confirmed present in the
schema but never populated by the frontend).

---

## 1. Current product state (compressed; full detail in the linked docs)

Backend is a real, mostly-complete layered Spring Boot monolith over one PostgreSQL
database (54 tables, Flyway V1–V22, live). GraphQL is the primary contract; a handful of
REST splits handle auth bootstrap, media upload, and anonymous reservation self-service.
Guest frontend's booking funnel is genuinely wired to the backend but carries defects at
the seams between migrated and un-migrated code (`docs/FRONTEND.md`, 28 findings, 4 P0).
Back-office is the most complete client. Full detail: `PROJECT_CONTEXT.md`,
`ARCHITECTURE.md`, `CURRENT_STATE.md`.

**This plan's scope is the 13 tasks below**, derived by tracing each of the 10 requested
problem areas through UI → service → API → backend → database, merging duplicates (e.g.
"pricing must be backend-authoritative" and "price breakdown must reflect the backend" are
the same underlying work; "phone" and "country" share one root fix).

---

## 2. Root-cause reasoning, area by area

### Authentication
**Claimed problem:** "incomplete." **Traced:** login/register/JWT/RBAC are real and
correct (`docs/ARCHITECTURE.md` §4, `docs/SERVICES.md`). What's actually missing is two
specific things, both confirmed in the schema:
1. `Me { id email roles hotelIds }` does **not** expose `firstName`, `lastName`, `phone` —
   even though `User.firstName/lastName/phone` exist as columns
   (`V2__identity_rbac.sql`). There is **no** profile-update mutation of any kind.
2. The guest frontend keeps the JWT in a module-level variable (`services/auth.ts:8-9`),
   so a page reload silently logs the user out mid-funnel (`FRONTEND.md` F-8).
**Root cause:** not "auth is unbuilt" — auth is built; the **profile surface on top of
auth** was never built, and the **session storage strategy** was never finished on this
client (the back-office already proves the correct pattern: httpOnly cookie + BFF).
**→ Task 1.**

### Pricing — backend must be authoritative
**Traced:** it already is. Since commit `82c4414` the guest frontend performs zero price
arithmetic (`docs/FRONTEND.md` §1). The existing `quote(input: QuoteInput!): Quote!` query
is the single source of truth: nightly rate resolution, extras, promo, taxes/fees, totals
identity all happen in `PricingServiceImpl` server-side.
**The actual remaining problems are two specific breaks in that already-correct
architecture**, both proven live:
1. **No currency conversion.** `quote` echoes `currencyCode` onto unconverted MAD numbers
   — verified: `currencyCode:MAD/EUR/USD` all return `totalAmount:7290.27`. The frontend
   correctly converts for *display*, then sends the *display* currency and the *MAD*
   number back to `createReservation`/`charge`, persisting wrong money.
2. **The soft-failure contract is unused.** `Quote.valid`/`Quote.message` exist in the
   schema for exactly "promo didn't apply, price is still fine" — but
   `PricingServiceImpl.java:183` hardcodes `valid=true` and every failure `throw`s
   instead, so an invalid promo kills the *entire* quote rather than just skipping the
   discount, and the frontend's designed `else` branches are dead code.
**Root cause:** not "pricing needs an API" (it has one, and it's correctly the sole
authority) — it's that the currency and promo-failure paths through that already-correct
API were never finished. **→ Tasks 2, 6.**

### Hotel Details / Room Details / data model
**Traced the actual schema** (not the frontend fixture): `Hotel` (hotel-level: address,
star rating, check-in/out times, `hotel_amenities`, media) vs `RoomType` (room-level:
`maxAdults/maxChildren`, `bedConfiguration`, `sizeSqm`, `viewType`, its own
`room_type_amenities`, its own media) are **already correctly separated** — this is not a
data-model defect. A purpose-built aggregation query, `hotelDetails(id): HotelDetails`
(hotel + experiences + restaurants + faqs + reviews + reviewsCount + averageRating in one
round trip), **already exists and is never called** — `HotelDetail.tsx` instead issues
4-6 separate queries and the FAQ/restaurants sections still render fixture content
(`FRONTEND.md` F-17).
**One genuine model gap, confirmed absent from every migration and schema file:**
hotel-level **guest policies** (children policy, pets, smoking, extra beds, age
restrictions — what the fixture's `PROPERTY.policies` array currently fakes). Only
rate-plan-level `cancellationPolicy`/`paymentPolicy` free text exists
(`rate.graphqls`). This is a real, scoped database gap, not a frontend layout problem.
**Root cause:** not "redesign the data model" — the model is sound; **wire the existing
aggregation query, and add the one missing policy concept.** **→ Task 7** (Room Details
needs no comparable schema work — **Task 8** is verification + fixture removal only).

### Extras / services breakdown truncation
**Traced the actual names, not assumed ones:** live seed data tops out at 24 characters
("Breakfast at the Terrace"); the column is `VARCHAR(150)` so much longer names are
legal and must be handled defensively. `ExtrasPicker.tsx` applies unconditional CSS
`truncate` in both its compact and full layouts, cramming icon + checkbox + name + price +
unit into one flex row inside a 400px booking sidebar. Separately, the **pre-booking**
`QuoteTable` doesn't itemize extras at all — it collapses everything into one aggregate
"Extras & services" line, even though the names/quantities/prices are already sitting in
client state (`extrasSel`, `extrasList`) — no data or API gap. The **post-booking**
reservation view *does* itemize by name (`ReservationFlow.tsx:328`) correctly.
**Root cause:** not a data or API problem at all — 100% frontend CSS/layout, on data
already present. **→ Task 9.**

### Booking user data (phone, country) + phone/country UI
**Traced exactly what "already exists in the backend" means:** `users.phone` and
`guests.phone`/`guests.country_code` are real columns — but:
- `AuthServiceImpl.register()` never writes `phone` on the `User` it creates.
- `GuestProvisioningServiceImpl.provision()` never writes `phone`/`countryCode` either.
- `Me` doesn't expose `phone` at all (see Authentication above).
- `BookingFlow.tsx`'s Country `<select>` holds 11 hardcoded **country names**
  ("Morocco", "Germany", …) and — confirmed by reading the submit handler —
  **is never sent to the API at all**. `ReservationGuestInput.countryCode: String` exists
  and expects an ISO alpha-2 code (`guests.country_code CHAR(2) REFERENCES
  countries(code)`), but nothing in the frontend produces that code.
- **Latent DB trap, confirmed live:** `countries` has only **9 rows**
  (`FR IT MA PT SA ES AE GB US`). The frontend's own hardcoded list already includes
  Germany, Netherlands, Belgium, Canada — **4 of its 11 options would violate the FK**
  on `guests.country_code` the instant anyone actually wired it up.
- `PHONE_RE` in `lib/validation.ts` is a bare regex requiring the guest to type their own
  `+countrycode` prefix by hand — no library, no linkage to the (disconnected) Country
  field.
**Root cause:** not "these fields need to be built" (columns exist) and not "just connect
the UI" (the UI's country data shape doesn't match what the column/FK expects, and the
reference table is 20x too small for a real country selector). **→ Tasks 10, 11, 12.**

### Booking price breakdown
Already covered under Pricing — the breakdown already displays the backend's authoritative
numbers (`QuoteTable` renders `PriceBreakdown` derived 1:1 from the `quote`/reservation
response, no client math). The only defects are the currency mislabeling (Task 2) and the
missing extras itemization (Task 9), both already scoped above.

---

## 3. Mock-data replacement plan

| Feature | Mock source | Why mocked | Real API available? | Backend work needed | DB work needed | FE work needed | Priority |
|---|---|---|---|---|---|---|---|
| Check-in | `setTimeout(900)` | never built | No | new `checkInReservation` mutation + `check_ins` writer | none (table exists, empty) | replace timeout with mutation | P2 |
| Newsletter | `localStorage` | never built | No | new endpoint + persistence | new table or reuse `guests`/a subscription flag | swap service | P2 |
| Contact form | no-op | never built | No | new endpoint or email provider | none | swap component | P3 |
| Password reset | canned string | never built | No | new mutations + **email provider (none exists anywhere)** | none | wire `auth.reset()` | P3 (blocked on email infra — out of this plan's scope, flag for a future ADR-004 implementation) |
| Offers page | fixture `OFFERS` (5 fake codes) | integration left mid-stream | **Yes** — `offers(hotelId)` already works per-hotel | none | none | call `pricingHydration` on the page, delete fixture | P1 (Task 6) |
| Extras seed (RoomDetails only) | `EXTRAS` fixture as initial state | leftover from migration | Yes — `extras(hotelId)` already used elsewhere in the same component | none | none | delete the fixture seed line | P1 (Task 9) |
| FAQ, restaurants | fixture | integration left mid-stream | **Yes** — `faqs`/`restaurants`/`hotelDetails` already exist | none | none | wire `HotelDetail.tsx` | P1 (Task 7) |
| Hotel policies | fixture `PROPERTY.policies` | never built | No | new `hotelPolicies(hotelId)` query + admin mutation | new table (or JSONB column) | render real data | P2 (Task 7) |
| Currency conversion server-side | frontend `lib/format.ts` FX table | never built; backend never intended to convert | N/A — by design MAD-only per `.env.example`/`terms` page | **stop the frontend from asserting otherwise** (send MAD) | none | Task 2 | **P0** |
| Country reference | 11-name hardcoded array | never built | Partial — `countries` table exists but is 20x too small and unexposed | expose + widen, or drop the FK | seed full ISO-3166-1 | swap to a library-bundled list | P1 (Task 12) |
| Guest profile (phone/country prefill) | re-typed every booking | never built | Partial — columns exist, no query/mutation | add `Me` fields + `updateMyProfile` | none | prefill form, persist | P1 (Task 10) |
| Demand/"Recommended" sort | `hashStr(id) % 1000` | placeholder | No | a real popularity/availability-pressure signal | none obviously required (could derive from `availability`) | replace `demandFor` | P2 (unchanged from FRONTEND.md, not detailed further here — out of this plan's 10 requested areas) |

---

## 4. Task blocks

### Task 1 — Auth: profile surface + session persistence
**Priority:** P1 (P0 for the session-loss half — it breaks the booking funnel mid-flow)
**Root cause:** see §2 Authentication.
**Current:** `Me` exposes only `id/email/roles/hotelIds`; no update path; guest JWT lives
in a JS variable and dies on reload.
**Expected:** signed-in guests see their name/phone pre-filled everywhere, can edit it
once, and stay signed in across reloads.
**Backend changes:**
- `identity.graphqls`: add `firstName: String`, `lastName: String`, `phone: String` to
  `Me`; add `input UpdateProfileInput { firstName lastName phone }` and
  `updateMyProfile(input: UpdateProfileInput!): Me!` to `Mutation`.
- `AuthServiceImpl.currentUserOf`/`IdentityAdminService` (or a new `ProfileService` if
  keeping `IdentityAdminService` admin-only is preferred per its name) resolves/updates
  `User` fields; propagate the phone onto the linked `Guest` via
  `GuestProvisioningService` so `findOrCreateGuest` in `BookingServiceImpl` picks it up.
  *(ArchUnit note: check the target service's existing constructor-dependency count
  before adding this — the `backend-spring` skill's ≤11 rule applies.)*
**Database changes:** none — `users.phone` and `guests.phone`/`country_code` already exist.
**API changes:** the two schema additions above.
**Frontend changes:** `services/auth.ts` reads `me.phone` after login/register and
prefills `BookingFlow`'s `details` state; replace the module-variable session with an
httpOnly-cookie BFF pattern copied from `backoffice-hotel/src/lib/session.ts` +
`app/api/graphql/route.ts` (new `frontend-hotel/src/app/api/auth/*` route handlers).
**Dependencies:** none — can start immediately. Task 10 depends on this.
**Files:** `identity.graphqls`, `AuthServiceImpl.java` (or new service), `services/auth.ts`,
`context/SessionContext.tsx`, new `app/api/auth/*` route handlers, `Header.tsx` (read
`useSession()` instead of polling `readSession()` — fixes `FRONTEND.md` F-8's second half).
**Testing:** backend integration test asserting `updateMyProfile` persists to both `users`
and the linked `guests` row; frontend test that a reload after login keeps `session`
non-null.
**Acceptance:** sign in, reload the page, session persists; edit phone once in account
settings, it appears pre-filled on the next booking.

### Task 2 — Currency correctness *(P0, do first)*
Full detail already in `docs/FRONTEND.md` §6 item 1 — unchanged by this pass, restated
because it's this plan's top priority.
**Fix:** `getQuote`, `createReservation`, `charge` always send `currencyCode: 'MAD'`;
`useCurrency().fmt` stays display-only, matching what `.env.example` and
`app/terms/page.tsx:37` already claim the product does.
**Files:** `services/quote.ts`, `BookingFlow.tsx:194,300,321`, `RoomDetails.tsx:284`.
**Backend/DB changes:** none required for the fix. *(Larger alternative — real
server-side FX with a rate snapshot per reservation — is a separate backend project; not
in this plan's scope unless the product decides display-currency billing is required.)*
**Testing:** book in EUR display mode; assert the persisted `reservations.currency_code`
is `MAD` and `total_amount` matches the MAD quote.
**Acceptance:** switching currency changes only the *display* figures on every screen
including the final receipt; the DB row and the charged amount never change with it.

### Task 3 — Booking/payment atomicity *(P0)*
**Fix (immediate, frontend-only):** hoist `generateIdempotencyKey()` into a `useRef`
created once per booking session so a retry after a decline reuses the key — the backend's
existing `findByIdempotencyKey` short-circuit then returns the same reservation instead of
creating a second one.
**Fix (complete, needs backend — separate follow-up, not blocking Task 3's frontend fix):**
introduce a `pending` reservation state and a cancel-on-decline or hold-expiry path; today
`BookingServiceImpl.create` only ever assigns `confirmed`.
**Files:** `BookingFlow.tsx:296-347`.
**Dependencies:** none.
**Testing:** decline a card twice in the same session; assert exactly one `reservations`
row and one `availability` decrement.

### Task 4 — Wrong-stay availability *(P0, trivial)*
**Fix:** pass `checkout: state.checkout` and `rooms: state.rooms` at all three
`getStayRoom` call sites (currently omitted, so `stayInputOf` silently defaults to a
one-night, one-room stay).
**Files:** `RoomDetails.tsx:196,214`, `BookingFlow.tsx:123`.
**Testing:** block inventory on night 3 of a 4-night stay via the back-office; the room
page must show "Sold out", not "Available".

### Task 5 — Post-payment confirmation handoff *(P0, trivial)*
**Fix:** redirect to `/confirmation?ref=…&email=…`; `ConfirmationFlow` prefers
`reservations.find(ref, email)` over the auth-gated `myReservations`.
**Files:** `BookingFlow.tsx:342`, `ConfirmationFlow.tsx:66-77`.
**Testing:** complete an anonymous booking; confirmation renders without re-prompting.

### Task 6 — Pricing soft-failure contract + promo reconciliation *(P1)*
**Root cause:** see §2 Pricing, point 2, plus §2's promo-specific findings.
**Backend changes:**
- `PricingServiceImpl.applyPromo`: on an *unknown/inapplicable* code, return
  `Quote{valid:false, message:"..."}` instead of throwing `DomainException.validation`.
  Keep throwing for structural errors (unknown room/hotel/rate plan) — those aren't
  user-recoverable the way a bad promo is.
- `rate.graphqls` `Quote`: expose the already-existing Java `promoMessage` field.
**Database changes:** none.
**Frontend changes:**
- Call `ensurePricingSources()` (and **await** it) in `SearchResults.tsx` and
  `OffersGrid.tsx`, not just `PromoField`/`RoomDetails`.
- Delete `OffersGrid`'s fixture-driven `OFFERS` import; source offers via
  `pricingHydration`'s already-working per-hotel fan-out (no new API needed — `offers`
  already fans out correctly, confirmed live).
- Give `graphqlClient.GraphqlClientError` a `code` field from
  `errors[0].extensions.code` (copy the pattern already correct in
  `backoffice-hotel/src/lib/api.ts`); branch `NOT_FOUND` vs `VALIDATION` vs other in
  `ReservationFlow`, `CheckinFlow`, `ConfirmationFlow`, `RoomDetails.tsx:224,294`,
  `BookingFlow.tsx:207` (fixes the dead "not found" branches, `FRONTEND.md` F-6/F-7).
**Dependencies:** none.
**Testing:** apply a stale/wrong-hotel promo — the quote must still render with a
"promo not applied: …" message, not fail entirely; a genuinely unknown reservation
reference must show "not found" copy, not "check your connection".
**Acceptance:** `/offers` codes actually apply on `/search` and room pages; an invalid
promo degrades gracefully; not-found and validation errors show their real messages.

### Task 7 — Hotel Details: wire the real aggregation + add policies *(P1)*
**Root cause:** see §2 Hotel Details.
**Database changes:** new table, following the existing `faqs`/`experiences` pattern for
consistency and admin-CRUD-ability (preferred over overloading `hotels.config jsonb`,
which exists but would make policies unstructured and unfilterable):
```sql
CREATE TABLE hotel_policies (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    hotel_id    BIGINT NOT NULL REFERENCES hotels(id),
    category    VARCHAR(40) NOT NULL,   -- children, pets, smoking, extra_bed, age_restriction
    label       VARCHAR(150) NOT NULL,
    description TEXT,
    sort_order  INT NOT NULL DEFAULT 0
);
```
(next Flyway version — see §5 for exact numbering once Task 12's migration is placed.)
**API changes:** `catalog.graphqls`: `type HotelPolicy { id category label description
sortOrder }`; add `policies: [HotelPolicy!]!` to `HotelDetails`; admin
`setHotelPolicies(hotelId: ID!, policies: [HotelPolicyInput!]!): [HotelPolicy!]!`
mutation, mirroring `setHotelAmenities`.
**Backend changes:** `CatalogQueryServiceImpl`/`CatalogAdminServiceImpl` +
`HotelPolicyRepository`; include in the existing `hotelDetails` resolver.
**Frontend changes:** replace `HotelDetail.tsx`'s per-field fixture reads for FAQ/
restaurants/policies with one `hotelDetails(id)` call (deleting 3-5 of its current
separate round trips); render `HotelPolicy[]` where `PROPERTY.policies` is read today.
**Dependencies:** none for FAQ/restaurants (schema already supports it — pure frontend);
policies need the migration above first.
**Testing:** backend integration test for `hotelDetails` returning policies; frontend
test that the hotel page for hotel #2 shows hotel #2's *own* FAQ, not the fixture's.
**Acceptance:** every "About this hotel" section on `/hotel?hotelid=…` is 100%
database-sourced, and admins can add/edit hotel policies from the back-office.

### Task 8 — Room Details: fixture cleanup, no schema change *(P2)*
**Root cause:** see §2 Hotel/Room Details — the room-level model is already correct.
**Frontend changes only:** delete `RoomDetails.tsx:150`'s `useState<Extra[]>(EXTRAS)`
fixture seed (fixes the `airport-shuttle`-style slug IDs leaking into a UUID-expecting
quote, `FRONTEND.md` F-5) — this overlaps with Task 9's data-flow fix and should land in
the same change.
**Backend/DB/API:** none.
**Testing:** open a room detail page before extras finish loading; the picker must show
no items (or a loading state), never fixture rows.

### Task 9 — Extras/services breakdown UX *(P1, frontend-only)*
**Root cause:** see §2 Extras — 100% CSS/layout on data already in hand; no truncation
library, popover, or modal is warranted given real names are short today, but the fix
must be robust against the `VARCHAR(150)` ceiling.
**Frontend changes:**
- `ExtrasPicker.tsx`: replace `truncate` with `line-clamp-2 break-words` (or a
  `min-w-0` flex fix) on the name span in both compact and full layouts; keep price/qty
  controls from being squeezed by giving the name column `flex-1 min-w-0` and the price
  column a fixed `shrink-0` width — the current price/unit block is what forces the name
  into single-line truncation.
- `QuoteTable.tsx`: itemize selected extras as individual rows (name · qty · unit price ·
  line total) instead of one aggregate "Extras & services" figure — the data
  (`extrasSel`, `extrasList`) is already client-side; no new prop needed beyond what
  `BookingFlow`/`RoomDetails` already hold.
- Add a `title={extra.name}` attribute as a defensive fallback for a hypothetically very
  long admin-entered name, without building a popover/modal for a problem the current
  content doesn't actually have.
**Backend/DB/API:** none.
**Dependencies:** none; can land alongside Task 8.
**Testing:** a visual/component test with a synthetic 60-character extra name renders on
two lines without clipping and without breaking the row layout.
**Acceptance:** every extra name is fully readable in both the picker and the itemized
quote breakdown, at every supported viewport width.

### Task 10 — Booking user data: canonical phone/country *(P1)*
**Root cause:** see §2 Booking user data.
**Depends on:** Task 1 (`Me.phone`, `updateMyProfile`) and Task 12 (real country codes).
**Backend changes:** covered by Tasks 1 and 12 — no additional backend work here beyond
making sure `BookingServiceImpl.findOrCreateGuest` also copies `countryCode` onto a
newly-created `Guest` when the session user's profile has one set (currently it copies
none of the profile forward).
**Frontend changes:** `BookingFlow.tsx`'s `details` initial state pulls `phone`/`country`
from `useSession()` when signed in (today it only pulls `first`/`last`/`email`); the
country field switches to the Task 12 selector and its value is sent as
`guest.countryCode` in `reservations.create()` (currently **not sent at all**).
**Dependencies:** Task 1, Task 12.
**Testing:** a signed-in guest with a saved profile phone/country sees both pre-filled on
the booking form; the persisted `reservation_guests`/`guests` row has a real ISO
`country_code`, not null.
**Acceptance:** returning guests stop re-typing phone and country on every booking, and
the value that reaches the database is correct, not silently dropped.

### Task 11 — Phone number field *(P1, frontend + no backend change)*
**Root cause:** see §2 — free-text `+countrycode` entry, no library, no link to country.
**Recommendation:** `react-phone-number-input` (wraps `libphonenumber-js`) — actively
maintained, no runtime dependency conflicts with React 19/Next 16 (peer-dep only on React
≥16.8), gives country flag + calling-code dial UI, E.164 normalization, and validation, all
without server calls. *(Not installed in this session per the "do not install
dependencies" rule — this is a recommendation for the implementation phase.)*
**Storage:** normalize to **E.164** (`+212600000000`, max 15 digits + `+` = 16 chars) —
fits `users.phone VARCHAR(30)` and `guests.phone VARCHAR(30)` with no migration needed.
**Backend/DB changes:** none.
**Frontend changes:** replace the plain `<Input type="tel">` + `PHONE_RE` in
`BookingFlow.tsx` (and the account-settings field introduced by Task 1) with the library
component; `lib/validation.ts` `validPhone` delegates to the library's `isValidPhoneNumber`
instead of the current regex.
**Dependencies:** pairs naturally with Task 12 (same component often drives both).
**Testing:** enter a Moroccan and a French number without typing `+` manually; both
normalize correctly and pass validation; an incomplete number is rejected with a clear
message.

### Task 12 — Country selector *(P1, frontend + a small, low-risk migration)*
**Root cause:** see §2 — mismatched data shape (name vs ISO code) *and* a reference table
20x too small for its own FK to be usable.
**Recommendation:** do **not** duplicate a country list server-side for this purpose —
`react-phone-number-input`/`libphonenumber-js` already bundle the full ISO-3166-1 set with
names and calling codes; use that as the single source for the searchable selector, and
send only the resulting ISO alpha-2 **code** to the API.
**Database changes (required to make the *existing* FK usable, not to invent a new
feature):**
```sql
-- V23__seed_full_country_list.sql (next available version — confirm against HEAD before
-- implementation, since the working tree may have moved V21/V22 by then)
-- Insert the remaining ISO-3166-1 alpha-2 codes/names not already present.
```
Widen `countries` from 9 rows to the full ISO-3166-1 list (~249 rows, well-known static
data, no external call needed — can be scripted from `libphonenumber-js`'s own metadata to
guarantee the two lists never diverge). This is additive and low-risk: it only adds rows,
touches no existing FK behavior, and turns a currently-guaranteed-to-fail FK into a
working one.
*(Alternative considered and rejected: drop the FK entirely and validate in the app layer
only. Rejected because the FK is cheap correctness the database already offers, and the
real fix — seeding the reference table properly — is barely more work.)*
**API changes:** none required — `ReservationGuestInput.countryCode` already accepts the
value; no new query needed since the country *list* lives client-side in the phone
library, not fetched from the backend.
**Frontend changes:** replace `BookingFlow.tsx`'s `COUNTRIES` name array with the phone
library's country data (searchable combobox, not a native `<select>` of 200+ options);
send the ISO code as `guest.countryCode`.
**Dependencies:** should land with or after Task 11 (same UI surface, often the same
component drives both).
**Testing:** select Canada — the code sent must be `CA` and must be present in
`countries` post-migration (today it would violate the FK and fail).
**Acceptance:** the country field is searchable, keyboard-accessible, sends a real ISO
code, and every code the frontend can produce is valid against the database.

### Task 13 — Extend Task 6's error-code plumbing to the rest of the app *(P2)*
Once `GraphqlClientError.code` exists (Task 6), apply the same NOT_FOUND/VALIDATION
branching to `CheckinFlow.tsx:41` and any other `.catch(() => generic message)` site
identified in `FRONTEND.md` §4 (F-6 lists all four consumers). Rolled into Task 6's file
list already; called out separately here only so it isn't dropped from tracking once
Task 6's headline items (promo, offers) are done.

---

## 5. Database changes (consolidated)

| Change | Task | Type | Risk |
|---|---|---|---|
| `hotel_policies` table | 7 | new table, additive | Low |
| Widen `countries` seed to full ISO-3166-1 | 12 | additive data only | Low |
| *(none)* — `users.phone`, `guests.phone`, `guests.country_code`, `extras.name` all already sufficient | 1, 9, 10, 11 | — | — |

No column type changes, no destructive migrations, no FK drops. Both new migrations are
purely additive and can be reviewed independently. **Exact version numbers must be
confirmed against `flyway_schema_history` at implementation time** — the working tree
audited here already carries uncommitted `V21`/`V22`; do not assume `V23` is still free.

## 6. API changes (consolidated)

| Capability | Existing? | Change | Task |
|---|---|---|---|
| `Me.firstName/lastName/phone` | No | add fields | 1 |
| `updateMyProfile` mutation | No | add | 1 |
| `Quote.valid`/`message` used correctly | Schema yes, behavior no | fix `applyPromo` to return soft failure | 6 |
| `Quote.promoMessage` | Java yes, GraphQL no | expose field | 6 |
| Offers per hotel | **Yes, already works** | none — frontend wiring only | 6 |
| `HotelDetails.policies` | No | add type + field + admin mutation | 7 |
| `hotelDetails` aggregation | **Yes, already exists** | none — frontend wiring only | 7 |
| `faqs`/`restaurants` | **Yes, already exist** | none — frontend wiring only | 7 |
| Country reference query | Table exists, no query | **not needed** — client-side list used instead | 12 |
| `ReservationGuestInput.countryCode` | **Yes, already exists** | none — frontend must start sending it | 10, 12 |

Notable pattern: **three of the ten problem areas need zero new backend capability** —
`hotelDetails`, `faqs`, `restaurants`, and per-hotel `offers` already exist and are simply
unconsumed. This is the single most important finding of the API review: before building
anything new, wire what's already built.

## 7. Frontend changes (consolidated)

Every task above lists its own files. No new frontend architecture is required — no new
routes, no new context providers beyond the session-BFF work in Task 1, and no new
dependency beyond the phone-number library in Task 11.

## 8. Testing requirements

- **Backend:** integration test per new/changed resolver (`updateMyProfile`,
  `hotelDetails.policies`, the `Quote` soft-failure path) in
  `src/test/.../integration/`, using `TestcontainersConfiguration` per the
  `database-flyway`/`backend-spring` skills' conventions. The two pre-existing
  `ModuleArchitectureTest` failures (`StaySearchGraphQLController` bypassing the service
  layer) are **not in this plan's scope** but should not be made worse by it — any new
  controller code added here must go through a `service/` interface.
- **Frontend:** extend the existing Vitest suite (63 tests today, none covering the
  quote/booking/payment chain or currency — a gap this plan's P0 tasks should close) with
  cases for: idempotency-key reuse (Task 3), currency pass-through (Task 2), promo soft
  failure (Task 6), and extras itemization (Task 9).
- **E2E:** `docs/FRONTEND.md` §7 already flags the Playwright suite as targeting a retired
  fixture world (hardcoded room slugs, a deleted hash function) — **do not extend it
  as-is**; it needs its own remediation pass before it's trustworthy for these tasks,
  which is out of this plan's scope but should be sequenced before Task 2/3/4/5 are
  considered "done" in the release sense, not just "coded."

## 9. Prioritized roadmap

**P0 — do first, blocking or money-incorrect:** Task 2 (currency) → Task 3 (booking
atomicity) → Task 4 (wrong-stay availability) → Task 5 (confirmation handoff). All four
are small, frontend-only, and independent of each other — they can be done in parallel by
different people, but Task 2 should land first since it's the one silently corrupting
data today.

**P1 — high, major functionality incomplete or disconnected:** Task 1 (auth
profile/session), Task 6 (pricing soft-failure + promo), Task 7 (hotel details
aggregation + policies), Task 9 (extras UX), Task 10 (canonical phone/country), Task 11
(phone library), Task 12 (country selector).

**P2 — medium:** Task 8 (room details cleanup), Task 13 (error-code plumbing rollout).

**P3:** newsletter, contact form, password reset (all blocked on backend infrastructure
that doesn't exist yet — email provider — and are explicitly out of this plan's requested
scope, listed in §3 for completeness only).

## 10. Dependencies between tasks

```
Task 2 (currency)         — independent
Task 3 (atomicity)        — independent
Task 4 (wrong-stay avail) — independent
Task 5 (confirm handoff)  — independent
                                                     ┌─→ Task 8  (room cleanup, shares a line with 9)
Task 1 (auth profile) ────┬─→ Task 10 (canonical     │
                          │    phone/country) ────────┤
Task 12 (country data) ───┘                          │
Task 11 (phone lib) ──────────────────────────────────┘  (10, 11, 12 land together)

Task 6 (pricing soft-fail + promo) ─→ Task 13 (roll the error-code pattern out further)

Task 7 (hotel details) — independent, but its policies half needs its migration merged
                          before or alongside Task 12's migration (coordinate Flyway
                          version numbers, don't let them collide)
Task 9 (extras UX) — independent; natural to pair with Task 8 (same component)
```

## 11. Phased roadmap

**Phase 1 (this sprint):** Tasks 2, 3, 4, 5 — all P0, all frontend-only, all
independent, all small. Ship together or in any order; each is individually shippable.

**Phase 2 (next):** Task 1 first (unblocks Task 10), Task 12's migration + Task 11's
library (unblocks Task 10's country half), then Task 10 to close the loop. In parallel:
Task 6 (pricing soft-fail/promo — no dependency on Phase 2's other work) and Task 7
(hotel details — independent, but sequence its migration against Task 12's).

**Phase 3 (after):** Task 9 + Task 8 together (same component, no dependencies blocking
them — could actually move into Phase 1 or 2 in parallel since they're fully
independent; sequenced last here only because they're the lowest-severity items, not
because anything blocks them). Task 13 as the tail of Task 6.

**Not phased — explicitly deferred:** newsletter, contact form, password reset. Each
needs backend infrastructure (a persistence model, an email provider) that doesn't exist
anywhere in this repository yet; bringing in an email provider is a decision-sized piece
of work in its own right (see the already-`proposed`-but-never-implemented ADR-004) and
shouldn't be scoped incidentally inside this plan.

## 12. Single recommended first implementation task

**Task 2 — currency correctness.** It is the only finding in this entire plan that
silently writes *wrong money* into the database today, it is reachable from a control on
every single page (the currency switcher in the Header), it requires no backend or
database change, it touches four files, and fixing it does not conflict with or block any
other task in this plan. Do it before anything else.
