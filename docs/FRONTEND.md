# FRONTEND (guest site) — verified state

**App:** `frontend-hotel/` · Next.js 16 App Router · 125 TS/TSX files · ~19 300 lines
**Audited:** 2026-08-27, against the on-disk working tree, the running backend on :8180,
the seeded database, and a live dev server on :3100.

> **Update (hotel identity + gallery, 2026-08-28).** The single-property identity is
> now ONE hotel entity: **Executive Hotel** (backend V30 renamed the canonical hotel
> record, its media alt texts, the platform description and the hero copy; `seed.sql`
> matches). The guest frontend was aligned to the same source of truth:
> - `layout.tsx` metadata + JSON-LD are derived from the canonical hotel
>   (`generateMetadata`), not hardcoded — the old "Azure Bay Resort" strings are gone
>   everywhere (offers/faq/booking page metadata too).
> - Header/Footer brand come from the canonical hotel entity first (`hotel?.name ??
>   platform?.name`), with no hardcoded brand fallback; the logo alt is dynamic.
> - `HotelDetail` switched from the dark transparent-header hero to a solid light
>   header: the gallery now sits below the navigation (`pt-28`), reads as one
>   self-contained section, and no longer mixes with the nav. Room page got the
>   same fixed-header offset.
> - `PhotoGallery` layout: desktop/tablet = one large + exactly two stacked tiles
>   (object-cover, one rounded container, gap); mobile = main photo + horizontal
>   snap carousel of all photos; "View all N photos" sits over the bottom-right
>   tile and opens the lightbox with the real count.

> **Update (hotel→room→booking redesign, 2026-08-28):** the guest journey was
> redesigned and the data plumbing completed end to end:
> - **`/booking` no longer crashes.** It 500'd on SSR (`useApollo must be used inside
>   <ApolloProvider>`): `useApollo()` threw because the root `ApolloProvider` hands out
>   `null` during SSR (the Apollo cache is browser-only), and `/booking` — unlike
>   `/reservation`/`/confirmation` — rendered `BookingFlow` outside a `<Suspense>`
>   boundary. Fixed both ways: the page now wraps it in Suspense, and `useApollo()`
>   returns `null` instead of throwing (`api/apollo/provider.tsx`).
> - **No fake "0 MAD" prices.** The room page's date-less placeholder total was
>   removed; without dates the booking card shows an explicit "choose your dates"
>   state instead of a locally-computed total (`RoomDetails.tsx`).
> - **Taxes are fully backend-itemized.** `Quote.charges[]` (name/type/amount from
>   `tax_fee_types`) is exposed in the GraphQL schema (`rate/rate.graphqls`) and
>   rendered as itemized rows; the client-side "Taxes & fees (17%)" percentage label
>   is gone. The backend remains the only money source.
> - **Countries are backend-served.** New `countries` GraphQL query (code + name +
>   calling code; `V28__country_calling_codes.sql` seeds calling codes from
>   libphonenumber-js). `CountrySelect` is now a searchable combobox
>   (`ui/CountryCombobox.tsx`) fed by the backend; `PhoneField` was rebuilt on the
>   same data + libphonenumber-js formatting (E.164 output unchanged).
> - **Arrival slot + special requests are persisted.** New `arrivalSlot`/
>   `specialRequests` on `CreateReservationInput` (`V29`), sent by `BookingFlow`
>   (they were previously collected and silently dropped).
> - **Reservation views show the real room.** `ReservationRoomLine.roomTypeName` +
>   `roomTypeImageUrl` (backend field resolvers) replace the hardcoded "Room" /
>   broken image; confirmation JSON-LD and the .ics use the real hotel name.
> - **Room view is a dedicated experience.** When `?roomId=` is set, the hotel
>   gallery, hotel identity block and the duplicated breadcrumb are hidden
>   (`HotelDetail.tsx`); `RoomDetails` leads with a room header (badges/title/
>   facts/description), then gallery + booking card, with "Room essentials" and
>   "Good to know" stacked vertically instead of side-by-side.
> - **Booking page context.** Breadcrumb is now Home / hotel / room / Booking
>   (client-rendered from the resolved stay); the sidebar shows the hotel name;
>   guest-details groups were restructured ("Arrival & requests" no longer uses the
>   floating-legend hack).
> - **Hotel page:** room-grid cards carry the stay state (`hotelRoomURL`) and show
>   "from X/night" instead of a locally-multiplied `price × nights` total.
> - **Cleanup:** one FX table (`lib/format.ts` env-driven; `catalog.ts` imports it),
>   room-level cancellation hardcode removed, fixture-slug extras caps removed,
>   offer mapping (`NIGHT`/`eligiblePlans`) simplified, header/footer phone comes
>   from the hotel record, mock constants deleted, stale booking-page breadcrumb
>   removed.
> - Verified: `tsc --noEmit`, `eslint`, `vitest` (73/73), `next build` all clean;
>   live SSR checks on all guest routes (booking/hotel/room/search/reservation/
>   confirmation/account/checkin → 200). Backend schema changes are built, tested
>   (169/169), deployed and live-verified (countries, Quote.charges, room identity,
>   arrival/requests round-trip).

> **Update (GraphQL read consolidation, 2026-08-28):** guest reads now flow through
> the Apollo cache where it matters (`reservations.find/list` via `client.query`
> cache-first; REST writes evict via `src/api/invalidation.ts`), `getStayRoom`/
> `getStay` were rebuilt on a single `staySearch` round trip (was 5 queries), the
> runtime string-built `StayBatch` query was deleted, `HotelSummary`/
> `RoomTypeSummary` fragments replaced the duplicated selections, dead queries
> (`HotelReviews`, `HotelExperiences`, `Hotels`) and the unrendered
> `Homepage.featuredHotels` selection were removed, `PlatformBySlug` is memoized
> per session, and promo hydration is one cached offers request via the canonical
> hotel. Room page first load: 9 → 4 requests; stay-edit refresh: 5 → 1. The
> Apollo hooks module (`src/api/graphql/hooks.ts`) remains available for future
> component-level migration; RSC reads stay on the server helper.

> **Update (canonical single-hotel task):** the guest site is now a single-property
> platform. The hotel picker / destination selector is GONE (SearchBar shows a static
> canonical-hotel segment; `DestinationPicker.tsx`, `services/hotelList.ts` and
> `graphql/hotelList.graphql` were deleted; `SearchState.destination` removed). The
> index page renders the canonical property entirely from the backend — no collection
> section, no fixture fallbacks for hero facts/rooms/offers/reviews, and
> `services/homepage.ts` no longer swallows backend failures. `/hotel` without a
> `hotelid` redirects server-side to the canonical property (the fixture "Executive
> Hotel, Rabat" legacy page is gone, as are `RoomsGrid.tsx`, `FeaturedHotels.tsx`,
> `/index-2`, `DiscoverSection.tsx` and `services/siteSearch.ts`). FAQ and offers pages
> are backend-driven. `canonicalHotel` is the new single-property contract. Matrix rows
> and defects marked below reflect this.

Every claim below was traced UI → hook/context → service → GraphQL document → backend
resolver → database, or reproduced against the running system. Where something could not
be proven it is marked **UNVERIFIED**.

---

## 1. Architecture as built

```
src/app/            18 routes. Server Components for shell/metadata/SSR fetches;
                    'use client' islands for every interactive flow.
src/components/     ui · layout · home · hotel · room · search · booking · account
                    · auth · offers · chatbot(EMPTY)
src/context/        SearchContext (URL-mirrored stay state) · SessionContext
                    · ToastContext · ModalContext
src/services/       THE data seam — 20 modules; components never call fetch directly
src/graphql/        10 .graphql operation files + codegen `generated/`
src/lib/            dates (URL codec) · format (FX) · filters · validation · links
                    · extras · ics · qr · utils
src/constants/      i18n · icons · navigation · booking · search
src/types/          domain types
src/data/           index.ts — 641-line static fixture ("Executive Hotel", Rabat)
e2e/                12 Playwright specs (STALE — see §7)
```

**Empty leftover directories** (committed as scaffolding, never implemented):
`src/app/api/{auth,chat,extras,newsletter,offers,reservations,rooms,search}/`,
`src/features/{account,auth,booking,chatbot,hotels,rooms,search}/`, `src/config/`,
`src/components/chatbot/`. **There are no route handlers in this app** — it is not a BFF.

### Transport

`src/services/graphqlClient.ts` is the single transport.
- Browser → same-origin `/graphql`, rewritten by `next.config.ts` to `API_INTERNAL_URL`
  (**baked at build time**).
- Server components → the backend directly.
- Always `cache: 'no-store'`; attaches `Authorization: Bearer` from the in-memory token.
- Throws `GraphqlClientError` whenever the response carries **any** `errors[]` entry —
  even when `data` is partially populated. This single behaviour causes several bugs in
  §4 (F-6, F-7), because the backend returns `errors[] + data:{x:null}` for ordinary
  "not found" cases.

**Auth is the one exception:** `services/auth.ts` calls `:8180/api/v1/auth/*` with raw
`fetch`, bypassing the proxy.

### Dead modules
`src/services/siteSearch.ts` and `src/components/layout/StickyDock.tsx` are **referenced
by nothing**. `src/graphql/hotelList.graphql` is compiled into `HotelListDocument`, which
is also unused — `services/hotelList.ts` hand-writes a duplicate query string instead.

---

## 2. Real vs mock — feature matrix

Legend: **REAL** = reaches the backend and uses the response · **STATIC** = local fixture
· **SIMULATED** = pretends to act · **PARTIAL** = mixed · **DEAD** = code exists, cannot work.

| # | Feature | Entry point | Data source | Endpoint | Status | Evidence |
|---|---|---|---|---|---|---|
| 1 | ~~Hotel list / destination picker~~ | — | — | — | **REMOVED** (single-hotel) | `DestinationPicker.tsx`, `hotelList.ts` deleted; SearchBar shows a static canonical-hotel segment |
| 2 | Stay search | `SearchResults` | backend | `staySearch(input)` | **REAL** | always scopes to the canonical hotel (no hotel selection anywhere) |
| 3 | Hotel detail (`?hotelid=`) | `HotelDetail` (RSC) | backend | `hotel · roomTypes · availability · rates · experiences · reviews` | **REAL** | server-side `Promise.all`, `notFound()` on inactive |
| 4 | Hotel detail (legacy `/hotel`) | — | — | — | **REMOVED** | `/hotel` without a `hotelid` redirects server-side to the canonical property (query params preserved) |
| 5 | Room detail | `RoomDetails` | backend | `roomType · availability · rates · roomTypes` | **REAL** | `catalog.getStayRoom()`; redesigned: own room header, hotel chrome hidden, essentials/good-to-know vertical |
| 6 | Quote / pricing | `quote.ts` | backend | `quote(input)` | **REAL** | no client-side price math since `82c4414`; `Quote.charges[]` (itemized tax/fee lines) now exposed and rendered |
| 7 | Extras catalog | `extras.ts` | backend | `extras(hotelId)` | **REAL** (F-5 in RoomDetails) | UUID ids confirmed live |
| 8 | Reservation create | `BookingFlow` | backend | `createReservation` | **REAL** (F-1, F-2) | persists, sells inventory, emits outbox event |
| 9 | Payment | `payment.ts` | backend | `createPayment` + `capturePayment` | **REAL call, MOCK gateway** | backend invents `MOCK-XXXXXXXX` |
| 10 | Confirmation | `ConfirmationFlow` | backend | `myReservations` / `reservation` | **PARTIAL — broken handoff (F-4)** | anonymous `myReservations` → 401 |
| 11 | Reservation lookup | `ReservationFlow` | backend | `reservation(input)` | **REAL** (F-6, F-9) | ref + email |
| 12 | Cancellation | `ReservationFlow` | backend | `cancelReservation` | **REAL** | penalty + inventory release server-side |
| 13 | Online check-in | `CheckinFlow` | none | none | **SIMULATED** | `setTimeout(900)`; source comment: *"Backend has no check-in mutation"* |
| 14 | Login / register | `AccountFlow` → `auth.ts` | backend REST | `/api/v1/auth/{login,register}` | **REAL** (F-8) | bcrypt+JWT verified |
| 15 | Password reset | `auth.reset()` | none | none | **SIMULATED** | returns a canned success string, no request |
| 16 | My bookings | `AccountFlow` | backend | `myReservations` | **REAL, conditional (F-13)** | needs a `guests.user_id` link |
| 17 | Homepage featured | `page.tsx` | backend | `homepage` | **REAL, errors propagate** | live: canonical hotel + 3 room types; backend outage → error boundary, no fixture fallback |
| 18 | Platform identity / hero | `layout.tsx` | backend | `platform(slug)` | **REAL** | RSC fetch; header/footer degrade to brand constants on failure |
| 19 | Home hero facts (rating, review count, room count) | `page.tsx` | backend | `canonicalHotel` + `hotelDetails` + `roomTypes` | **REAL** | no fixture facts; live: 4.7 · 3 reviews · 3 room types |
| 20 | **Offers page** | `OffersGrid` | backend-hydrated | `ensurePricingSources()` | **REAL** | promo catalog from the backend (SPRING25); feasibility probes use a real room of the canonical hotel |
| 21 | Promo validation | `pricing.validatePromo` | backend-hydrated | `offers(hotelId)` per hotel | **REAL** | hydration called on search/offers/booking/room pages |
| 22 | Reviews | `HotelDetail` | backend | `reviews(hotelId, page)` | **REAL** (read); write path unreachable | backend needs `checked_out` |
| 23 | FAQ | `faq/page.tsx` | backend | `hotelDetails(id)` faqs | **REAL** | wired in the canonical task (was fixture) |
| 24 | Restaurants | `HotelDetail` | backend | `hotelDetails(id)` | **REAL** | aggregation query renders restaurants |
| 25 | Newsletter | `newsletter.ts` | localStorage | none | **SIMULATED** | toast advertises promo `WELCOME5` (does not exist) |
| 26 | Contact form | `contact-form.tsx` | none | none | **SIMULATED** (honest: *"Prototype: messages are not sent anywhere"*) | |
| 27 | Site search | `siteSearch.ts` | — | — | **DELETED** | unreferenced dead module removed in the canonical task |
| 28 | Recently viewed rooms | `RecentActivity` | localStorage + backend | `roomType(id)` | **REAL** | UUIDs resolved via `getRoomTypeById` (was a dead fixture lookup) |
| 29 | Recent searches | `RecentActivity` | localStorage | none | **REAL (client-only, by design)** | |
| 30 | Cookie consent | `consent.ts` | localStorage | none | **REAL (client-only, by design)** | |
| 31 | Demand / "Recommended" sort | `availability.demandFor` | hash | none | **SIMULATED** | `hashStr(room.id) % 1000` |
| 32 | Currency conversion | `lib/format.ts` | hardcoded | none | **STATIC + WRONG (F-2)** | ignores `NEXT_PUBLIC_FX_*` |
| 33 | i18n (en/fr/ar) | `useLang` | fixture dict | none | **PARTIAL** | ~17 chrome strings only; all content stays English |
| 34 | Chatbot | — | — | — | **NOT IMPLEMENTED** | `components/chatbot/` is an empty directory |
| 35 | `/index-2` alternate landing | — | — | — | **REMOVED** | fixture page for the fictional hotel deleted |

---

## 3. User-flow status, end to end

### 3.1 Search — WORKS

```
SearchBar (desktop) / SearchSheet (mobile)
  → SearchContext (state) ──"Search rooms"──► router.push('/search' + stateToQuery)
  → SearchResults reads the COMMITTED URL (stayKey = checkin|checkout|adults|children|rooms|destination)
  → catalog.searchStay(destination, params)
  → gqlRequest(StaySearchDocument) ──► StaySearchGraphQLController
      HotelRepository.findAllActive() + AvailabilityService + PricingService + CatalogQueryService
  ← filters soldout / !capacityFits / !active
  → cards link hotelRoomURL(state, hotelId, roomId)  ✅ carries hotelid + stay state
```

Deliberate and correct: live edits do not re-search; only a URL commit does. Facets
(`f_*`) are URL-owned and preserved across stay rewrites (`SearchContext.withFacets`).
Loading skeleton, network-error state, no-results state and filter-only-empty state all
exist.

**Defects:** F-11 (promo), F-14 (price facets), F-15 (destination not URL-synced),
F-16 (mobile cannot change hotel).

### 3.2 Room → booking → payment → confirmation

```
Room card → /hotel?hotelid=…&roomId=…&<stay>
  → RoomDetails: getStayRoom() ✅  +  getExtras() ✅  +  getQuote() ✅
  → "Select room & continue" → bookingURL() → /booking?...&room=<uuid>&plan=<planId>
  → BookingFlow: getStayRoom() again, getExtras(), getQuote()
  → step 1 details → step 2 card
  → reservations.create()  ── REAL: persists, sells inventory, emits booking.confirmed
  → charge()               ── createPayment + capturePayment (mock gateway)
  → router.push('/confirmation?ref=RC-XXXXXX')     ⚠ email NOT passed
  → ConfirmationFlow: reservations.list() → 401 for anonymous → asks for the email again
```

The booking itself is genuinely real: server-side re-pricing, idempotency key, pessimistic
inventory lock. **The two failure modes around it are not handled** — see F-1 and F-4.

### 3.3 Reservation lookup / cancel — WORKS, poor errors

`ref + email` → `reservation(input)` → view → `cancelReservation`. Real. But the room is
displayed as the literal string **"Room"** with a broken image (F-9), and a wrong
reference produces a generic "something went wrong" instead of "not found" (F-6).

### 3.4 Check-in — SIMULATED

Real lookup, real validation, then `setTimeout(900)` and a local state flip. Nothing is
persisted; `check_ins` stays empty; the reservation never leaves `confirmed`.

### 3.5 Auth — REAL but non-durable

Login/register hit the backend. The JWT lives in a module-level variable (`let _token`),
so **a page refresh signs the user out mid-funnel**. `restoreSession()` is exported and
never called. The Header reads the session through a *separate* path that only re-runs on
route change (F-8).

---

## 4. Defects — evidence and impact

### P0 — blocks or corrupts a core journey

**F-1 · RESOLVED (2026-08-31)** — see
[`docs/investigations/BOOKING_PAYMENT_UX_PLAN_2026-08-31.md`](investigations/BOOKING_PAYMENT_UX_PLAN_2026-08-31.md)
and `docs/CURRENT_STATE.md`'s matching dated entry for the full design and verification.
Summary of the fix: `BookingServiceImpl.create()` now assigns `ReservationStatus.pending`
(not `confirmed`) with a `holdExpiresAt` TTL; a scheduled `ReservationHoldExpiryJob`
releases inventory for holds that never capture; payment settlement is asynchronous
(simulated provider + idempotent webhook, `PaymentServiceImpl.processProviderEvent`) with
a genuine decline path (`PaymentStatus.failed`) that leaves the reservation `pending` for
a same-reservation retry rather than orphaning or double-booking it; the reservation
idempotency key is now persisted to `sessionStorage` (`BookingFlow.tsx`), closing the
reload-mint-a-new-key gap this finding also covered. Original defect text, retained for
history: reservation creation used to commit straight to `confirmed` and sell inventory
before payment ran, with no compensating cancel and a reload-scoped idempotency key that
could double-book across a reload.

**F-2 · Non-MAD currency mis-denominates the reservation by ~11×.**
Proven live: the backend performs **no FX conversion** — it echoes whatever
`currencyCode` the client sends onto unchanged MAD figures.
```
currencyCode=MAD → total 7290.27 "MAD"
currencyCode=EUR → total 7290.27 "EUR"   ← identical number
currencyCode=USD → total 7290.27 "USD"
```
`QuoteTable` then converts for display (`fmtPrice` → `convert(n, 'EUR')` = ×0.091), so the
guest correctly sees **€663**. But `BookingFlow` sends `currencyCode: currency` to
`createReservation` and `amount: quote.total` (= 7290.27) to `charge()`. The persisted row
becomes `currency_code='EUR', total_amount=7290.27`. The currency switcher is in the
**Header on every page** (`Header.tsx:61`); EUR/USD/GBP all exist in the `currencies`
table, so nothing rejects it.

**F-3 · Room-page availability is computed for the wrong stay.**
`RoomDetails.tsx:196` and `:214`, `BookingFlow.tsx:123` all call
`getStayRoom(undefined, roomId, { checkin, adults, children })` — **no `checkout`, no
`rooms`**. `catalog.stayInputOf()` then defaults checkout to `checkin + 1 day` and
`rooms` to `1`. So the availability badge, the `capacityFits` check and the "Sold out"
gate on the room and booking pages reflect a **one-night, one-room** stay regardless of
what the guest actually asked for. A room sold out on night 3 still shows "Available",
and the guest only discovers it when `createReservation` throws `CONFLICT`.

**F-4 · The post-payment confirmation asks the guest to identify themselves again.**
`BookingFlow.tsx:342` redirects to `/confirmation?ref=…` **without the email**.
`ConfirmationFlow.tsx:69` then tries `reservations.list()` (= `myReservations`), which for
an anonymous booker returns `UNAUTHORIZED` (verified live) and is swallowed by
`.catch(() => {})`. The guest lands on a form asking for "the email used at booking"
immediately after paying. `BookingFlow` has that email in `details.email`.

### P1 — major functionality mocked, wrong, or disconnected

**F-5 · Fixture extras leak into the real quote (RoomDetails only).**
`RoomDetails.tsx:150`: `useState<Extra[]>(EXTRAS)` seeds the picker with **fixture** extras
whose ids are slugs (`airport-shuttle`, `late-checkout`). Backend extras are UUIDs
(verified live: `00000000-…-0002 Airport Transfer`). Selecting one before hydration lands
`extraId: 'airport-shuttle'` in the quote → backend throws `"extra … is not available"` →
the whole quote fails. `BookingFlow.tsx:141` correctly starts empty — the two components
disagree.

**F-6 · "Not found" is unreachable; users get a misleading generic error.**
Verified live: `reservation(input)` for an unknown reference returns
`errors:[{code:NOT_FOUND}]` **together with** `data:{reservation:null}`. `gqlRequest`
throws on any `errors[]`, so the `if (!r) → "No reservation found for those details"`
branch is **dead code** in all three consumers — `ReservationFlow.tsx:105`,
`CheckinFlow.tsx:41`, `ConfirmationFlow` — and the `catch` shows
*"Something went wrong… please try again"* instead. Retrying never helps.
The same applies to `roomType(id)`: a fixture/unknown room id yields
`NOT_FOUND` + `data:{roomType:null}`, so `RoomDetails`'s correct "Room not found" screen
never renders and the user sees *"Could not load room details — please check your
connection"* instead (`RoomDetails.tsx:224`).

**F-7 · The quote's designed soft-failure contract is dead on both sides.**
The schema has `Quote.valid: Boolean!` and `Quote.message: String` for exactly this. But
`PricingServiceImpl.java:183` is the only construction site and hardcodes `true` — every
failure `throw`s instead. So `if (result.raw.valid) … else show result.raw.message` in
`RoomDetails.tsx:294` and `BookingFlow.tsx:207` **can never take the else branch**, and
all errors fall into `.catch()` with a generic string. The backend's specific message
(*"«SUMMER2026» is not a valid promo code"*) reaches `GraphqlClientError.message` and is
then discarded. `Quote.promoMessage` exists in the Java DTO but is **not in the GraphQL
schema** at all, so no client can read it.

**F-8 · Session does not survive a reload, and the Header does not track it.**
`services/auth.ts:8-9` — `let _token` / `let _session`. No cookie, no storage.
`restoreSession()` (line 36) is never called. Separately, `Header.tsx:50` reads
`readSession()` directly with `setTimeout(0)` keyed on `pathname` instead of consuming
`SessionContext`, so **after signing in the header still says "Account"** until the user
navigates.

**F-9 · ~~The reservation view shows a literal "Room" and a broken image~~ RESOLVED.**
`ReservationRoomLine.roomTypeName` + `roomTypeImageUrl` (backend field resolvers,
`ReservationGraphQLController`) now feed `ReservationFlow`, the confirmation JSON-LD
and the .ics file; the hardcoded "Room" / "Executive Hotel Rabat" strings are gone.

**F-10 · ~~Homepage silent fallback~~ RESOLVED (canonical task).**
`services/homepage.ts` no longer catches; the index page renders the canonical property
from the backend only, with no fixture sections to fall back to.

**F-11 · Promo codes — MOSTLY RESOLVED.** Wrong codes and the no-hydration paths are
fixed: `/offers` and the home offers section render the backend promo catalog
(`SPRING25`); `OffersGrid` probes feasibility against a real room of the canonical
hotel; the fake `WELCOME5` newsletter promo copy was removed. Remaining: an invalid
promo still hard-fails the quote (F-7's backend `Quote.valid` contract is still
unimplemented server-side).

### P2 — important, not blocking

**F-13 · ~~"My bookings" depends on a fragile guest↔user link~~ RESOLVED (V27).**
Accountless bookings now provision a passwordless `provisioned` user account linked to the
guest; registering with that email completes the account and the bookings show up.
The registration flow also links an existing guest record by email instead of duplicating it.

**F-14 · Price facets are non-functional against real data.**
`lib/filters.ts:28` — brackets are `Under MAD 1,000 / 1,000–1,499 / 1,500+`. Live seeded
nightly rates are **1 813 · 2 077 · 2 308 · 2 638 MAD**. Every room lands in "1,500+";
the other two brackets match nothing. The labels also stay hardcoded "MAD" when the user
has selected EUR/USD/GBP.

**F-15 · ~~Choosing a hotel does not re-run the search~~ RESOLVED (canonical task).**
There is no hotel to choose — the destination state was removed from `SearchState`/URL;
every search targets the canonical hotel.

**F-16 · ~~Mobile users cannot change hotel on `/search`~~ RESOLVED (canonical task).**
No hotel selector exists on any viewport.

**F-17 · Backend capabilities the frontend ignores — MOSTLY RESOLVED.** FAQ now renders
backend FAQs (canonical task); restaurants render via `HotelDetail`'s aggregation query.
`hotelDetails` is used by the hotel page and the FAQ page.

**F-18 · ~~Breadcrumb crumb never renders~~ RESOLVED.** The duplicated hotel-page
breadcrumb ("Room details" crumb) was removed entirely — when a room is selected
`RoomDetails` owns a single breadcrumb (Home / hotel / room).

**F-19 · Hotel room-grid cards drop the stay state — PARTLY RESOLVED.** The hotel
"Rooms & suites" cards now carry the stay (`hotelRoomURL`); the homepage
`FeaturedRooms` cards still link without dates (they land on the room view whose
stay strip prompts for dates).

**F-20 · Destination picker has no error path.**
`DestinationPicker.tsx:21` — `getHotelList().then(...)` with **no `.catch`**. If the
query rejects, `loading` stays `true` and the panel shows "Loading hotels…" forever.

### P3 — polish, cleanup, copy

- **F-21** ~~Single-hotel SEO on a multi-hotel platform~~ **RESOLVED**: layout metadata,
  keywords and JSON-LD now describe Executive Hotel (the canonical property — the hotel
  record itself, unified in V30, is the single identity: header brand, breadcrumb, H1
  and gallery alt texts all come from it).
- **F-22** Stale copy: `app/booking/page.tsx` metadata fixed in the canonical task;
  `data/index.ts` fixture FAQ ("prototype, simulated payment") no longer renders anywhere
  in the app (fixture remains only for unit tests).
- **F-23** i18n is chrome-only — ~17 strings in `constants/i18n.ts`. Selecting Arabic sets
  `dir="rtl"` on a page whose entire content stays English LTR.
- **F-24** ~~Duplicated FX tables~~ **RESOLVED**: one env-driven `FX` table in
  `lib/format.ts`; `services/catalog.ts` imports it (was: two divergent tables).
- **F-25** ~~Dead code~~ **PARTLY RESOLVED**: `services/siteSearch.ts`,
  `components/layout/StickyDock.tsx` (unreferenced), `graphql/hotelList.graphql` +
  `services/hotelList.ts` were removed in the canonical task; `bookingKey` shim in
  `services/reservations.ts:163` remains (self-documented as transitional).
- **F-26** Empty committed directories (§1) imply an architecture that was never built.
- **F-27** ~~`/booking` crashed on SSR~~ **RESOLVED (2026-08-28 redesign).** The page
  500'd with `useApollo must be used inside <ApolloProvider>` (Apollo is browser-only,
  so the root provider hands out `null` during SSR; `/booking` — unlike the other
  flows — rendered `BookingFlow` without a `<Suspense>` boundary). Fixed via Suspense
  + `useApollo()` returning `null` (`api/apollo/provider.tsx`). Remaining edge: when
  `planId` is empty the page still shows "Nothing to book yet" with no explanation.
- **F-28** Hardcoded alt text `"— Executive Hotel"` on search and home room cards
  regardless of the actual hotel (`SearchResults.tsx:440`, `RoomsGrid.tsx:46`).

---

## 5. What each mocked feature needs from the backend

| Feature | Currently | Required API | Frontend change | Backend work? |
|---|---|---|---|---|
| Offers page | fixture `OFFERS` | `offers(hotelId)` exists but returns `[]` without a `hotelId` — needs either a collection-wide variant or per-hotel fan-out (which `pricingHydration` already does) | replace `OFFERS` with hydrated backend offers; map `discountType`/`discountValue` | **small** (optional: make `offers()` return all active promos when `hotelId` is null) |
| Promo soft-failure | quote throws | return `Quote{valid:false, message}` instead of throwing in `applyPromo`; expose `promoMessage` in the schema | use the already-written `else` branch | **yes** |
| Check-in | `setTimeout` | `checkInReservation(reference, email, docId, arrivalSlot, phone)` → writes `check_ins`, moves status to `checked_in` | replace the timeout with a mutation | **yes** — none exists |
| Reviews (write) | UI absent | `createReview` exists but requires a `checked_out` reservation, which no code path can produce | add the form once check-out exists | **yes** (depends on check-in/out) |
| Newsletter | localStorage | `subscribeNewsletter(email, consent)` + persistence | swap `services/newsletter.ts` | **yes** — no endpoint, no table |
| Contact form | no-op | `submitContactMessage(...)` or an email provider | swap `contact-form.tsx` | **yes** — no endpoint; no email code exists anywhere |
| Password reset | canned string | `requestPasswordReset` / `resetPassword` + email delivery | wire `auth.reset()` | **yes** — blocked on there being no email provider |
| FAQ / restaurants | fixture | `faqs(hotelId)` · `restaurants(hotelId)` — **already exist** | swap the fixture reads | **none** |
| Room name in reservation | literal `"Room"` | add `roomTypeName` (+ a media url) to the `ReservationRoom` GraphQL type, or resolve `roomType(id)` client-side | render the real name/image | **small** (a field resolver) |
| Currency | no conversion | either convert server-side in `quote`/`createReservation`, or restrict the API to MAD and keep FX display-only | see the fix plan, §6 F-2 | **yes, a decision is needed** |
| Demand / "Recommended" sort | `hash % 1000` | a real popularity or availability-pressure signal | replace `demandFor` | **yes** |
| Session persistence | in-memory | none — `/api/v1/auth/*` is sufficient | add an httpOnly-cookie BFF (copy `backoffice-hotel`) or call `restoreSession` from storage | **none** |

---

## 6. Fix plan (ordered; nothing implemented)

### 1. F-2 — currency correctness *(P0, do first: it is a money bug)*
**Current:** backend echoes `currencyCode` onto unconverted MAD amounts; the reservation
row is persisted with the display currency and the MAD number.
**Expected:** the amount persisted and charged matches what the guest was shown.
**Root cause:** no FX layer anywhere; the frontend assumes the backend converts.
**Fix (recommended, smallest safe change):** stop sending the display currency to the API.
Always call `getQuote`, `createReservation` and `charge` with `currencyCode: 'MAD'`, and
keep `useCurrency().fmt` as a **display-only** conversion — which is what
`.env.example` and `app/terms/page.tsx:37` already say the product does. The larger
alternative (real server-side FX with rate snapshots on the reservation) is a backend
project.
**Files:** `services/quote.ts`, `components/booking/BookingFlow.tsx:194,300,321`,
`components/room/RoomDetails.tsx:284`, `components/ui/QuoteTable.tsx`.
**Verify:** switch to EUR, quote a 3-night stay, confirm the persisted
`reservations.currency_code = 'MAD'` and `total_amount` equals the MAD quote, while the UI
shows euros.

### 2. F-1 — booking/payment atomicity *(P0)*
**Current:** reservation commits before payment; a decline leaves it confirmed and a retry
creates a second one.
**Expected:** one reservation per booking attempt; no inventory held by an unpaid booking.
**Root cause:** no `pending` reservation state, no compensating action, and the
idempotency key is regenerated per submit.
**Fix (frontend-only, immediate):** hoist `generateIdempotencyKey()` into a `useRef`
initialised once per booking session so retries **reuse** the key — the backend's
`findByIdempotencyKey` then returns the same reservation instead of creating another.
**Fix (complete, needs backend):** create as `pending`, confirm on capture, and expire
unpaid holds — or expose a cancel-on-failure path the client can call.
**Files:** `components/booking/BookingFlow.tsx:296-347`.
**Verify:** decline twice; assert exactly one row in `reservations` and one
`availability.sold` decrement.

### 3. F-3 — pass the full stay to availability *(P0, trivial)*
**Fix:** add `checkout: state.checkout` and `rooms: state.rooms` to all three
`getStayRoom` call sites.
**Files:** `RoomDetails.tsx:196,214`, `BookingFlow.tsx:123`.
**Verify:** block inventory on night 3 of a 4-night stay in the back-office; the room page
must show "Sold out" instead of "Available".

### 4. F-4 — carry the email into the confirmation *(P0, trivial)*
**Fix:** redirect to `/confirmation?ref=…&email=…` (or stash it in `sessionStorage`) and
have `ConfirmationFlow` prefer `reservations.find(ref, email)` over `list()`.
**Files:** `BookingFlow.tsx:342`, `ConfirmationFlow.tsx:66-77`.
**Verify:** book anonymously; the confirmation renders without a second prompt.

### 5. F-11 — promo codes *(P1, three parts)*
a. Point `OffersGrid` at the hydrated backend offers instead of `@/data`'s `OFFERS`;
   delete the fixture codes and the `WELCOME5` newsletter toast copy.
b. Call `ensurePricingSources()` (and **await** it) in `SearchResults` and `OffersGrid`;
   make `PromoField.handleSubmit` await the promise it started.
c. Backend: return `Quote{valid:false, message}` rather than throwing, so an invalid promo
   degrades to "promo not applied" instead of destroying the quote. Until that lands, add
   a frontend guard: on a quote failure, retry once **without** `promoCode` and surface
   "that code doesn't apply to this stay".
**Files:** `components/offers/OffersGrid.tsx`, `components/search/SearchResults.tsx`,
`components/ui/PromoField.tsx`, `services/pricingHydration.ts`, backend
`PricingServiceImpl.applyPromo`.

### 6. F-6/F-7 — surface real backend errors *(P1)*
**Root cause:** `gqlRequest` throws on any `errors[]`, collapsing NOT_FOUND, VALIDATION and
network failures into one opaque throw.
**Fix:** give `GraphqlClientError` an `code` field from `errors[0].extensions.code` (the
back-office's `lib/api.ts` already does exactly this — copy it), then branch on it:
`NOT_FOUND` → the correct "no reservation found" / "room not found" copy;
`VALIDATION` → show `err.message` verbatim; anything else → the connectivity message.
**Files:** `services/graphqlClient.ts`, `ReservationFlow.tsx:105`, `CheckinFlow.tsx:41`,
`ConfirmationFlow`, `RoomDetails.tsx:224,294`, `BookingFlow.tsx:207`.

### 7. F-5 — remove the fixture-extras seed *(P1, one line)*
`RoomDetails.tsx:150` → `useState<Extra[]>([])`, matching `BookingFlow`.

### 8. F-8 — persist the session *(P1)*
Copy `backoffice-hotel`'s pattern (`/api/auth/{login,me,logout}` route handlers +
httpOnly cookie) — it is the same repo and already proven. Then have `Header` consume
`useSession()` instead of calling `readSession()` on a timer.

### 9. F-9 — real room identity on reservations *(P1)*
Needs a backend field (`roomTypeName` + media on `ReservationRoom`) or a client-side
`roomType(id)` lookup. Stop passing UUIDs to `image()`.

### 10. F-10 — stop the silent fallback *(P1)*
Let `getHomepage()` propagate, render an error/retry section, and **never** fall back to
`RoomsGrid`'s dead fixture links.

### 11. Then, in order
F-12 (drop the fixture lookup in `RecentActivity` — resolve UUIDs via `roomType`),
F-20 (`.catch` in `DestinationPicker`), F-15/F-16 (destination sync + mobile parity),
F-14 (derive price brackets from the result set, label in the active currency),
F-17 (wire `faqs`/`restaurants`, adopt `hotelDetails`), F-18, F-19, then the P3 cleanup.

---

## 7. Tests

- **Vitest: 15 files, 72 tests, all green** (run 2026-08-27 after the canonical task).
  Coverage is `lib/*`, service shims, `BookingFlow` idempotency and — new — a `SearchBar`
  test proving the single-hotel search bar renders a static hotel label and no picker.
  `services.test.ts` deliberately makes `gqlRequest` reject. **No test covers the
  quote/booking/payment chain**, the currency path, or promo handling.
- **Playwright: 12 specs — stale and superseded by the canonical task.** `e2e/helpers.ts:5`
  exports `ROOM_IDS = ['superior-double-or-twin', 'double-or-twin', 'executive-suite']`
  (fixture ids the backend rejects), `index-2.spec.ts` targets a deleted route, and the
  booking spec drives `roomId=executive-suite`. The suite needs a rewrite against the
  canonical single-hotel flow (search → availability → book → verify inventory → sell-out).

---

## 8. Current stopping point

The `INTEGRATION_CHANGELOG.md` workstream (uncommitted) completed phases 1–5: auth,
reservations, payment, and the booking / confirmation / check-in / account components.
Its own "Files NOT Modified" list is the exact remaining scope, and this audit confirms it
is still outstanding:

`app/page.tsx` (hero facts) · `app/hotel/page.tsx` (legacy branch) · `app/index-2` ·
`app/faq/faq-client.tsx` · `layout/{Header,Footer,SearchSheet}` ·
`home/{RoomsGrid,DiscoverSection,RecentActivity}` · `offers/OffersGrid` ·
`ui/PromoField` · `room/RoomDetails` (EXTRAS seed) · `services/{pricing,siteSearch}` ·
`data/index.ts`.

Work stopped **mid-integration, before the seams between the migrated and un-migrated
halves were reconciled** — which is precisely where F-1, F-5, F-10, F-11 and F-12 live:
each is a fixture value crossing into a backend call, or vice versa.

## 9. Single best next action

**Fix F-2 (currency) — send `MAD` to the API and keep FX display-only.** It is the only
finding that silently writes wrong money into the database, it is reachable from a
control on every page, it is a handful of lines, and it needs no backend change. F-1 and
F-3 are the immediate follow-ups.
