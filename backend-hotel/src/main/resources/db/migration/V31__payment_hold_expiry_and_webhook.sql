-- V31: activates the pending-hold design that was already present in the
-- schema since V6 (reservations.hold_expires_at) but never used by the
-- application — see docs/investigations/BOOKING_PAYMENT_UX_PLAN_2026-08-31.md.
-- Reservations now start 'pending' with a hold TTL and are only promoted to
-- 'confirmed' once payment captures; a scheduled job releases expired holds
-- through the existing cancellation path, which needs a reason code for it.

INSERT INTO cancellation_reasons (id, code, label, status)
VALUES ('00000000-0000-0000-0000-000000000021', 'payment_timeout',
        'Payment hold expired before payment completed', 'active');

-- The hold-expiry job scans for pending reservations whose hold has passed;
-- a partial index keeps that scan cheap as the table grows (most rows are
-- not pending, and of those most have no hold at all once resolved).
CREATE INDEX idx_reservations_pending_hold ON reservations (hold_expires_at)
    WHERE status = 'pending';
