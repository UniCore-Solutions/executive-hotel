-- V16: DROP chk_reservation_extras_total (pricing-model-aware extra totals)
-- Extra line totals are pricing-model dependent: per_person includes adults,
-- per_night includes nights, per_room includes rooms (PricingService.extraLines,
-- frontend src/services/pricing.ts). The CHECK (total_price = unit_price *
-- quantity) only holds for per_stay extras and rejected valid bookings.
-- BookingService persists exactly the quote's computed lines (server-side
-- pricing), so the CHECK added no integrity beyond the code.

ALTER TABLE reservation_extras
    DROP CONSTRAINT IF EXISTS chk_reservation_extras_total;