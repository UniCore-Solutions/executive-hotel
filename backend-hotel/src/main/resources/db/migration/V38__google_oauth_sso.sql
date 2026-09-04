-- V38: Google OAuth2/OIDC SSO — external identity linking, plus the
-- CSRF/replay state and post-callback login-grant tables the flow needs.
--
-- Account-linking policy (see docs/AUTHENTICATION.md for the full table):
--   - existing (provider, subject) match          -> log the user straight in
--   - new email, no local account                 -> create 'active' user (Google already verified the email)
--   - local 'provisioned' account, matching email  -> complete it (like registration does), no password set
--   - local 'pending_verification', matching email -> Google's verified email supersedes the pending OTP -> 'active'
--   - local 'active', matching email, Google email_verified=true  -> link (no password/profile change)
--   - local 'active', matching email, Google email_verified=false -> reject (defensive; Google always verifies)
--   - local 'locked'/'inactive'                    -> reject

CREATE TABLE user_external_identities (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id),
    provider            VARCHAR(20) NOT NULL
                        CONSTRAINT chk_user_external_identities_provider CHECK (provider IN ('GOOGLE')),
    provider_subject    VARCHAR(255) NOT NULL,
    provider_email      VARCHAR(255) NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The core anti-duplicate-account guarantee: one provider identity can only
-- ever be linked to one local user.
CREATE UNIQUE INDEX uq_user_external_identities_provider_subject
    ON user_external_identities (provider, provider_subject);
CREATE INDEX idx_user_external_identities_user_id ON user_external_identities (user_id);

-- CSRF/replay protection for the `state` parameter sent to the provider,
-- plus the OIDC nonce that guards against ID-token replay. DB-backed (not an
-- in-memory cache) for testability and to survive an app restart mid-flow —
-- same durability posture as otp_codes.
CREATE TABLE oauth_states (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state               VARCHAR(64) NOT NULL,
    provider            VARCHAR(20) NOT NULL
                        CONSTRAINT chk_oauth_states_provider CHECK (provider IN ('GOOGLE')),
    nonce               VARCHAR(64) NOT NULL,
    -- Internal guest-site path to return to after login. Nullable. Validated
    -- as a safe relative path before it is ever persisted — never a full URL.
    redirect_path       VARCHAR(500),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at          TIMESTAMPTZ NOT NULL,
    consumed_at         TIMESTAMPTZ
);
CREATE UNIQUE INDEX uq_oauth_states_state ON oauth_states (state);

-- One-time handoff from the backend's OAuth callback (which must redirect to
-- a FIXED backend URL registered with the provider) to the frontend's BFF
-- (which owns the httpOnly session cookie). A brand-new random value,
-- distinct from `state` — `state` already appeared in a browser-visible
-- redirect chain during the provider round trip and must not double as the
-- final session-minting secret.
CREATE TABLE login_grants (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grant_value         VARCHAR(64) NOT NULL,
    user_id             UUID NOT NULL REFERENCES users(id),
    redirect_path       VARCHAR(500),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at          TIMESTAMPTZ NOT NULL,
    consumed_at         TIMESTAMPTZ
);
CREATE UNIQUE INDEX uq_login_grants_grant_value ON login_grants (grant_value);
