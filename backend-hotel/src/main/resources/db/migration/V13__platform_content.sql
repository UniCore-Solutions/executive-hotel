-- V13: PLATFORM + CONTENT BLOCKS
-- Approved in docs/planning/CLIENT_PLATFORM_INDEX_DATA_ARCHITECTURE.md (rev 3).
-- platforms (identity only), platform_content_blocks (base) + 1:1 typed tables
-- (hero_blocks, featured_experiences_blocks + featured_experience_items),
-- hotels alters (platform_id nullable, slug NOT NULL UNIQUE with collision
-- backfill), media alters (platform_id as 6th typed owner, caption).

-- ====================================================================
-- platforms
-- ====================================================================

CREATE TABLE platforms (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name             VARCHAR(120) NOT NULL,
    slug             VARCHAR(120) NOT NULL UNIQUE,
    tagline          VARCHAR(255),
    description      TEXT,
    status           VARCHAR(20) NOT NULL DEFAULT 'active'
                     CONSTRAINT chk_platforms_status CHECK (status IN ('draft','active','inactive')),
    default_currency CHAR(3) REFERENCES currencies(code),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ====================================================================
-- hotels: platform association + public slug
-- ====================================================================

ALTER TABLE hotels
    ADD COLUMN platform_id BIGINT REFERENCES platforms(id) ON DELETE SET NULL;

CREATE INDEX idx_hotels_platform ON hotels (platform_id);

ALTER TABLE hotels
    ADD COLUMN slug VARCHAR(120);

-- Slug backfill (deterministic, collision suffix -2, -3, ...).
-- First occurrence keeps the base slug; later duplicates get a suffix.
WITH slugged AS (
    SELECT id,
           lower(btrim(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'), '-')) AS base
    FROM hotels
),
numbered AS (
    SELECT id, base,
           row_number() OVER (PARTITION BY base ORDER BY id) AS rn
    FROM slugged
)
UPDATE hotels h
SET slug = n.base || CASE WHEN n.rn = 1 THEN '' ELSE '-' || n.rn::text END
FROM numbered n
WHERE h.id = n.id;

ALTER TABLE hotels
    ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX uq_hotels_slug ON hotels (slug);

-- ====================================================================
-- media: platform owner + caption
-- ====================================================================

ALTER TABLE media
    ADD COLUMN platform_id BIGINT REFERENCES platforms(id) ON DELETE CASCADE,
    ADD COLUMN caption VARCHAR(255);

ALTER TABLE media
    DROP CONSTRAINT chk_media_single_owner;

ALTER TABLE media
    ADD CONSTRAINT chk_media_single_owner
        CHECK (num_nonnulls(hotel_id, room_type_id, experience_id,
                            restaurant_id, extra_id, platform_id) = 1);

CREATE UNIQUE INDEX uq_media_primary_platform ON media (platform_id)
    WHERE platform_id IS NOT NULL AND is_primary;

CREATE INDEX idx_media_platform ON media (platform_id);

-- ====================================================================
-- content blocks (base + 1:1 typed tables)
-- ====================================================================

CREATE TABLE platform_content_blocks (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    platform_id   BIGINT NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
    type          VARCHAR(30) NOT NULL
                  CONSTRAINT chk_content_blocks_type CHECK (type IN ('HERO','EXPERIENCES')),
    position      INTEGER NOT NULL,
    is_enabled    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_content_blocks_platform_position UNIQUE (platform_id, position)
);

CREATE INDEX idx_content_blocks_platform ON platform_content_blocks (platform_id);

CREATE TABLE hero_blocks (
    content_block_id      BIGINT PRIMARY KEY REFERENCES platform_content_blocks(id) ON DELETE CASCADE,
    eyebrow               VARCHAR(120),
    title                 VARCHAR(255) NOT NULL,
    subtitle              TEXT,
    image_media_id        BIGINT REFERENCES media(id) ON DELETE SET NULL,
    mobile_image_media_id BIGINT REFERENCES media(id) ON DELETE SET NULL,
    cta_label             VARCHAR(80),
    cta_target            VARCHAR(255)
);

CREATE TABLE featured_experiences_blocks (
    content_block_id BIGINT PRIMARY KEY REFERENCES platform_content_blocks(id) ON DELETE CASCADE,
    title            VARCHAR(255) NOT NULL
);

CREATE TABLE featured_experience_items (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    content_block_id BIGINT NOT NULL REFERENCES featured_experiences_blocks(content_block_id) ON DELETE CASCADE,
    experience_id    BIGINT NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
    position         INTEGER NOT NULL,
    CONSTRAINT uq_featured_experience_items_block UNIQUE (content_block_id, experience_id),
    CONSTRAINT uq_featured_experience_items_pos UNIQUE (content_block_id, position)
);

CREATE INDEX idx_featured_experience_items_block ON featured_experience_items (content_block_id);