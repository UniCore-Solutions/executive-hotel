-- V32: drop the 'EH' row from the countries reference list.
--
-- V24 generated the list mechanically from libphonenumber-js
-- getCountries(), which includes EH. This collection does not offer it as a
-- selectable country, so it must not appear in the guest country/phone
-- pickers, the hotel address form or invoice billing addresses — all three
-- read this table (FKs: hotels.country_code, guests.country_code,
-- invoices.billing_country_code).
--
-- No rows referenced EH when this migration was written; if any environment
-- has one, the FKs will block the DELETE rather than orphan the reference,
-- and that data must be reassigned before this migration can run.

DELETE FROM countries WHERE code = 'EH';
