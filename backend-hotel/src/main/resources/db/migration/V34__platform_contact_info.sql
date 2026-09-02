-- Platform-level contact info (brand identity display content), optional.
-- No admin write path exists yet for the Platform entity; this migration
-- only adds the columns, the write endpoint is added in the same change.
ALTER TABLE platforms
	ADD COLUMN contact_email VARCHAR(255),
	ADD COLUMN contact_phone VARCHAR(50);
