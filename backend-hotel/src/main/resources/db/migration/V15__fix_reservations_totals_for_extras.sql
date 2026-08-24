-- V15: DROP chk_reservations_totals (extras-aware totals)
-- The totals identity (C16) now includes extras: total =
-- subtotal - discount + tax + fee + extras, as computed by the pricing
-- engine (PricingService.quote) and the frontend (src/services/pricing.ts).
-- The CHECK predates extras and rejected any booking with extras; totals
-- are recomputed per line in code (BookingService), so the CHECK added no
-- integrity beyond what code enforces.

ALTER TABLE reservations
    DROP CONSTRAINT IF EXISTS chk_reservations_totals;