---
name: hotel-project-facts
description: Facts about the Executive Boutique Hotel Rabat app — data model, pricing, promo rules, URL spec, design tokens, storage keys. Use when implementing or fixing any feature of this hotel application.
---

# Hotel Project Facts

Reference source of behavior: the static HTML app in `hotel-html/` (sibling of this project) and the discovery docs in `docs/`.

## Domains (single source of truth)

- Types: `src/types/` · Fixture data: `src/data/` · Business rules: `src/services/` · UI: `src/components/` + `src/app/`.
- One hotel: `Executive Boutique Hotel Rabat` (Agdal, Rabat). 3 rooms: `superior-double-or-twin` (1050 MAD), `double-or-twin` (910 MAD), `executive-suite` (1550 MAD, terrace).
- Rate plans per room: `bb` (base), `ro` (−15%, non-refundable), `hb` (+12%, only when base ≥ 950).

## URL spec (lowercase params, URL is state)

`checkin|checkout=YYYY-MM-DD`, `adults` 1–9, `children` 0–6, `ages` comma list 0–17, `rooms` 1–5, `promo` (uppercased), `cur` MAD|EUR|USD|GBP (omitted when MAD). `id`/`plan`/`room`/`extras`/`ref` are page-specific.

## Prices (MAD billing, display conversion indicative)

- FX: MAD 1 · EUR 0.091 · USD 0.100 · GBP 0.078. Round to whole units.
- Quote: `roomSubtotal = perNight × nights × rooms`; promo discount on roomSubtotal; `taxes = round((roomSubtotal − discount) × 0.12)`; `total = taxedBase + taxes + extrasTotal`; `originalTotal = roomSubtotal + taxes + extrasTotal`.
- Promo codes never stack. Rules: SUMMER2026 −10% (bb/hb, min 2 nts, booking 2026-05-01→09-30, stay 06-01→10-31) · STAY4PAY3 4th night free (all plans, min 4) · BESTRATE −15% (ro) · CORP10 −8% (bb) · WELCOME5 −5% (all).
- Availability is deterministic: FNV-1a hash of `roomId|checkinISO`; `<24` soldout, `<42` few, else available.

## Exact strings that must be preserved

- Validation: `'Please choose your check-in and check-out dates.'` · `'Check-out must be after check-in.'` · `'Please select an age for each child.'` · `'Please assign at least one adult per room.'`
- Promo errors: `“CODE” is not a valid promo code. Check the code and try again.` etc.
- Demo seeds: `RC-DEMO1` / `demo@hotelcollection.com` and `RC-DEMO2` / `guest@demo.com`. Demo account: `demo@hotelcollection.com` / `demo1234`.
- Booking tunnel is 2 steps: Guest details → Payment & confirm.

## Design tokens

`navy #142639 / light #1E3A54 / dark #0D1C29` · `gold #B98B3E / light #D9B876 / dark #8F692C` · `clay #A2543A` · `paper #F7F4EE` · `ink #20242C`. Fonts: Fraunces (display), Inter (sans), Cormorant Garamond (script). Primary actions navy; gold is an accent.

## Storage keys (client-only, isolated behind services)

`rc_reservations_v1`, `rc_users_v1`, `rc_session_v1`, `rc_consent_v1`, `rc_newsletter_v1`, `rc_booking_done`, `rc_lang`.

## Quality gates

`npm run typecheck` · `npm run lint` · `npm test` · `npm run build` · `npm run test:e2e`. A feature is Done only when implemented AND verified by the relevant gates.
