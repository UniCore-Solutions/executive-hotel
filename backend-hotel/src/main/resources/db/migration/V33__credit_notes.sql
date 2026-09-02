-- V33: credit notes for cancelled reservations that had an invoice.
-- Deferred from the 2026-09-02 invoice/refund work — see KNOWN_ISSUES.md §B5.
--
-- A credit note documents the adjustment against an already-issued invoice
-- when its reservation is cancelled: what the invoice originally charged,
-- how much was retained as a cancellation penalty, and how much was
-- actually credited back (capped at what was collected — same rule the
-- refund itself already follows in BookingServiceImpl#doCancel). One per
-- reservation, issued automatically alongside the refund — never on demand,
-- since it only ever documents something that already happened.
--
-- Deliberately NOT generated when no invoice was ever issued (a reservation
-- cancelled before it confirmed): there is nothing to adjust against.

CREATE TABLE credit_notes (
    id                           UUID NOT NULL,
    credit_note_number           VARCHAR(30) NOT NULL UNIQUE,
    invoice_id                   UUID NOT NULL REFERENCES invoices(id),
    reservation_id                UUID NOT NULL,
    reservation_cancellation_id   UUID NOT NULL REFERENCES reservation_cancellations(id),
    guest_id                      UUID NOT NULL,
    billing_name                  VARCHAR(150) NOT NULL,               -- snapshotted, same as invoices.billing_name
    currency_code                 CHAR(3) NOT NULL REFERENCES currencies(code),
    original_amount                NUMERIC(10,2) NOT NULL,             -- the invoice's total_amount at issue time
    penalty_amount                 NUMERIC(10,2) NOT NULL,              -- retained, matches reservation_cancellations.penalty_amount
    credited_amount                NUMERIC(10,2) NOT NULL,              -- matches reservation_cancellations.refund_amount
    status                         VARCHAR(20) NOT NULL DEFAULT 'issued'
                                CONSTRAINT chk_credit_notes_status CHECK (status IN ('issued')),
    issued_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (id),
    -- Same shape as invoices' own FK: a credit note's guest must be the
    -- reservation's booking guest.
    CONSTRAINT fk_credit_notes_reservation FOREIGN KEY (reservation_id, guest_id)
        REFERENCES reservations (id, guest_id),
    CONSTRAINT uq_credit_notes_reservation UNIQUE (reservation_id),
    CONSTRAINT uq_credit_notes_cancellation UNIQUE (reservation_cancellation_id),
    CONSTRAINT chk_credit_notes_amounts CHECK (
        original_amount >= 0 AND penalty_amount >= 0 AND credited_amount >= 0),
    CONSTRAINT chk_credit_notes_totals CHECK (credited_amount <= original_amount)
);

CREATE INDEX idx_credit_notes_invoice ON credit_notes (invoice_id);
