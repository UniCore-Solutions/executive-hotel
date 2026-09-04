-- Genuinely missing Hotel Profile fields (task-driven redesign, see
-- docs/ADMIN_REBUILD_PROGRESS.md Epic E-REDESIGN workstream 3): a hotel has
-- no way to record its website, timezone, or the languages spoken there.
-- All nullable/optional — existing hotels are unaffected.
ALTER TABLE hotels
    ADD COLUMN website VARCHAR(255),
    ADD COLUMN timezone VARCHAR(64),
    ADD COLUMN languages TEXT[];
