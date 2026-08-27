-- V23: payment-side idempotency + "at most one in-flight payment per reservation"
--
-- Closes two gaps found in a live-reproduced double-charge investigation
-- (docs/investigations/TASK2-TASK3-CURRENCY-AND-ATOMICITY.md):
--   1. createPayment had no idempotency key, so a retried request could
--      create a second payment row for the same attempt.
--   2. the balance check only ever summed CAPTURED payments, so two
--      independent pending payments for the same reservation could both be
--      created (and both subsequently captured), overcharging the guest.
-- Both are closed with additive, partial unique indexes — no existing
-- column changes, no new tables, no data migration (payments is small in
-- every environment this was checked against).

ALTER TABLE payments ADD COLUMN idempotency_key VARCHAR(100);

-- Mirrors reservations.idempotency_key (V6): a retried createPayment with the
-- same key must resolve to the same payment row, never a duplicate.
CREATE UNIQUE INDEX uq_payments_idempotency_key ON payments (idempotency_key)
    WHERE idempotency_key IS NOT NULL;

-- At most one payment may be "in flight" (pending, not yet captured/failed)
-- per reservation at any time. This is the DB-enforced invariant that makes
-- the double-charge reproduced in the investigation structurally impossible,
-- independent of any application-level check.
CREATE UNIQUE INDEX uq_payments_reservation_pending ON payments (reservation_id)
    WHERE status = 'pending';
