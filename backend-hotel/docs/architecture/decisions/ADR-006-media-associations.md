# ADR-006: Media associations — typed FK columns instead of polymorphic (entity_type, entity_id)

- Status: proposed (pending approval)
- Date: 2026-08-18

## Context

The baseline uses `media(entity_type, entity_id)` — flexible, but with no referential integrity: orphan rows, impossible cross-checks (a "room_type" media row pointing at an extra's id), and no way to prevent cross-hotel attachment.

## Decision

One `media` table (file facts) with **typed nullable FK columns** — `hotel_id`, `room_type_id`, `experience_id`, `restaurant_id`, `extra_id` — and a CHECK that exactly one is non-null. Partial unique indexes enforce one `is_primary` per owner.

- Advantages: real FKs (no orphans, no cross-hotel attachment), type safety, one media store, indexed.
- Disadvantages: adding a new attachable entity requires a migration (new column + CHECK adjustment); less "flexible" than strings.
- The polymorphic alternative (kept documented) trades all integrity for zero schema churn — rejected because DB-level integrity is a stated project goal.

## Consequences

- `media` DDL changes vs baseline; `entity_type`/`entity_id` columns removed.
- Deleting an entity cascades its media rows; storage cleanup (Cloudinary) remains app-level async.