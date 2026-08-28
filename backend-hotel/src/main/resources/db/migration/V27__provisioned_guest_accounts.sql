-- ============================================================================
-- V27: PROVISIONED GUEST ACCOUNTS
-- ----------------------------------------------------------------------------
-- Every accountless booking silently provisions a passwordless user account
-- ("provisioned" status, NULL password_hash) linked to the booking's guest
-- record. When the guest later registers with the same email, the account is
-- COMPLETED: password set, status moved to 'active', profile refreshed — no
-- duplicate account, and the pre-registration bookings appear under
-- "My bookings" (guests.user_id is already set).
-- ============================================================================

ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

ALTER TABLE users DROP CONSTRAINT chk_users_status;
ALTER TABLE users ADD CONSTRAINT chk_users_status
    CHECK (status IN ('active','inactive','locked','provisioned'));
