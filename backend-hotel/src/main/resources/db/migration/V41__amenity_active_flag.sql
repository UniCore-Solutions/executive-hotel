-- Amenities gain a real active/inactive lifecycle (task-driven redesign, see
-- docs/ADMIN_REBUILD_PROGRESS.md Epic E-REDESIGN workstream 6) — previously
-- an admin could only pick from a fixed catalog, never manage it. Default
-- true so every existing seeded amenity stays assignable.
ALTER TABLE amenities
    ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
