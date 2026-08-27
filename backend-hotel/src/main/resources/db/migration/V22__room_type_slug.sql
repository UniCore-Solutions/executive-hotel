-- V22: add slug column to room_types for slug-based lookups from legacy URLs

ALTER TABLE room_types ADD COLUMN slug VARCHAR(255);

-- Populate slug from name: lowercase, replace spaces/special chars with hyphens, collapse hyphens
UPDATE room_types
SET slug = lower(regexp_replace(
    regexp_replace(name, '[^a-zA-Z0-9\s-]', '', 'g'),
    '\s+', '-', 'g'
));

-- For duplicate slugs within the same hotel, append a numeric suffix
WITH numbered AS (
    SELECT id, hotel_id, slug,
           ROW_NUMBER() OVER (PARTITION BY hotel_id, slug ORDER BY created_at) AS rn
    FROM room_types
)
UPDATE room_types rt
SET slug = rt.slug || '-' || (n.rn)
FROM numbered n
WHERE rt.id = n.id AND n.rn > 1;

ALTER TABLE room_types ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX uq_room_types_hotel_slug ON room_types (hotel_id, slug);
CREATE INDEX idx_room_types_slug ON room_types (slug);
