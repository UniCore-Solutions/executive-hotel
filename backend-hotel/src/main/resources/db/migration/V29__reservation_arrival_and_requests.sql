-- V29: reservation arrival slot + special requests.
--
-- The guest form has always collected an arrival time and free-text special
-- requests, but no API field existed, so the values were silently dropped.
-- Additive columns on reservations only; no existing data is touched.

ALTER TABLE reservations ADD COLUMN arrival_slot VARCHAR(32);
ALTER TABLE reservations ADD COLUMN special_requests TEXT;
