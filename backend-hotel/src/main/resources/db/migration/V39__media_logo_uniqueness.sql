-- One logo per hotel / platform owner. Mirrors the existing per-owner
-- primary-image partial unique indexes (V3, V13) — same pattern, scoped to
-- category='logo' instead of is_primary. Application-level replacement
-- semantics (delete-old-then-insert-new on upload) already make this the
-- normal path; this index is the concurrent-upload backstop.
CREATE UNIQUE INDEX uq_media_logo_hotel ON media (hotel_id)
    WHERE hotel_id IS NOT NULL AND category = 'logo';

CREATE UNIQUE INDEX uq_media_logo_platform ON media (platform_id)
    WHERE platform_id IS NOT NULL AND category = 'logo';
