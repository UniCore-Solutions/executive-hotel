-- V18: ROOM-TYPE CAPACITY ENFORCEMENT
-- V12 enforces capacity when AVAILABILITY rows are written (sales cannot
-- exceed total_inventory), but it has a blind spot: total_inventory itself
-- could be reduced below the units already sold on some night. This trigger
-- closes that gap — a reduction below current sales is rejected atomically.

CREATE OR REPLACE FUNCTION enforce_room_type_inventory() RETURNS trigger AS $$
BEGIN
    IF NEW.total_inventory < COALESCE(
        (SELECT MAX(rooms_sold + out_of_order + blocked)
         FROM availability
         WHERE room_type_id = NEW.id),
        0) THEN
        RAISE EXCEPTION 'total_inventory cannot be lower than sold units for room_type %', NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_room_types_inventory
    BEFORE UPDATE OF total_inventory ON room_types
    FOR EACH ROW EXECUTE FUNCTION enforce_room_type_inventory();