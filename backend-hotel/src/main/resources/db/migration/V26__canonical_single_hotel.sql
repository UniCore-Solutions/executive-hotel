-- ============================================================================
-- V26: CANONICAL SINGLE-HOTEL PLATFORM + PHYSICAL-ROOM INVENTORY
-- ----------------------------------------------------------------------------
-- 1. Exactly ONE active hotel (canonical platform). Non-canonical hotels and
--    their bookable/content rows are deactivated (the platform's own status
--    convention — hotels/room_types/rooms/experiences/restaurants/faqs/
--    extras/promotions all carry a `status` column). Historical rows keep
--    their referential integrity; nothing is orphaned or hard-deleted.
--    The canonical hotel is Azure Bay Resort (Lisbon) — the hotel the demo
--    platform content (V14) and the seed have always pointed at.
-- 2. Inventory is derived from PHYSICAL ROOMS: room_types.total_inventory
--    becomes the count of active physical rooms of that type, maintained by
--    a trigger on `rooms` (and recomputed on any direct room_types write).
--    Availability therefore equals physical rooms minus sold/out-of-order/
--    blocked units per night (sparse model, V12).
-- 3. Availability rows are reconciled against real reservations: rooms_sold
--    is recomputed from non-cancelled reservation_rooms lines (one unit per
--    line per night); fictional sold units with no reservation behind them
--    are removed. Empty rows are deleted (sparse model).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Deactivate non-canonical hotels and their dependent content
-- ---------------------------------------------------------------------------

UPDATE hotels SET status = 'inactive', is_featured_on_homepage = FALSE
WHERE status = 'active' AND id <> '00000000-0000-0000-0000-000000000001';

UPDATE room_types rt SET status = 'inactive', is_featured_on_homepage = FALSE
FROM hotels h WHERE rt.hotel_id = h.id AND h.status = 'inactive';

UPDATE rooms r SET status = 'inactive'
FROM hotels h WHERE r.hotel_id = h.id AND h.status = 'inactive';

UPDATE rate_plans rp SET status = 'inactive'
FROM hotels h WHERE rp.hotel_id = h.id AND h.status = 'inactive';

UPDATE promotions p SET status = 'inactive'
FROM hotels h WHERE p.hotel_id = h.id AND h.status = 'inactive';

UPDATE tax_fee_types t SET status = 'inactive'
FROM hotels h WHERE t.hotel_id = h.id AND h.status = 'inactive';

UPDATE extras e SET status = 'inactive'
FROM hotels h WHERE e.hotel_id = h.id AND h.status = 'inactive';

UPDATE experiences e SET status = 'inactive', is_featured_on_homepage = FALSE
FROM hotels h WHERE e.hotel_id = h.id AND h.status = 'inactive';

UPDATE restaurants r SET status = 'inactive'
FROM hotels h WHERE r.hotel_id = h.id AND h.status = 'inactive';

UPDATE faqs f SET status = 'inactive'
FROM hotels h WHERE f.hotel_id = h.id AND h.status = 'inactive';

-- ---------------------------------------------------------------------------
-- 2. Single-hotel platform identity: the platform brand stays, but its
--    marketing copy describes the one canonical property instead of a
--    multi-hotel collection.
-- ---------------------------------------------------------------------------

UPDATE platforms
SET tagline = 'A seaside retreat on Lisbon''s Marina.',
    description = 'Azure Bay Resort is a four-star seaside hotel on Lisbon''s Marina — sunlit rooms with sea views, a rooftop seafood restaurant and a saltwater pool.',
    updated_at = now()
WHERE slug = 'executive-hotel';

UPDATE hero_blocks hb
SET eyebrow = 'Lisbon · Marina',
    title = 'Azure Bay Resort',
    subtitle = 'A seaside retreat on Lisbon''s Marina — four-star rooms, a rooftop seafood restaurant and the Tagus on your doorstep.'
FROM platform_content_blocks cb
JOIN platforms p ON p.id = cb.platform_id
WHERE hb.content_block_id = cb.id
  AND p.slug = 'executive-hotel'
  AND cb.type = 'HERO';

-- ---------------------------------------------------------------------------
-- 3. Reconcile availability rows against real reservations
--    (sparse model: a night with no activity carries no row)
-- ---------------------------------------------------------------------------

UPDATE availability a
SET rooms_sold = COALESCE((
    SELECT count(*)
    FROM reservation_rooms rr
    JOIN reservations r ON r.id = rr.reservation_id
    WHERE rr.room_type_id = a.room_type_id
      AND rr.status = 'active'
      AND r.status <> 'cancelled'
      AND a.stay_date >= rr.check_in_date
      AND a.stay_date < rr.check_out_date
), 0);

DELETE FROM availability
WHERE rooms_sold = 0 AND out_of_order = 0 AND blocked = 0;

-- ---------------------------------------------------------------------------
-- 4. Defensive cleanup + inventory backfill: a room type's capacity is the
--    count of its active physical rooms. Nights whose activity exceeds the
--    physical count cannot exist once inventory is derived (the reconciled
--    sold units from step 3 are real; anything still over capacity is
--    legacy/fictional data with no reservation behind it).
-- ---------------------------------------------------------------------------

DELETE FROM availability a
WHERE a.rooms_sold + a.out_of_order + a.blocked > (
    SELECT count(*) FROM rooms r
    WHERE r.room_type_id = a.room_type_id AND r.status = 'active');

UPDATE room_types rt
SET total_inventory = (SELECT count(*) FROM rooms r
                      WHERE r.room_type_id = rt.id AND r.status = 'active');

-- ---------------------------------------------------------------------------
-- 5. Trigger: total_inventory is ALWAYS the active physical room count.
--    - rooms DML (insert/status change/delete) recomputes the room type's
--      inventory (AFTER).
--    - any direct room_types write of total_inventory is overridden with the
--      derived count (BEFORE), and the V18 capacity guard (cannot go below
--      sold/out-of-order/blocked units) is enforced on the derived value.
--    V18's own trigger is dropped because its guard must run AFTER the
--    derived value is set — with both firing BEFORE on total_inventory,
--    name order would run the guard on the caller's raw value first.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION sync_room_type_inventory() RETURNS trigger AS $$
DECLARE
    affected_room_type uuid;
BEGIN
    IF TG_OP = 'DELETE' THEN
        affected_room_type := OLD.room_type_id;
    ELSE
        affected_room_type := NEW.room_type_id;
    END IF;

    UPDATE room_types rt
    SET total_inventory = (SELECT count(*) FROM rooms r
                           WHERE r.room_type_id = rt.id AND r.status = 'active'),
        updated_at = now()
    WHERE rt.id = affected_room_type;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION enforce_room_type_inventory_derived() RETURNS trigger AS $$
DECLARE
    active_room_count integer;
BEGIN
    -- Authoritative: inventory is managed through physical rooms, never
    -- through a hand-set number on the room type itself.
    SELECT count(*) INTO active_room_count
    FROM rooms r WHERE r.room_type_id = NEW.id AND r.status = 'active';

    IF active_room_count < COALESCE(
        (SELECT MAX(rooms_sold + out_of_order + blocked)
         FROM availability WHERE room_type_id = NEW.id), 0) THEN
        RAISE EXCEPTION 'total_inventory cannot be lower than sold units for room_type %', NEW.id;
    END IF;

    NEW.total_inventory := active_room_count;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_room_types_inventory_sync ON rooms;
CREATE TRIGGER trg_room_types_inventory_sync
    AFTER INSERT OR UPDATE OF room_type_id, status OR DELETE ON rooms
    FOR EACH ROW EXECUTE FUNCTION sync_room_type_inventory();

DROP TRIGGER IF EXISTS trg_room_types_inventory_derived ON room_types;
CREATE TRIGGER trg_room_types_inventory_derived
    BEFORE INSERT OR UPDATE OF total_inventory ON room_types
    FOR EACH ROW EXECUTE FUNCTION enforce_room_type_inventory_derived();

-- V18's guard is now enforced inside enforce_room_type_inventory_derived
-- (it must run AFTER the derived value is set, so a standalone BEFORE
-- trigger on total_inventory can no longer do the job).
DROP TRIGGER IF EXISTS trg_room_types_inventory ON room_types;
