# Discovery — existing HTML product analysis

Source: `hotel-html/` (reference project). Product: **Executive Boutique Hotel Rabat** — a single luxury 4★ property in the Agdal district of Rabat. The reference is a static multi-page HTML + vanilla JS SPA-style site (Tailwind v4 CSS, `window.RC` framework split across `data.js`, `mock.js`, `common.js`, `ui.js` and per-page scripts), served by any static server.

## 1. Environment / tech of the reference

- 16 `.html` pages; no build framework; Tailwind v4 CLI; fonts via Google Fonts (Fraunces, Inter, Cormorant Garamond).
- Runtime scripts: `data.js` (fixtures ~26 KB), `mock.js` (business rules ~16 KB), `common.js` (framework ~67 KB), `ui.js` (~14 KB), page scripts (search/room/booking/reservation/checkin/account/confirmation/offers/faq).
- Playwright/Puppeteer e2e suite (`tests/e2e.mjs`) over `python3 serve.py`.
- Product docs: `docs/PRD.md` (218 lines) + `docs/TRACKING.md` (81 stories / 15 epics).

## 2. Page inventory (16 pages)

| #   | Page                | Route                          | Purpose                                                                                                                               |
| --- | ------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | index               | `/`                            | Hero + search widget, rooms grid, experiences, offers, reviews carousel, location, newsletter                                         |
| 2   | search              | `/search`                      | Availability engine: room × rate plans for the date range, sort, promo banner, stay summary, skeleton, empty state                    |
| 3   | hotel               | `/hotel`                       | Property page: hero, story, facilities, rooms, dining, experiences, reviews, location, FAQ preview (anchors)                          |
| 4   | room                | `/room?id=`                    | Room detail: gallery, stay strip (dates/guests/rooms), booking card (rates, extras, promo, quote, CTA), pickers, siblings, hotel card |
| 5   | offers              | `/offers?promo=`               | 5 promo cards, feasibility chip, copy code, best-rate promise band                                                                    |
| 6   | booking             | `/booking?room=&plan=&extras=` | 2-step tunnel: Guest details → Payment & confirm; sidebar summary (quote, promo, extras, hold banner info)                            |
| 7   | confirmation        | `/confirmation?ref=`           | Booking confirmed recap: timeline, stay details, price, QR, actions (manage/check-in/share/copy ref)                                  |
| 8   | reservation         | `/reservation?ref=`            | My Reservation: lookup (ref+email), dashboard (status, stay, price, mobile key QR, cancel w/ fees, add extras)                        |
| 9   | checkin             | `/checkin?ref=`                | Online check-in wizard (name, doc, arrival, phone, notes)                                                                             |
| 10  | account             | `/account`                     | Mock auth (sign in / create account / forgot) + dashboard (profile, bookings, preferences)                                            |
| 11  | faq                 | `/faq`                         | FAQ search + grouped accordions                                                                                                       |
| 12  | contact             | `/contact`                     | Contact info cards + form (mock submit, honeypot)                                                                                     |
| 13  | terms               | `/terms`                       | Legal                                                                                                                                 |
| 14  | privacy             | `/privacy`                     | Legal                                                                                                                                 |
| 15  | cookies             | `/cookies`                     | Legal + consent toggles                                                                                                               |
| 16  | cancellation-policy | `/cancellation-policy`         | Legal                                                                                                                                 |

## 3. Shared systems discovered

- **Header**: fixed utility bar (phone `+212 5 37 27 88 60`, address dim line, language dropdown, currency dropdown, My reservation, Account-with-name), brand row, desktop nav (Rooms/Offers/Experiences/Reviews/FAQ — page-aware anchors), navy `Book now` CTA, mobile hamburger + slide menu, cell/mobile calls. Theme: light (paper scrim) or dark (transparent over hero); frosted paper `blur(18px)` + border when scrolled.
- **Footer**: 4 columns (brand, Stay, Support incl. consent reopen, Contact), legal bar, `Prices in {cur} · indicative · billed in MAD`.
- **Search widget**: one component everywhere (Home hero + Search card). Desktop: segmented pill → floating panels (double-month calendar; guests steppers + child ages; promo editor). Mobile (< md): pill → bottom sheet with calendar/steppers/promo. Sticky dock on home only. URL persisted via `history.replaceState`.
- **Calendar**: 2 fixed months, Monday-first, `Mo–Su`; today selectable; past disabled; check-in→check-out click state machine; hover band; status hints (`Step 1 of 2`, `Range set — confirm or adjust`); `Confirm dates` bar.
- **Guests**: steppers adults 1–9 / children 0–6 / rooms 1–5; per-child age selects (0–17, default 4); ages mandatory when children > 0; `adults = max(adults, rooms)`.
- **Toasts**: `RC.toast(msg, type, title)` — ok (emerald ✓ 4.2 s), error (clay ✕ 6 s), info (navy i); fixed bottom-right; click dismiss.
- **Modal**: singleton; backdrop click / Escape close; focus first field.
- **Consent banner + dialog**: localStorage `rc_consent_v1`; banner on first visit (Accept all / Essential only / Customise); dialog with 3 toggles; reopen from footer.
- **Currency**: `RC.fx` MAD/EUR/USD/GBP (indicative, whole units); `cur=` in URL; `Intl.NumberFormat` display; `rc:currency` custom event.
- **Language**: EN working; FR/AR dictionary for header labels (`rc_lang` in localStorage; `document.dir=rtl` for AR).
- **JSON-LD**: Hotel schema on `/` + `/hotel`; HotelRoom + Offer on `/room`; Reservation on `/confirmation`.

## 4. Business rules discovered

- **Availability**: deterministic FNV-1a hash `hash(roomId|checkinISO)` → <24 soldout, <42 few; latency 350 ms.
- **Plans**: bb base · ro −15% (`round10`) non-refundable · hb +12% when base ≥ 950; `getStay/getPlans` 250 ms.
- **Pricing**: roomSubtotal = perNight×nights×rooms; discount on roomSubtotal; taxes 12% of discounted base; total = taxedBase+taxes+extras; originalTotal incl. struck-through; promo never stacks.
- **Promo codes**: SUMMER2026 (−10%, bb/hb, min 2 nts, booking 05-01→09-30, stay 06-01→10-31), STAY4PAY3 (4th night free, all, min 4), BESTRATE (−15%, ro), CORP10 (−8%, bb), WELCOME5 (−5%, all). Exact error messages documented in DATA_FLOW.md.
- **Extras**: airport-shuttle 250/stay, late-checkout 300/stay, baby-cot 150/stay, meeting-room 400/day, laundry-service 50/item. Qty steppers (cap 5; per-person logic supported by UI but no per-person extra exists in data).
- **Reservations**: localStorage `rc_reservations_v1`; ref format `RC-XXXXXX` (ambiguous chars excluded); seeds `RC-DEMO1` (demo@hotelcollection.com, confirmed) and `RC-DEMO2` (guest@demo.com, checked-in); create/update/find/byRef/byEmail; idempotency key `rc_booking_done` (30 min window, `bk-<ts>-<rand>`); booking item string `room:{roomId}:{planId}:{checkin}:{checkout}`.
- **Cancellation**: `ro` non-refundable full stay; else parse `N days` policy; free until N days before; else one night + label `One night charged`; demo suite policy = free until 3 days (room `executive-suite`).
- **Auth (mock)**: localStorage `rc_users_v1` (plaintext password — prototype only), `rc_session_v1`; demo user `demo@hotelcollection.com` / `demo1234`; register/login/forgot (mock reset message); now: book-6 mock payment declines card numbers ending in `1`.
- **Check-in**: updates reservation `{checkedIn: true, status: 'checked-in', arrivalDoc, arrival, checkedInByName, checkedInAt}`.
- **Newsletter**: `rc_newsletter_v1`; consent required; WELCOME5 hint.
- **Contact form**: mock submit; honeypot field.

## 5. Gaps between documentation and shipped reference (PRD/TRACKING claim vs code)

| Claim                                               | Truth in code                                         | Migration handling                                                    |
| --------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------- |
| `.ics` add-to-calendar on confirmation (BOOK-8 ✅)  | not implemented                                       | Implemented in Next.js as a genuine improvement (documented decision) |
| 15-min hold countdown (BOOK-9 🧪)                   | not implemented                                       | Implemented as info banner with countdown (documented decision)       |
| Modify dates/occupants on My Reservation (RES-2 ✅) | only cancel + add extras exist                        | Implemented in Next.js (documented decision)                          |
| 3-D Secure frame (BOOK-6 🧪)                        | no frame; single decline path                         | Kept as shipped (decline + failure paths); documented                 |
| `f_*` filters, `sort=rating/popularity` (PRD §6/§8) | shipped: sort = recommended/price-asc/price-desc only | Kept shipped scope; documented                                        |
| Per-person extras                                   | UI supports, data has none                            | Kept; engine supports `per person` for future data                    |
| Check-in `ci-notes` persisted                       | not persisted                                         | Persist (documented decision)                                         |
| booking-side promo field applies to quote           | updates status line only (quirk)                      | Fixed: valid promo applies to quote (documented decision)             |

## 6. Assets

- Hotel/room photography: `cf.bstatic.com/xdata/images/hotel/max1024x768/…` and `aw-d.tripcdn.com/images/…` (remote URLs — reused as-is; Next `images.remotePatterns` allowlists them; `onerror`-style fallback to Unsplash placeholder).
- No local image files in the reference; fonts are Google Fonts (reloaded via `next/font/google` in Next.js).
- Favicon: inline SVG data-URI letter mark (E on home/hotel, R elsewhere) — recreated as a single SVGs favicon.

## 7. Personas & journeys (from PRD)

1. Direct guest: Home → Search → Hotel → Room → Booking → Confirmation → My Reservation → Check-in.
2. Returning guest: My Reservation lookup by ref+email; online check-in.
3. Accountholder: dashboard profile/preferences/stays.
4. Business/FIT: promo codes (CORP10), offers page.
