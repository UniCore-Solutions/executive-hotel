-- V2: IDENTITY / RBAC
-- Source: database/collection-schema-postgresql.sql (approved schema, section 2).
-- user_roles.hotel_id FK is added in V3 (hotels is created there).

-- ====================================================================
-- 2. IDENTITY / RBAC
-- ====================================================================

CREATE TABLE users (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email           VARCHAR(150) NOT NULL,        -- stored normalized lowercase; uniqueness on lower(email)
    password_hash   VARCHAR(255) NOT NULL,        -- BCrypt / Argon2id output
    first_name      VARCHAR(100),
    last_name       VARCHAR(100),
    phone           VARCHAR(30),
    status          VARCHAR(20) NOT NULL DEFAULT 'active'
                    CONSTRAINT chk_users_status CHECK (status IN ('active','inactive','locked')),
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_users_email_lower ON users (lower(email));

CREATE TABLE roles (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name            VARCHAR(50) NOT NULL UNIQUE
    -- super_admin, hotel_admin, revenue_manager, reservation_agent,
    -- reception_staff, content_manager, finance_staff
);

CREATE TABLE permissions (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code            VARCHAR(80) NOT NULL UNIQUE,  -- e.g. 'reservations.cancel'
    description     VARCHAR(255)
);

CREATE TABLE role_permissions (
    role_id         BIGINT NOT NULL REFERENCES roles(id),
    permission_id   BIGINT NOT NULL REFERENCES permissions(id),
    CONSTRAINT pk_role_permissions PRIMARY KEY (role_id, permission_id)
);

-- hotel_id NULL = platform-level role (applies to every hotel).
-- FK to hotels added after the hotels table (see section 3).
-- Role-assignment semantics (who may grant which scope) are enforced by
-- the Spring Security / application layer, not by the database.
CREATE TABLE user_roles (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id),
    role_id         BIGINT NOT NULL REFERENCES roles(id),
    hotel_id        BIGINT,
    CONSTRAINT uq_user_roles UNIQUE (user_id, role_id, hotel_id)
);

-- Prevent duplicate platform-level roles (NULLs are distinct in UNIQUE).
CREATE UNIQUE INDEX uq_user_roles_platform ON user_roles (user_id, role_id) WHERE hotel_id IS NULL;
CREATE INDEX idx_user_roles_hotel ON user_roles (hotel_id);
