-- Homepage featured flags for the guest frontend.
-- Customer-facing homepage sections (featured hotels, room types, experiences,
-- reviews) are curated in the database, not hardcoded in the frontend.
-- Existing rows default to FALSE and keep working: nothing is featured until
-- the operator/seed sets the flag.

ALTER TABLE hotels
    ADD COLUMN is_featured_on_homepage BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE room_types
    ADD COLUMN is_featured_on_homepage BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE experiences
    ADD COLUMN is_featured_on_homepage BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE reviews
    ADD COLUMN is_featured_on_homepage BOOLEAN NOT NULL DEFAULT FALSE;

-- Guest-facing sections are curated: a featured review must be approved so
-- pending/rejected content can never leak to the public homepage.
ALTER TABLE reviews
    ADD CONSTRAINT chk_reviews_featured_approved
    CHECK (NOT is_featured_on_homepage OR moderation_status = 'approved');