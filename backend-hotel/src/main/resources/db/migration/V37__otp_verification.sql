-- V37: OTP-gated registration verification + OTP-gated guest reservation lookup.
--
-- Registration (blocking): a new/completing account is created 'pending_verification'
-- (not 'active') until its OTP is verified — status stays out of findActiveWithRoles
-- (login) automatically, no extra guard needed there.
--
-- Reservation lookup (guest, no account): reference+email alone is no longer
-- sufficient to read a reservation's details — an OTP emailed to that address
-- must be verified first. See BookingService#getByReferenceAndEmailVerified.
-- BookingService#getByReferenceAndEmail (reference+email only, no OTP) is left
-- untouched — it still backs cancellation and the same-session payment-status
-- poller right after booking, which must not require an OTP round trip.

ALTER TABLE users DROP CONSTRAINT chk_users_status;
ALTER TABLE users ADD CONSTRAINT chk_users_status
    CHECK (status IN ('active','inactive','locked','provisioned','pending_verification'));

ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMPTZ;

CREATE TABLE otp_codes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purpose             VARCHAR(30) NOT NULL
                        CONSTRAINT chk_otp_codes_purpose CHECK (purpose IN ('registration_verification','reservation_lookup')),
    -- Always the target's own address — never a display/billing name, so no
    -- guest-controlled text ends up here.
    email               VARCHAR(255) NOT NULL,
    -- SHA-256 hex of the code; the plaintext code is never persisted anywhere.
    code_hash           VARCHAR(64) NOT NULL,
    user_id             UUID REFERENCES users(id),
    reservation_id      UUID REFERENCES reservations(id),
    attempts            INTEGER NOT NULL DEFAULT 0
                        CONSTRAINT chk_otp_codes_attempts CHECK (attempts >= 0),
    max_attempts        INTEGER NOT NULL DEFAULT 5 CONSTRAINT chk_otp_codes_max_attempts CHECK (max_attempts > 0),
    -- Set the moment the correct code is entered; the row is still kept
    -- (its id doubles as the short-lived "verified" grant handle for the
    -- reservation-lookup purpose — see BookingService#getByReferenceAndEmailVerified).
    verified_at         TIMESTAMPTZ,
    expires_at          TIMESTAMPTZ NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- "the current code for this email+purpose" and resend-cooldown checks.
CREATE INDEX idx_otp_codes_active ON otp_codes (email, purpose, created_at DESC);
-- The verified-grant lookup (reservation-lookup gate): by id, scoped to
-- reservation+email, only ever matches a row that was actually verified.
CREATE INDEX idx_otp_codes_grant ON otp_codes (id, reservation_id, email) WHERE verified_at IS NOT NULL;
