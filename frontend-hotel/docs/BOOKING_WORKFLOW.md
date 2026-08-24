# Booking workflow (Next.js implementation)

## Journey map

```
Home/search widget or /search
  → /search?checkin&checkout&adults&children&ages&rooms&promo&cur      (availability engine)
  → /hotel#rooms | /offers?promo=CODE (cards deep-link back into /search)
  → /room/[roomId]?plan=&checkin=&…&extras=                              (room detail, booking card)
  → /booking?room=&plan=&extras=&checkin=&…                             (tunnel)
  → /confirmation?ref=RC-XXXXXX                                         (confirmed)
  → /reservation?ref=RC-XXXXXX  ⇄  /checkin?ref=RC-XXXXXX                (manage + check in)
```

## State consistency rules

1. **URL is the single source of truth** for stay context (dates, guests, ages, rooms, promo, currency). Every page hydrates from the same parser; every user change flows back through `router.replace`/`push` of the same serializer. No duplicated booking state, no localStorage for search.
2. **No silent replacement**: if a user lands on a page with invalid/incomplete dates, the UI shows the explicit choice states (`Select dates`, `Choose dates to see the exact price.`), never fabricated dates. The calendar widget defaults to empty and shows `Select your check-in date`.
3. **Room page**: `bookFlow` gates — no dates → open the date picker (not a fake booking); soldout → disabled CTA + toast; guests don't fit capacity → explicit alert + toast; otherwise deep-link to `/booking` with full context (room, plan, extras, dates, guests, ages, rooms, promo, currency).
4. **Booking page guards**: missing `room`/`plan`/dates or unknown room/plan → `Nothing to book yet` panel with `Search rooms` CTA (never a fake quote).
5. **Promo consistency**: the same `pricing.validate` runs on search (per plan), offers (feasibility), room (per selected plan), booking (applies to quote), and confirmation displays the applied promo; a promo that fails a rule at a later step produces the exact error message, never a silent drop. Booking-side code entry now applies a valid code to the quote (see DECISIONS).
6. **Idempotency**: same room+plan+dates within 30 min → `You already confirmed this booking` banner with a view-confirmation link; submit button locked while processing; redirect guard prevents double creation.

## Tunnel (2 steps)

**Step 1 — Guest details** (header + field validation, exact messages in DATA_FLOW; fields: title, first name, last name, email, phone, country, arrival time, special requests). Session prefill when signed in. Errors per field (`role="alert"`), `aria-invalid`, cleared on input.

**Step 2 — Payment & confirm** (masked card fields, terms checkboxes unchecked + gated, decline path `…declined by the issuing bank…`, failure path `…could not process your payment…`, `Total due`, `Confirm & pay` → `Processing…` → `Try again`).

On success: reservation created (`reservations.create`, ref generated), idempotency finished, toast `Your room is confirmed — see you in Rabat.` → redirect `/confirmation?ref=…`.

## Price composition (single source: pricing.compute)

Room subtotal (perNight × nights × rooms) − promo discount + extras + 12% taxes on discounted base → total; originalTotal struck-through with savings badge wherever a promo applies (search cards, room, booking, confirmation, reservation).

## Hold chip (improvement)

Booking page shows a 15-minute mock hold countdown chip (`Your rate may change — guaranteed for 13:59`), purely informational; no price mutation on expiry (documented decision).

## Reservation lifecycle

confirmed →(check-in wizard)→ checked-in · confirmed →(cancel w/ double-confirm + fees)→ cancelled. Modify flow (improvement): date/occupant edit dialog recomputes price differential (`+Δ` / `−Δ`) before applying; applied via `reservations.update` with a fresh quote.

## Inputs/outputs per step

| Step         | Inputs                                  | Outputs                                           |
| ------------ | --------------------------------------- | ------------------------------------------------- |
| Availability | URL stay context                        | filtered room×plan entries, promo analysis, sort  |
| Room         | stay context + plan + extras            | quote, availability, CTA URL                      |
| Booking      | URL context + guest form + card + terms | reservation object → confirmation                 |
| Confirmation | ref                                     | recap, QR, .ics file, actions                     |
| Reservation  | ref + email                             | lookup result; mutations update store + re-render |

## Validation summary

Search: date rules + ages + adults-per-room. Booking: name regex `^[A-Za-zÀ-ÿ' -]+$`, email regex, phone `^[+\d][\d\s.-]{6,}$`, card number `\d{13,19}`, future expiry (MM/YY, current month ok), CVC `\d{3,4}`, terms gate. Check-in: name ≥ 2 chars, doc ≥ 5 chars, phone regex.
