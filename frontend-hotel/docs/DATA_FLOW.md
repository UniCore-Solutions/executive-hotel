# Data flow & business rules (single source of truth for services)

Exact rules ported from `hotel-html/src/mock.js` + `hotel-html/src/data.js`. Tests assert these.

## URL ≤ SearchState

Serialize/parse in `src/lib/dates.ts`:

- `checkin/checkout` `YYYY-MM-DD` — checkin ≥ today (today ok), checkout strictly after checkin
- `adults` 1–9 (default 2) · `children` 0–6 (default 0) · `ages` 0–17 list, sliced to `children` when writing · `rooms` 1–5 (default 1) · `promo` uppercased/trimmed · `cur` MAD|EUR|USD|GBP, omitted when MAD
- Writing: `checkin/checkout` only when set; `ages` only when children > 0.

## Room state (D-26)

- Room views live on the hotel page: `/hotel?roomId=<id>` (with `plan`, `extras` and stay params riding along via `roomURL()` in `src/lib/links.ts`). `/room/[roomId]` redirects here. `RoomDetails` keeps the query in sync with `history.replaceState` while preserving `roomId` (and dropping the legacy `id=` param).
- Anonymous activity (history, not search state — Rule 1): `src/services/activity.ts` stores recent searches (`rc_recent_searches_v1`) and viewed rooms (`rc_recent_rooms_v1`); recorded from SearchBar/SearchSheet submit and RoomDetails mount; surfaced by the homepage "Continue where you left off" section only when non-empty.

Validation messages (exact): `Please choose your check-in and check-out dates.` | `Check-out must be after check-in.` | `Please select an age for each child.` | `Please assign at least one adult per room.`

## Search facets (D-24)

`f_price` / `f_plans` / `f_refund` / `f_cat` / `f_am` — comma-separated multi-selects owned by the search page (not part of `SearchState`; see D-24). Codec + option definitions in `src/lib/filters.ts`; application via pure `filterEntries()` in `src/services/availability.ts` (room matches when any plan satisfies the facet; price = lowest plan price).

## Availability (deterministic, latency 350 ms)

`availabilityFor(room, ciIso)`: `hashStr(fnv1a(room.id + '|' + ciIso)) % 10000 / 100`; < 24 → `soldout`; < 42 → `few`; else `available`. Rooms `soldout` (static) or not fitting capacity are excluded from search results. Search sorts: recommended (available-first, then demand desc), price-asc, price-desc. `demand = hashStr(room.id) % 1000`.

## Rate plans (from room base price)

- `bb` — Bed & Breakfast, base price, free cancellation per room policy (policies start with `Free cancellation`)
- `ro` — Room Only, `round10(base × 0.85)` (round to nearest 10, min 1), Non-refundable
- `hb` — Half Board, `round10(base × 1.12)`, only when base ≥ 950 (so Superior 1050 and Suite 1550; Double 910 excluded)

## Quote (pricing.compute)

```
roomSubtotal   = perNight × nights × rooms
discount       = strongest valid promo applied to roomSubtotal (never stacks)
taxedBase      = max(0, roomSubtotal − discount)
taxes          = round(taxedBase × 0.12)
extrasTotal    = Σ price × qty (allowlisted extra ids)
total          = taxedBase + taxes + extrasTotal
originalTotal  = roomSubtotal + taxes + extrasTotal   (struck-through price)
```

FX (display only, MAD billed): MAD 1 · EUR 0.091 · USD 0.100 · GBP 0.078 — `convert` rounds to whole units; display via `Intl.NumberFormat('en-US', {style:'currency', maximumFractionDigits: 0})`, fallback `"{n} {CODE}"`.

## Promos (no stacking)

| Code       | Type    | Value           | Plans      | Min nights | Booking window     | Stay window        |
| ---------- | ------- | --------------- | ---------- | ---------- | ------------------ | ------------------ |
| SUMMER2026 | percent | 10              | bb, hb     | 2          | 2026-05-01 → 09-30 | 2026-06-01 → 10-31 |
| STAY4PAY3  | night   | every 4, free 1 | bb, hb, ro | 4          | all year           | all year           |
| BESTRATE   | percent | 15              | ro         | 1          | all year           | all year           |
| CORP10     | percent | 8               | bb         | 1          | all year           | all year           |
| WELCOME5   | percent | 5               | bb, hb, ro | 1          | all year           | all year           |

Discount math: percent → `round(roomSubtotal × value/100)`; night → `perNight × min(floor(nights/every) × free, nights) × rooms`.

Error messages (exact): `“{CODE}” is not a valid promo code. Check the code and try again.` · `{title} ({CODE}) needs a stay of at least {n} nights.` · `{title} ({CODE}) is only valid for bookings made {from} → {to}.` · `{title} ({CODE}) applies to stays between {from} and {to}.` · `{title} ({CODE}) is not available on this rate plan. Eligible: {plans, lowercase, comma-space}.` · success `{title} — {badge} applied.` Unknown string directly copied from reference, quotes included (typographic “ ”).

## Cancellation evaluation

- plan `ro`: non-refundable — fee = full `price.total`, label `Non-refundable — the full stay of {X} is charged.`, `freeUntilIso = ''`
- else: parse `/(\d+) days/` from room policy (default 1); `daysToArrival = ceil((checkin − today)/86400000)`; free when `daysToArrival > days` (`freeUntilIso = checkin − days`); else fee = `round(perNight)`, label `One night charged`, refund = max(0, total − fee).
- Room policies: Superior `2 days` · Double `1 day` · Suite `3 days`.

## Reservation store (localStorage `rc_reservations_v1`)

- Shape: ref `RC-XXXXXX` (alphabet `ABCDEFGHJKMNPQRSTUVWXYZ23456789`), status `confirmed|checked-in|cancelled`, checkedIn, createdAt, email, hotelId, roomId, planId, checkin, checkout, adults, children, childrenAges, rooms, extras `[{id, qty}]`, promo, price breakdown, guest `{title, firstName, lastName, email, phone, country, arrival, requests}`; optional: demo, checkedInAt, arrivalDoc, checkedInByName, cancelReason, cancelledAt.
- Store seeded with `RC-DEMO1` (demo@hotelcollection.com) and `RC-DEMO2` (guest@demo.com, checked-in) on first empty read.
- Lookup: `find(ref, email)` (case-insensitive, both match) · `byRef` · `byEmail`.
- Update: merge patch by ref.
- Idempotency (`rc_booking_done`): item `room:{roomId}:{planId}:{checkinISO}:{checkoutISO}`; finished within 30 min → `exitRef` banner on booking page; on successful booking `finish(ref)`.

## Auth (mock, localStorage `rc_users_v1` + `rc_session_v1`)

- Seed `demo@hotelcollection.com` / `demo1234` (name Adam Benali).
- Register: duplicate email error `An account with this email already exists. Sign in instead.`; auto-login.
- Login failures: `Incorrect email or password.`; forgot: `If an account exists for this email, a reset link has been sent (mock).`
- Session `{email, name, at}`; header shows `{First name}'s account`; booking form prefills name/email.

## Payment mock

`charge({card, amount})` → 1.6 s delay; card digits ending in `1` → declined `Your card was declined by the issuing bank. Please try another card.`; else authorised. UI: card fields w/ masks (16-digit grouping, MM/YY, CVC 3–4), terms checkboxes gating, decline/failure banners, button lock + `Processing…` + `Try again`.

## Consent, newsletter, language

- Consent `rc_consent_v1` `{necessary:true, analytics:false, preferences:false, updatedAt, chosen}`; banner until chosen; dialog reopen (footer + account).
- Newsletter `rc_newsletter_v1`; requires consent checkbox; double-opt-in mock copy.
- Language `rc_lang` en|fr|ar; `document.documentElement.lang/dir` (rtl for ar); header labels translated (dictionary in data).

## UI helpers (exact label sets)

- Availability badges: `Sold out` (clay) · `Few rooms left` (gold-dark) · `Available` (emerald).
- Plan badges: `Free cancellation` (navy) · `Non-refundable` (clay).
- Quote table rows: `Rooms` (n × price × nights) · `Promo {code}` (emerald, −discount) · `Extras & services` · `Taxes & fees (12%)` · `Total`; footnote `Indicative price in {cur} · billed in MAD · {note}`; highlighted total (gold box) on booking/confirmation.
- Steppers: adults/children/rooms; `Done`/`Apply` semantics per panel; children ages default 4, `0–17`.
