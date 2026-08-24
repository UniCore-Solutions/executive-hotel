-- V7: BILLING / STAY
-- Source: database/collection-schema-postgresql.sql (approved schema, section 7).
-- payments (+ provider idempotency partial unique), payment_transactions,
-- invoices + items, check_ins (direct reservation FK + composite guest FK).

-- ====================================================================
-- 7. BILLING / STAY
-- ====================================================================

CREATE TABLE payments (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    reservation_id      BIGINT NOT NULL,
    amount              NUMERIC(10,2) NOT NULL
                        CONSTRAINT chk_payments_amount CHECK (amount > 0),
    currency_code       CHAR(3) NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CONSTRAINT chk_payments_status CHECK (status IN ('pending','authorized','captured','failed',
                                                                         'refunded','partially_refunded','cancelled')),
    provider            VARCHAR(50) NOT NULL,          -- provider code as data; SDKs stay in infrastructure/provider
    provider_reference  VARCHAR(150),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- C1: payment currency must match the reservation's billing currency (C8)
    CONSTRAINT fk_payments_reservation FOREIGN KEY (reservation_id, currency_code)
        REFERENCES reservations (id, currency_code)
);

CREATE INDEX idx_payments_reservation ON payments (reservation_id);
-- C17: idempotency/webhook handle per provider
CREATE UNIQUE INDEX uq_payments_provider_reference ON payments (provider, provider_reference)
    WHERE provider_reference IS NOT NULL;

CREATE TABLE payment_transactions (
    id                       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    payment_id               BIGINT NOT NULL REFERENCES payments(id),
    transaction_type         VARCHAR(20) NOT NULL
                        CONSTRAINT chk_payment_transactions_type CHECK (transaction_type IN
                                                                       ('authorization','capture','refund','void')),
    amount                   NUMERIC(10,2) NOT NULL
                        CONSTRAINT chk_payment_transactions_amount CHECK (amount >= 0),
    status                   VARCHAR(20) NOT NULL
                        CONSTRAINT chk_payment_transactions_status CHECK (status IN ('pending','succeeded','failed','reversed')),
    provider_transaction_id  VARCHAR(150),
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_transactions_payment ON payment_transactions (payment_id);
CREATE INDEX idx_payment_transactions_provider ON payment_transactions (provider_transaction_id);

CREATE TABLE invoices (
    id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    invoice_number        VARCHAR(30) NOT NULL UNIQUE,
    reservation_id        BIGINT NOT NULL,
    guest_id              BIGINT NOT NULL,
    billing_name          VARCHAR(150) NOT NULL,                     -- snapshotted, independent of later guest edits
    billing_address       VARCHAR(255),
    billing_country_code  CHAR(2) REFERENCES countries(code),
    currency_code         CHAR(3) NOT NULL REFERENCES currencies(code),
    subtotal_amount       NUMERIC(10,2) NOT NULL,
    discount_amount       NUMERIC(10,2) NOT NULL DEFAULT 0,
    tax_amount            NUMERIC(10,2) NOT NULL DEFAULT 0,
    fee_amount            NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_amount          NUMERIC(10,2) NOT NULL,
    status                VARCHAR(20) NOT NULL DEFAULT 'issued'
                        CONSTRAINT chk_invoices_status CHECK (status IN ('issued','paid','void')),
    issued_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- C1: an invoice's guest must be the reservation's booking guest
    CONSTRAINT fk_invoices_reservation FOREIGN KEY (reservation_id, guest_id)
        REFERENCES reservations (id, guest_id),
    CONSTRAINT chk_invoices_discount_cap CHECK (discount_amount <= subtotal_amount),
    CONSTRAINT chk_invoices_amounts CHECK (subtotal_amount >= 0 AND discount_amount >= 0
                                           AND tax_amount >= 0 AND fee_amount >= 0),
    CONSTRAINT chk_invoices_totals CHECK (
        total_amount = subtotal_amount - discount_amount + tax_amount + fee_amount)
);

CREATE INDEX idx_invoices_reservation ON invoices (reservation_id);

CREATE TABLE invoice_items (
    id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    invoice_id            BIGINT NOT NULL REFERENCES invoices(id),
    description           VARCHAR(255) NOT NULL,                    -- e.g. 'Deluxe Room x 3 nights', 'VAT'
    item_type             VARCHAR(20) NOT NULL
                        CONSTRAINT chk_invoice_items_type CHECK (item_type IN ('room','extra','tax','fee','discount')),
    quantity              NUMERIC(6,2) NOT NULL DEFAULT 1
                        CONSTRAINT chk_invoice_items_quantity CHECK (quantity > 0),
    unit_price            NUMERIC(10,2) NOT NULL
                        CONSTRAINT chk_invoice_items_unit CHECK (unit_price >= 0),
    total_price           NUMERIC(10,2) NOT NULL,
    sort_order            SMALLINT NOT NULL DEFAULT 0,
    CONSTRAINT chk_invoice_items_total CHECK (total_price = unit_price * quantity)
);

CREATE INDEX idx_invoice_items_invoice ON invoice_items (invoice_id);

CREATE TABLE check_ins (
    id                     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    reservation_id         BIGINT NOT NULL,
    reservation_guest_id   BIGINT,
    status                 VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CONSTRAINT chk_check_ins_status CHECK (status IN ('pending','completed')),
    arrival_time_estimate  VARCHAR(20),
    preferences            TEXT,
    id_document_reference  VARCHAR(255),                          -- tokenized/hashed reference, never the document
    verified_at            TIMESTAMPTZ,
    checked_out_at         TIMESTAMPTZ,                            -- explicit checkout event; NULL while in-house
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- C1: the check-in guest line must belong to the same reservation;
    -- direct FK guarantees the reservation itself always exists even when
    -- reservation_guest_id is NULL (composite FK would be vacuously satisfied)
    CONSTRAINT fk_check_ins_reservation FOREIGN KEY (reservation_id) REFERENCES reservations(id),
    CONSTRAINT fk_check_ins_reservation_guest FOREIGN KEY (reservation_id, reservation_guest_id)
        REFERENCES reservation_guests (reservation_id, id),
    CONSTRAINT chk_check_ins_checkout CHECK (checked_out_at IS NULL OR status = 'completed')   -- C18
);

CREATE INDEX idx_check_ins_reservation ON check_ins (reservation_id);
