# FRONTEND (guest site) — verified state

**App:** `frontend-hotel/` · Next.js 16 App Router · 125 TS/TSX files · ~19 300 lines
**Audited:** 2026-08-27, against the on-disk working tree (which includes ~2 200 lines of
uncommitted integration work), the running backend on :8180, the seeded database, and a
live dev server on :3001.

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
| 1 | Hotel list / destination picker | `DestinationPicker` | backend | `hotels(input)` | **REAL** | `services/hotelList.ts`; live query returns 3 hotels |
| 2 | Stay search | `SearchResults` | backend | `staySearch(input)` | **REAL** | `catalog.searchStay()`; skeleton + error + empty states present |
| 3 | Hotel detail (`?hotelid=`) | `HotelDetail` (RSC) | backend | `hotel · roomTypes · availability · rates · experiences · reviews` | **REAL** | server-side `Promise.all`, `notFound()` on inactive |
| 4 | Hotel detail (legacy `/hotel`) | `HotelLegacyPage` | fixture | none | **STATIC** | `app/hotel/page.tsx:96` `const P = PROPERTY` |
| 5 | Room detail | `RoomDetails` | backend | `roomType · availability · rates · roomTypes` | **REAL** (2 defects: F-3, F-5) | `catalog.getStayRoom()` |
| 6 | Quote / pricing | `quote.ts` | backend | `quote(input)` | **REAL** | no client-side price math since `82c4414` |
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
| 17 | Homepage featured | `page.tsx` | backend | `homepage` | **REAL, silent fallback (F-10)** | live: 3 hotels + 6 room types |
| 18 | Platform identity / hero | `layout.tsx` | backend | `platform(slug)` | **REAL, silent fallback** | RSC fetch |
| 19 | Home hero facts (rating, review count, room count) | `page.tsx` | fixture | none | **STATIC** | `P.rating`, `P.reviewCount`, `P.rooms.length` |
| 20 | **Offers page** | `OffersGrid` | fixture | none | **STATIC + BROKEN (F-1)** | 5 fixture codes; backend has 3 different ones |
| 21 | Promo validation | `pricing.validatePromo` | backend-hydrated | `offers(hotelId)` per hotel | **PARTIAL / order-dependent (F-11)** | hydration not called on `/search` or `/offers` |
| 22 | Reviews | `HotelDetail` | backend | `reviews(hotelId, page)` | **REAL** (read); write path unreachable | backend needs `checked_out` |
| 23 | FAQ | `faq-client.tsx` | fixture | none | **STATIC** | backend `faqs(hotelId)` exists and is unused |
| 24 | Restaurants | legacy `/hotel` | fixture | none | **STATIC** | backend `restaurants(hotelId)` exists and is unused |
| 25 | Newsletter | `newsletter.ts` | localStorage | none | **SIMULATED** | toast advertises promo `WELCOME5` (does not exist) |
| 26 | Contact form | `contact-form.tsx` | none | none | **SIMULATED** (honest: *"Prototype: messages are not sent anywhere"*) | |
| 27 | Site search | `siteSearch.ts` | fixture | none | **DEAD** — no consumer | unreferenced module |
| 28 | Recently viewed rooms | `RecentActivity` | localStorage + fixture | none | **DEAD (F-12)** | UUIDs looked up in `PROPERTY.rooms` → always empty |
| 29 | Recent searches | `RecentActivity` | localStorage | none | **REAL (client-only, by design)** | |
| 30 | Cookie consent | `consent.ts` | localStorage | none | **REAL (client-only, by design)** | |
| 31 | Demand / "Recommended" sort | `availability.demandFor` | hash | none | **SIMULATED** | `hashStr(room.id) % 1000` |
| 32 | Currency conversion | `lib/format.ts` | hardcoded | none | **STATIC + WRONG (F-2)** | ignores `NEXT_PUBLIC_FX_*` |
| 33 | i18n (en/fr/ar) | `useLang` | fixture dict | none | **PARTIAL** | ~17 chrome strings only; all content stays English |
| 34 | Chatbot | — | — | — | **NOT IMPLEMENTED** | `components/chatbot/` is an empty directory |
| 35 | `/index-2` alternate landing | `index-2/page.tsx` | fixture | none | **STATIC** | |

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

**F-1 · Payment failure leaves an orphaned confirmed reservation; retry double-books.**
`BookingFlow.tsx:296-347`. `reservations.create()` commits a **confirmed** reservation and
sells inventory *before* `charge()` runs. On decline the UI says "try another card" and
sets `wait.current = false`; the next submit calls `generateIdempotencyKey()` **again**
(line 297, inside the handler), producing a *new* key → a **second** reservation and a
second inventory decrement. Abandoning leaves a confirmed, unpaid reservation holding
inventory forever. There is no compensating cancel and no `pending` state (the backend
only ever assigns `confirmed` or `cancelled`).

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

**F-9 · The reservation view shows a literal "Room" and a broken image.**
`ReservationFlow.tsx:270` renders `<p>Room</p>` — the room-type **name is hardcoded**,
because `roomLines[]` carry only `roomTypeId` and nothing resolves it.
`ReservationFlow.tsx:278` / `ConfirmationFlow.tsx:344` / `CheckinFlow.tsx:143` pass that
**UUID** to `image()` (= `data/index.ts` `img`), producing
`https://images.unsplash.com/00000000-0000-0000-0000-000000000001?q=80&w=400…` → a 404.
`ConfirmationFlow.tsx:79` also emits JSON-LD with `roomName = 'Room'` and a hardcoded
`"Executive Hotel Rabat"` regardless of which hotel was booked.

**F-10 · Homepage silent fallback hides outages *and* substitutes dead links.**
`services/homepage.ts:36` catches everything and returns `EMPTY_HOMEPAGE`. `page.tsx:180`
then renders `<RoomsGrid />` — the **fixture** grid, whose links are
`/hotel?roomId=superior-double-or-twin` with no `hotelid`, which the backend cannot
resolve (verified live: `NOT_FOUND`). So a backend outage silently degrades the home page
into a set of room cards that all lead to an error screen.
*(With the backend healthy the home page correctly renders `FeaturedRooms` with UUID
links — verified live on :3001.)*
`services/catalog.ts:2` documents the opposite policy — *"no silent mock fallbacks"*. The
two seams are inconsistent.

**F-11 · Promo codes are broken end to end.**
Three compounding faults:
1. **Wrong codes.** `/offers` advertises `SUMMER2026 · STAY4PAY3 · BESTRATE · CORP10 ·
   WELCOME5` (verified live on :3001). The database has `SPRING25 · MADINA15 · SUMMER10`.
   **Zero overlap.**
2. **No hydration.** `validatePromo` reads a module-level `offersSource` that starts
   empty and is only filled by `ensurePricingSources()`. That is called in
   `PromoField` and `RoomDetails` — but **not** in `SearchResults.tsx:146,421` or
   `OffersGrid.tsx:40`. A deep link to `/search?promo=X` therefore always reports
   "not a valid promo code"; whether it works at all depends on which pages the user
   visited first in the SPA session. `PromoField.handleSubmit` also does not `await`
   the hydration promise it kicked off — clicking Apply quickly races it.
3. **Hard failure downstream.** `PricingServiceImpl.applyPromo` **throws** on an unknown
   code. Verified live:
   `promoCode:"SUMMER2026"` → `errors:[{code:VALIDATION}], data:null`;
   `promoCode:"MADINA15"` (right code, wrong hotel) → `"promo code is not valid for this
   hotel"`. So carrying an offers-page code into a room page kills the **entire quote**,
   and the user sees only *"Could not calculate price — please try again"* (F-7) with no
   hint that the promo chip is the cause and no way to discover it.
   `STAY4PAY3` maps to `stay_x_pay_y`, which the backend rejects as unimplemented even if
   it were seeded.

**F-12 · "Recently viewed rooms" can never display anything.**
`RecentActivity.tsx:41`: `recentRoomIds(3).map(id => PROPERTY.rooms.find(r => r.id === id))`.
`recordRoomView()` now stores backend **UUIDs**; `PROPERTY.rooms` holds fixture slugs.
The lookup always returns `undefined` and is filtered out.

### P2 — important, not blocking

**F-13 · "My bookings" depends on a fragile guest↔user link.**
`myReservations` resolves through `guests.user_id`. That link is created only by
`AuthServiceImpl:88` at **registration**. `BookingServiceImpl.findOrCreateGuest()` matches
by email and does **not** set `userId`. So it works when a self-registered user books with
their account email, and silently returns `[]` if they change the email on the booking
form (which is editable and merely pre-filled from the session).

**F-14 · Price facets are non-functional against real data.**
`lib/filters.ts:28` — brackets are `Under MAD 1,000 / 1,000–1,499 / 1,500+`. Live seeded
nightly rates are **1 813 · 2 077 · 2 308 · 2 638 MAD**. Every room lands in "1,500+";
the other two brackets match nothing. The labels also stay hardcoded "MAD" when the user
has selected EUR/USD/GBP.

**F-15 · Choosing a hotel does not re-run the search.**
`SearchContext.setDestination` (line 168) updates state but never calls `syncUrl`.
`SearchResults.stayKey` reads `destination` from the **URL**, so picking a different hotel
on `/search` changes the segment label and nothing else until the user clicks "Search
rooms" again. Every other stay mutation behaves the same way by design — but destination
is the only one whose label updates while the results silently disagree.

**F-16 · Mobile users cannot change hotel on `/search`.**
`SearchBar.tsx:83`: `isHome = pathname === '/' || pathname === '/search'` → desktop shows
the Hotel segment on both. `SearchSheet.tsx:42,46`: `isHome = pathname === '/'`;
`showDestination = isHome` → the mobile sheet shows it **only on the home page**.

**F-17 · Backend capabilities the frontend ignores.**
`faqs(hotelId)`, `restaurants(hotelId)` and `hotelDetails(id)` all exist and are never
called. FAQ and restaurants render fixtures instead; `HotelDetail` issues 6 separate
round trips where `hotelDetails` was purpose-built to aggregate them.

**F-18 · Breadcrumb crumb never renders.**
`HotelDetail.tsx:198` checks `searchParams.roomid` (lowercase); every link emits
`roomId` (camelCase). The "Room details" crumb is unreachable.

**F-19 · Featured cards drop the stay state.**
`FeaturedRooms` / `FeaturedHotels` link to `/hotel?hotelid=…&roomId=…` with no
`checkin/checkout/adults`. Dates picked in the hero search bar are lost on click.

**F-20 · Destination picker has no error path.**
`DestinationPicker.tsx:21` — `getHotelList().then(...)` with **no `.catch`**. If the
query rejects, `loading` stays `true` and the panel shows "Loading hotels…" forever.

### P3 — polish, cleanup, copy

- **F-21** Single-hotel SEO on a multi-hotel platform: `app/layout.tsx` metadata, keywords
  and JSON-LD hardcode "Executive Hotel, Rabat" for **every** route.
- **F-22** Stale copy: `app/booking/page.tsx:9` still advertises *"secure (simulated)
  payment"*; `data/index.ts:205` FAQ says *"In this prototype, payment is simulated"*.
  (These are currently the only honest statement about the mock gateway.)
- **F-23** i18n is chrome-only — ~17 strings in `constants/i18n.ts`. Selecting Arabic sets
  `dir="rtl"` on a page whose entire content stays English LTR.
- **F-24** Duplicated FX tables: `lib/format.ts:4` hardcodes `{EUR:0.091, USD:0.1,
  GBP:0.078}` and **ignores `NEXT_PUBLIC_FX_*` entirely**, while `services/catalog.ts:40`
  reads those env vars. Changing the env var moves search-card prices but not quote
  displays.
- **F-25** Dead code: `services/siteSearch.ts`, `components/layout/StickyDock.tsx`
  (unreferenced); `graphql/hotelList.graphql` + generated `HotelListDocument` (superseded
  by a hand-written string in `services/hotelList.ts`); `bookingKey` shim in
  `services/reservations.ts:163` (self-documented as transitional).
- **F-26** Empty committed directories (§1) imply an architecture that was never built.
- **F-27** `RoomDetails.tsx:495` `bookingURL(state, roomId, plan?.id ?? '')` — when no plan
  resolves, `/booking` renders "Nothing to book yet" (`BookingFlow.tsx:255` requires a
  non-empty `planId`) with no explanation.
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

- **Vitest: 11 files, 63 tests, all green** (run 2026-08-27). Coverage is `lib/*` and
  service shims; `services.test.ts` deliberately makes `gqlRequest` reject. **No test
  covers the quote/booking/payment chain**, the currency path, or promo handling.
- **Playwright: 12 specs — stale and almost certainly failing.** `e2e/helpers.ts:5`
  exports `ROOM_IDS = ['superior-double-or-twin', 'double-or-twin', 'executive-suite']`
  (fixture ids the backend rejects) and re-implements `availabilityOf()` as an FNV-1a hash
  "mirroring `availabilityFor` determinism" — a function that **no longer exists**
  (`services/availability.ts` states "All mock data functions have been removed").
  `booking.spec.ts:10` drives `roomId=executive-suite` and asserts the text
  "Executive Suite". The whole suite still targets the retired fixture world.
  **UNVERIFIED:** not executed this session (needs a built app + installed browsers).
- No test asserts anything about F-1 … F-12.

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
