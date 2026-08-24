# Account & reservation workflow

## My Reservation (`/reservation`)

**Lookup** — reference (uppercase) + email; presence validation `Please enter both your reference and email address.`; neutral not-found `No reservation found for those details. Check the reference and the email used at booking.`; in-flight `Looking for your stay…`; demo hint box (RC-DEMO1 / demo@hotelcollection.com, RC-DEMO2 / guest@demo.com). `?ref=` deep-link bypasses the email step (view needs a reservation; requires only ref).

**Dashboard**

- Status banner: Confirmed / Checked in (`Welcome to the hotel! Your room is ready from 15:00.`) / Cancelled.
- Your stay card: ref, room image+name, check-in `{fmt} · from 15:00`, check-out `{fmt} · by 11:00`, guests (with ages), plan (+ promo), extras (`None booked` empty state).
- Check-in CTA (`Arriving soon?`) shown only when `confirmed && checkin <= today < checkout` → `/checkin?ref=`.
- Price summary (same quote-table semantics; `settled (simulated) at booking` footnote) + Mobile key QR card.
- **Need to cancel?** — `Free cancellation until {fmt}.` / `Non-refundable rate — the full stay is due.`; due line `No fee applies today.` / `Cancelling today would charge {X} ({label}).`; double-confirm modal (fee box, reason select), `Keep my stay` / `Cancel reservation`; cancelled → disabled `Already cancelled`.

**Add extras** — full catalog with qty steppers (caps: late-checkout/airport-shuttle 1, else 6); delta preview `aria-live` (`New balance with extras: {X} (+Δ)` / `Extras removed — new balance: {X}`); save writes extras + fresh quote; already-cancelled hides the panel.

**Modify dates/occupants (improvement, documented decision)** — dialog to adjust check-in/check-out/adults/children/rooms with live quote + differential display (green `+Δ` clay `−Δ`), `Apply changes` updates the reservation (price recomputed from the room's plan + new dates) and re-renders; fee/cancellation policy line refreshes.

## Online check-in (`/checkin?ref=`)

Guards: missing/unknown ref → `Booking not found` + find-my-reservation CTA; cancelled → check-in unavailable message; already checked in → `You're all checked in` + ref. Form: lead guest (prefilled), ID/passport (≥ 5 chars, `Required at arrival by Moroccan law`), arrival slot, mobile (prefilled), notes (optional, **now persisted**). Submit → `Checking you in…` → updates reservation `{checkedIn, status:'checked-in', checkedInAt, arrivalDoc, arrival, checkedInByName, notes}` → toast `Welcome, {name} — your room is ready from 15:00.`

## Guest account dashboard

Covered in AUTHENTICATION_WORKFLOW.md (profile, bookings by email, preferences).

## Data consistency

All mutations go through `reservations.update`; views re-render from a fresh `byRef` read after every mutation (no stale React state), so confirmation / reservation / check-in / account always agree. Demo seeds are protected from modification expectations (tags `demo: true`) but remain mutable like real ones for testing Modify/Cancel flows.
