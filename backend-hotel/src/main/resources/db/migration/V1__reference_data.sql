-- V1: PLATFORM / REFERENCE DATA
-- Source: database/collection-schema-postgresql.sql (approved schema, section 1).

-- ====================================================================
-- 1. PLATFORM / REFERENCE DATA
-- ====================================================================

CREATE TABLE countries (
    code            CHAR(2) PRIMARY KEY,          -- ISO 3166-1 alpha-2
    name            VARCHAR(100) NOT NULL
);

CREATE TABLE currencies (
    code            CHAR(3) PRIMARY KEY,          -- ISO 4217
    name            VARCHAR(50) NOT NULL,
    decimal_places  SMALLINT NOT NULL DEFAULT 2
                    CONSTRAINT chk_currencies_decimal_places CHECK (decimal_places BETWEEN 0 AND 6)
);

CREATE TABLE languages (
    code            VARCHAR(5) PRIMARY KEY,       -- e.g. 'en', 'fr', 'ar'
    name            VARCHAR(50) NOT NULL,
    is_rtl          BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE cancellation_reasons (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code            VARCHAR(30) NOT NULL UNIQUE,  -- 'guest_changed_plans', 'found_cheaper', ...
    label           VARCHAR(150) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'active'
                    CONSTRAINT chk_cancellation_reasons_status CHECK (status IN ('active','inactive'))
);
