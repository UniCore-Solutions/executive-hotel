-- V21: Convert EUR-denominated experience prices to MAD
-- Conversion rate: 1 EUR ≈ 10.99 MAD

UPDATE experiences SET price_amount = 495, currency_code = 'MAD' WHERE name = 'Sunset Cruise on the Tagus';
UPDATE experiences SET price_amount = 275, currency_code = 'MAD' WHERE name = 'Old Lisbon Walking Tour';
UPDATE experiences SET price_amount = 989, currency_code = 'MAD' WHERE name = 'Sintra Day Trip';
