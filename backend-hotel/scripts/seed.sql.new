-- ============================================================================
-- DEV SEED — rich demo dataset (UUID edition)
-- Rewritten for the post-V20 schema: primary/foreign keys are UUID columns.
-- Deterministic mapping: integer n -> '00000000-0000-0000-0000-<n zero-padded>'.
-- Reference data (roles V10, amenities V11, countries/currencies V1) comes from
-- migrations and is joined BY NAME / NATURAL KEY, never by generated id.
-- No reservations/payments are seeded — bookings are made live through the API.
-- ============================================================================

BEGIN;


-- ---------------------------------------------------------------------------
-- reference extras
-- ---------------------------------------------------------------------------

INSERT INTO countries (code, name) VALUES
    ('PT', 'Portugal'),
    ('IT', 'Italy')
ON CONFLICT (code) DO NOTHING;


INSERT INTO languages (code, name, is_rtl) VALUES
    ('en', 'English', FALSE),
    ('fr', 'French', FALSE),
    ('ar', 'Arabic', TRUE),
    ('pt', 'Portuguese', FALSE),
    ('it', 'Italian', FALSE),
    ('nl', 'Dutch', FALSE)
ON CONFLICT (code) DO NOTHING;


-- ---------------------------------------------------------------------------
-- users (password for all: admin123)
-- ---------------------------------------------------------------------------

INSERT INTO users (id, email, password_hash, first_name, last_name, status) VALUES
    ('00000000-0000-0000-0000-000000000001','admin@hotelcollection.test','$2b$12$fz4jS6wgF.xPDu9cJiQuTOZRtGW9.si0XMtFJVSwTZCk9rJTHaVq.','System','Administrator','active'),
    ('00000000-0000-0000-0000-000000000002','manager@hotelcollection.test','$2b$12$fz4jS6wgF.xPDu9cJiQuTOZRtGW9.si0XMtFJVSwTZCk9rJTHaVq.','Marta','Costa','active'),
    ('00000000-0000-0000-0000-000000000003','content@hotelcollection.test','$2b$12$fz4jS6wgF.xPDu9cJiQuTOZRtGW9.si0XMtFJVSwTZCk9rJTHaVq.','Youssef','Benali','active'),
    ('00000000-0000-0000-0000-000000000004','manager.riad@hotelcollection.test','$2b$12$fz4jS6wgF.xPDu9cJiQuTOZRtGW9.si0XMtFJVSwTZCk9rJTHaVq.','Fatima','El Idrissi','active'),
    ('00000000-0000-0000-0000-000000000005','manager.rome@hotelcollection.test','$2b$12$fz4jS6wgF.xPDu9cJiQuTOZRtGW9.si0XMtFJVSwTZCk9rJTHaVq.','Luca','Rossi','active');


INSERT INTO user_roles (id,user_id,role_id,hotel_id)
SELECT gen_random_uuid(), u.id, r.id, NULL
FROM users u, roles r
WHERE u.id = '00000000-0000-0000-0000-000000000001' AND r.name = 'super_admin';


INSERT INTO user_roles (id,user_id,role_id,hotel_id)
SELECT gen_random_uuid(), u.id, r.id, h.id
FROM users u, roles r, hotels h
WHERE u.id = '00000000-0000-0000-0000-000000000002' AND r.name = 'hotel_admin' AND h.id = '00000000-0000-0000-0000-000000000001';


INSERT INTO user_roles (id,user_id,role_id,hotel_id)
SELECT gen_random_uuid(), u.id, r.id, h.id
FROM users u, roles r, hotels h
WHERE u.id = '00000000-0000-0000-0000-000000000003' AND r.name = 'content_manager' AND h.id = '00000000-0000-0000-0000-000000000001';


INSERT INTO user_roles (id,user_id,role_id,hotel_id)
SELECT gen_random_uuid(), u.id, r.id, h.id
FROM users u, roles r, hotels h
WHERE u.id = '00000000-0000-0000-0000-000000000004' AND r.name = 'hotel_admin' AND h.id = '00000000-0000-0000-0000-000000000002';


INSERT INTO user_roles (id,user_id,role_id,hotel_id)
SELECT gen_random_uuid(), u.id, r.id, h.id
FROM users u, roles r, hotels h
WHERE u.id = '00000000-0000-0000-0000-000000000005' AND r.name = 'hotel_admin' AND h.id = '00000000-0000-0000-0000-000000000003';


-- ---------------------------------------------------------------------------
-- platform
-- ---------------------------------------------------------------------------

INSERT INTO platforms (id, name, slug, tagline, description, status, default_currency) VALUES ('00000000-0000-0000-0000-000000000001','The Hotel Collection','the-hotel-collection','A curated collection of boutique stays.','The Hotel Collection brings together distinctive hotels, each with its own character, service and sense of place.','active',NULL);


-- ---------------------------------------------------------------------------
-- hotels
-- ---------------------------------------------------------------------------

INSERT INTO hotels (id, name, brand, description, long_description, hotel_type,
                    address_line1, address_line2, city, country_code, latitude, longitude,
                    phone, email, star_rating, check_in_time, check_out_time,
                    default_currency, config, status, platform_id, slug, is_featured_on_homepage) VALUES
    ('00000000-0000-0000-0000-000000000001','Azure Bay Resort','The Hotel Collection','A seaside retreat on Lisbon''s Marina','Azure Bay Resort sits on the edge of Lisbon''s Marina, minutes from the historic waterfront. Sunlit rooms with sea views, a rooftop seafood restaurant and a saltwater pool make it a calm base for exploring the city.','resort','Avenida da Marina 42','Doca de Alcântara','Lisbon','PT',38.7050,-9.1785,'+351 21 000 0101','hello@azurebay.example',4,'15:00','12:00','EUR','{}','active','00000000-0000-0000-0000-000000000001','azure-bay-resort',TRUE),
    ('00000000-0000-0000-0000-000000000002','Dar Zellij','The Hotel Collection','An intimate riad in the heart of the Marrakech medina','Dar Zellij is a traditional riad tucked inside the old city walls, where carved cedar, zellige tilework and a candlelit courtyard set the tone. Hammam, rooftop dinners and the Atlas Mountains on the horizon.','riad','Derb Sidi Bouloukat 17','Médina','Marrakech','MA',31.6287,-7.9940,'+212 524 00 0202','stay@darzellij.example',5,'14:00','12:00','MAD','{}','active','00000000-0000-0000-0000-000000000001','dar-zellij',TRUE),
    ('00000000-0000-0000-0000-000000000003','Villa Aurelia','The Hotel Collection','A Roman villa hotel on the Pincian Hill','Villa Aurelia pairs a 19th-century palazzo with modern suites, a garden terrace above the Spanish Steps and staff who remember your name. Steps from the Borghese Gardens, minutes from the heart of Rome.','boutique','Via Aurelia Antica 7','Trastevere','Rome','IT',41.8903,12.4612,'+39 06 000 0303','stay@villa-aurelia.example',5,'15:00','11:00','EUR','{}','active','00000000-0000-0000-0000-000000000001','villa-aurelia',TRUE);


-- ---------------------------------------------------------------------------
-- room types
-- ---------------------------------------------------------------------------

INSERT INTO room_types (id, hotel_id, name, description, long_description, max_adults, max_children,
                        bed_configuration, size_sqm, view_type, status, total_inventory, is_featured_on_homepage) VALUES
    ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Deluxe Sea View','King room overlooking the marina','A bright king room with floor-to-ceiling windows over the Tagus, a work desk and a marble bathroom with walk-in rain shower.',2,1,'1 King bed',28.00,'Sea view','active',10,TRUE),
    ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','Family Suite','Two-bedroom suite with lounge and sea-view terrace','Two bedrooms with a shared lounge, small kitchenette and a terrace with direct marina views; sleeps four comfortably.',4,2,'1 King + 2 Single beds',55.00,'Sea view','active',6,TRUE),
    ('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','Garden Twin','Cosy twin overlooking the pool garden','A quiet twin room on the garden side with two single beds, tea-making corner and views of the pool deck.',2,1,'2 Single beds',24.00,'Garden view','active',8,FALSE),
    ('00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000002','Courtyard Double','Traditional double around the central patio','A double room opening onto the riad''s candlelit courtyard, with carved plaster, tadelakt walls and a private roof terrace.',2,0,'1 Queen bed',32.00,'Courtyard','active',8,FALSE),
    ('00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000002','Atlas Mountain View','King room with balconies over the rooftops','A king room whose twin balconies frame the Atlas Mountains, with a freestanding bathtub and a fireplace in winter.',2,1,'1 King bed',38.00,'Mountain view','active',6,TRUE),
    ('00000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000002','Family Riad Suite','Two-floor suite with rooftop terrace and plunge pool','The riad''s showpiece: two floors, a private lounge, a rooftop terrace with a small plunge pool and views to the Koutoubia.',4,2,'1 King + 2 Single beds',70.00,'Terrace','active',4,TRUE),
    ('00000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000003','Classic Room','Elegant queen room in the original palazzo','A classic room with restored frescoes, high ceilings and a marble bathroom; quiet, dark and beautifully proportioned.',2,0,'1 Queen bed',22.00,'City view','active',12,TRUE),
    ('00000000-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000003','Panorama Superior','King room with balconies over the Pincio','A king room on the top floor with two small balconies overlooking the city, a writing desk and a walk-in wardrobe.',2,1,'1 King bed',30.00,'City panorama','active',8,FALSE),
    ('00000000-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000003','Imperial Suite','Palazzo suite with lounge, dining corner and dressing room','The Imperial Suite spans the original grand salon: a separate lounge, dining corner, dressing room and views toward the Pincian Hill.',3,1,'1 King bed + lounge',64.00,'Pincio view','active',4,TRUE);


-- physical rooms (a few per type so the rooms workspace is usable)
INSERT INTO rooms (id, hotel_id, room_type_id, room_number, floor, status, housekeeping_status, maintenance_status) VALUES
    ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','101','1','active','clean','ok'),
    ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','102','1','active','clean','ok'),
    ('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','103','1','active','dirty','ok'),
    ('00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','201','2','active','clean','ok'),
    ('00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','202','2','active','clean','ok'),
    ('00000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','301','3','active','clean','ok'),
    ('00000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000004','R1','1','active','clean','ok'),
    ('00000000-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000004','R2','1','active','clean','ok'),
    ('00000000-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000005','A1','2','active','clean','ok'),
    ('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000006','S1','3','active','clean','ok'),
    ('00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000007','101','1','active','clean','ok'),
    ('00000000-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000008','201','2','active','clean','ok'),
    ('00000000-0000-0000-0000-000000000013','00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000009','301','3','active','clean','ok');


-- hotel amenities (catalog ids resolved by name)
INSERT INTO hotel_amenities (hotel_id, amenity_id)
SELECT h.id, a.id
FROM hotels h
JOIN amenities a ON a.name IN
    ('Wi-Fi','Parking','Airport Shuttle','24-hour Front Desk','Concierge','Luggage Storage',
     'Laundry Service','Room Service','Restaurant','Bar','Gym','Spa','Swimming Pool',
     'Business Center','Air Conditioning','Minibar','Safe','Balcony','Sea View',
     'Flat-screen TV','Coffee Machine','Bathrobe & Slippers')
WHERE h.id = '00000000-0000-0000-0000-000000000001';


INSERT INTO hotel_amenities (hotel_id, amenity_id)
SELECT h.id, a.id
FROM hotels h
JOIN amenities a ON a.name IN
    ('Wi-Fi','Parking','24-hour Front Desk','Concierge','Luggage Storage','Restaurant','Bar',
     'Spa','Swimming Pool','Sauna','Hammam','Air Conditioning','Heating','Minibar','Safe',
     'Flat-screen TV','Coffee Machine','Bathrobe & Slippers')
WHERE h.id = '00000000-0000-0000-0000-000000000002';


INSERT INTO hotel_amenities (hotel_id, amenity_id)
SELECT h.id, a.id
FROM hotels h
JOIN amenities a ON a.name IN
    ('Wi-Fi','Concierge','Room Service','Restaurant','Bar','Gym','Meeting Rooms',
     'Business Center','Air Conditioning','Heating','Minibar','Safe','City View',
     'Flat-screen TV','Coffee Machine','Bathrobe & Slippers')
WHERE h.id = '00000000-0000-0000-0000-000000000003';


INSERT INTO room_type_amenities (room_type_id, amenity_id)
SELECT rt.id, a.id
FROM room_types rt
JOIN amenities a ON a.name IN ('Air Conditioning','Sea View','Balcony','Minibar','Safe','Flat-screen TV','Coffee Machine','Bathrobe & Slippers')
WHERE rt.id IN ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002');


INSERT INTO room_type_amenities (room_type_id, amenity_id)
SELECT rt.id, a.id
FROM room_types rt
JOIN amenities a ON a.name IN ('Air Conditioning','Heating','Minibar','Safe','Flat-screen TV')
WHERE rt.id = '00000000-0000-0000-0000-000000000003';


INSERT INTO room_type_amenities (room_type_id, amenity_id)
SELECT rt.id, a.id
FROM room_types rt
JOIN amenities a ON a.name IN ('Air Conditioning','Heating','Safe','Flat-screen TV','Coffee Machine')
WHERE rt.id IN ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000007');


INSERT INTO room_type_amenities (room_type_id, amenity_id)
SELECT rt.id, a.id
FROM room_types rt
JOIN amenities a ON a.name IN ('Air Conditioning','Balcony','Safe','Flat-screen TV','Coffee Machine','Minibar')
WHERE rt.id IN ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000008');


INSERT INTO room_type_amenities (room_type_id, amenity_id)
SELECT rt.id, a.id
FROM room_types rt
JOIN amenities a ON a.name IN ('Air Conditioning','Balcony','Minibar','Safe','Flat-screen TV','Coffee Machine','Bathrobe & Slippers')
WHERE rt.id IN ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000009');


-- ---------------------------------------------------------------------------
-- rate plans + prices
-- ---------------------------------------------------------------------------

INSERT INTO rate_plans (id, hotel_id, name, code, currency_code, meal_plan, cancellation_policy,
                        payment_policy, is_refundable, cancellation_deadline_days,
                        cancellation_penalty_type, cancellation_penalty_value,
                        payment_timing, deposit_percentage, min_stay, max_stay, occupancy_rules, status) VALUES
    ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Bed & Breakfast Flex','BB_FLEX','EUR','breakfast','Free cancellation up to 2 days before arrival; after that the first night is charged.','Pay at the property',TRUE,2,'first_night',NULL,'pay_at_property',NULL,1,NULL,'Maximum 2 adults + 1 child per Deluxe Sea View room','active'),
    ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','Non-Refundable Saver','SAVER','EUR',NULL,'Non-refundable; full stay charged on cancellation.','Full prepayment at booking',FALSE,NULL,'full_stay',NULL,'prepay_full',NULL,NULL,NULL,NULL,'active'),
    ('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000002','Courtyard & Breakfast','COURTYARD','MAD','breakfast','Free cancellation up to 3 days before arrival; after that one night is charged.','Pay at the property',TRUE,3,'first_night',NULL,'pay_at_property',NULL,1,NULL,'Maximum 2 adults','active'),
    ('00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000002','Riad Half Board','HALF_BOARD','MAD','half_board','Free cancellation up to 5 days before arrival; after that 30% of the stay is charged.','30% deposit at booking',TRUE,5,'percentage',30.00,'prepay_deposit',30.00,2,NULL,NULL,'active'),
    ('00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000003','Palazzo Classic','CLASSIC','EUR','breakfast','Free cancellation up to 1 day before arrival; after that the first night is charged.','Pay at the property',TRUE,1,'first_night',NULL,'pay_at_property',NULL,NULL,NULL,'Maximum 2 adults','active'),
    ('00000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000003','Non-Refundable Roma','ROMA_SAVER','EUR',NULL,'Non-refundable; full stay charged on cancellation.','Full prepayment at booking',FALSE,NULL,'full_stay',NULL,'prepay_full',NULL,NULL,NULL,NULL,'active');


INSERT INTO room_type_rate_plans (id, hotel_id, room_type_id, rate_plan_id, currency_code) VALUES
    ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','EUR'), ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','EUR'),
    ('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','EUR'), ('00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002','EUR'),
    ('00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','EUR'), ('00000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000002','EUR'),
    ('00000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000003','MAD'), ('00000000-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000004','MAD'),
    ('00000000-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000003','MAD'), ('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000004','MAD'),
    ('00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000003','MAD'), ('00000000-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000004','MAD'),
    ('00000000-0000-0000-0000-000000000013','00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000005','EUR'), ('00000000-0000-0000-0000-000000000014','00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000006','EUR'),
    ('00000000-0000-0000-0000-000000000015','00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000005','EUR'), ('00000000-0000-0000-0000-000000000016','00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000006','EUR'),
    ('00000000-0000-0000-0000-000000000017','00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000005','EUR'), ('00000000-0000-0000-0000-000000000018','00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000006','EUR');


INSERT INTO rate_plan_prices (id, room_type_rate_plan_id, currency_code, valid_from, valid_to, price_amount) VALUES
    ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','EUR','2026-01-01','2027-12-31',189.00),
    ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002','EUR','2026-01-01','2027-12-31',165.00),
    ('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000003','EUR','2026-01-01','2027-12-31',240.00),
    ('00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000004','EUR','2026-01-01','2027-12-31',210.00),
    ('00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000005','EUR','2026-01-01','2027-12-31',150.00),
    ('00000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000006','EUR','2026-01-01','2027-12-31',128.00),
    ('00000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000007','MAD','2026-01-01','2027-12-31',1200.00),
    ('00000000-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000008','MAD','2026-01-01','2027-12-31',980.00),
    ('00000000-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000009','MAD','2026-01-01','2027-12-31',1500.00),
    ('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000010','MAD','2026-01-01','2027-12-31',1250.00),
    ('00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000011','MAD','2026-01-01','2027-12-31',2200.00),
    ('00000000-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000012','MAD','2026-01-01','2027-12-31',1850.00),
    ('00000000-0000-0000-0000-000000000013','00000000-0000-0000-0000-000000000013','EUR','2026-01-01','2027-12-31',95.00),
    ('00000000-0000-0000-0000-000000000014','00000000-0000-0000-0000-000000000014','EUR','2026-01-01','2027-12-31',79.00),
    ('00000000-0000-0000-0000-000000000015','00000000-0000-0000-0000-000000000015','EUR','2026-01-01','2027-12-31',145.00),
    ('00000000-0000-0000-0000-000000000016','00000000-0000-0000-0000-000000000016','EUR','2026-01-01','2027-12-31',120.00),
    ('00000000-0000-0000-0000-000000000017','00000000-0000-0000-0000-000000000017','EUR','2026-01-01','2027-12-31',260.00),
    ('00000000-0000-0000-0000-000000000018','00000000-0000-0000-0000-000000000018','EUR','2026-01-01','2027-12-31',225.00);


-- ---------------------------------------------------------------------------
-- promotions
-- ---------------------------------------------------------------------------

INSERT INTO promotions (id, hotel_id, code, name, description, discount_type, discount_value,
                         booking_window_start, booking_window_end, stay_window_start, stay_window_end,
                         min_nights, max_usage_total, max_usage_per_guest, stackable,
                         applies_to_all_room_types, applies_to_all_rate_plans, applicable_days_of_week, status) VALUES
    ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','SPRING25','Spring Escape 15%','15% off stays of 2+ nights booked before the end of the year.','percentage',15.00,'2026-08-01','2026-12-31','2026-09-01','2026-11-30',2,NULL,1,FALSE,TRUE,TRUE,NULL,'active'),
    ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002','MADINA15','Riad Winter 15%','15% off 2+ night stays at Dar Zellij through the season.','percentage',15.00,'2026-08-01','2026-12-31','2026-09-01','2026-12-20',2,NULL,1,FALSE,TRUE,TRUE,NULL,'active'),
    ('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000003','SUMMER10','Roman Summer 10%','10% off Rome stays of 2+ nights in September and October.','percentage',10.00,'2026-08-01','2026-10-15','2026-09-01','2026-10-31',2,NULL,1,FALSE,TRUE,TRUE,NULL,'active');


-- ---------------------------------------------------------------------------
-- taxes & fees
-- ---------------------------------------------------------------------------

INSERT INTO tax_fee_types (id, hotel_id, name, charge_type, calculation_method, value, currency_code, status) VALUES
    ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','City tax','tax','percentage',5.00,NULL,'active'),
    ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','VAT','tax','percentage',12.00,NULL,'active'),
    ('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000002','City tax','tax','percentage',8.00,NULL,'active'),
    ('00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000002','VAT','tax','percentage',10.00,NULL,'active'),
    ('00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000003','City tax','tax','percentage',5.00,NULL,'active'),
    ('00000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000003','VAT','tax','percentage',12.00,NULL,'active');


-- ---------------------------------------------------------------------------
-- extras
-- ---------------------------------------------------------------------------

INSERT INTO extras (id, hotel_id, name, description, pricing_model, price_amount, currency_code, status) VALUES
    ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Breakfast Buffet','Daily buffet on the rooftop with views over the marina.','per_person',15.00,'EUR','active'),
    ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','Airport Transfer','Private transfer from Lisbon airport, one way.','per_stay',45.00,'EUR','active'),
    ('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','Spa Access','Access to the spa and saltwater pool for the whole stay.','per_stay',30.00,'EUR','active'),
    ('00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','Late Check-out','Keep the room until 16:00 on departure day.','per_room',25.00,'EUR','active'),
    ('00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000002','Hammam & Massage','Traditional hammam ritual with a 45-minute massage.','per_person',350.00,'MAD','active'),
    ('00000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000002','Airport Transfer','Private transfer from Marrakech airport, one way.','per_stay',300.00,'MAD','active'),
    ('00000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000002','Rooftop Dinner','Three-course dinner on the rooftop under the stars.','per_person',450.00,'MAD','active'),
    ('00000000-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000002','Cooking Class','Hands-on tagine class with the riad''s chef.','per_person',500.00,'MAD','active'),
    ('00000000-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000003','Breakfast at the Terrace','Buffet breakfast on the garden terrace.','per_person',18.00,'EUR','active'),
    ('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000003','Private Car to City','Chauffeured car to the city centre, one way.','per_stay',35.00,'EUR','active'),
    ('00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000003','Villa Wine Cellar','Guided tasting in the 19th-century cellar.','per_stay',60.00,'EUR','active'),
    ('00000000-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000003','Late Check-out','Keep the room until 15:00 on departure day.','per_room',20.00,'EUR','active');


-- ---------------------------------------------------------------------------
-- experiences
-- ---------------------------------------------------------------------------

INSERT INTO experiences (id, hotel_id, name, description, category, duration_minutes, price_amount,
                         currency_code, location, status, sort_order, is_featured_on_homepage) VALUES
    ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Sunset Cruise on the Tagus','Sail the Tagus at golden hour past the Belém Tower and the 25 de Abril bridge, with a glass of local wine on deck.','water',180,45.00,'EUR','Tagus River','active',1,TRUE),
    ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','Old Lisbon Walking Tour','A guided walk through Alfama and Baixa: cobbled lanes, fado houses and the city''s best pastel de nata.','culture',120,25.00,'EUR','Alfama, Lisbon','active',2,FALSE),
    ('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','Sintra Day Trip','A full day at Sintra''s Pena Palace and Quinta da Regaleira, with hotel pickup and a driver-guide.','day-trip',420,90.00,'EUR','Sintra','active',3,TRUE),
    ('00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000002','Atlas Mountains Day Trip','Berber villages, waterfalls and lunch in the mountains, with hotel pickup at dawn.','day-trip',480,950.00,'MAD','High Atlas','active',1,TRUE),
    ('00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000002','Marrakech Medina & Souks Tour','A private stroll through the souks: spice stalls, tanneries and a stop for mint tea.','culture',150,250.00,'MAD','Médina, Marrakech','active',2,FALSE),
    ('00000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000002','Sunrise Hot Air Balloon','Float over the Palmeraie at sunrise, with a champagne breakfast on landing.','adventure',240,1800.00,'MAD','Palmeraie','active',3,TRUE),
    ('00000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000003','Colosseum by Night Tour','Skip-the-line access to the Colosseum and Forum after dark, with an archaeologist guide.','culture',150,68.00,'EUR','Colosseum, Rome','active',1,TRUE),
    ('00000000-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000003','Trastevere Food Tour','Evening crawl of trattorias and bakeries: cacio e pepe, porchetta and gelato.','food',180,55.00,'EUR','Trastevere, Rome','active',2,TRUE),
    ('00000000-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000003','Villa d''Este & Tivoli Gardens','Half-day escape to the Renaissance fountains of Villa d''Este, with private transfer.','day-trip',300,75.00,'EUR','Tivoli','active',3,FALSE);


-- ---------------------------------------------------------------------------
-- restaurants & FAQs
-- ---------------------------------------------------------------------------

INSERT INTO restaurants (id, hotel_id, name, description, cuisine_type, opening_hours, location, status, sort_order) VALUES
    ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Maré Alta Rooftop','Seafood and Portuguese classics on the rooftop with marina views.','Seafood / Portuguese','19:00 – 23:00','Rooftop','active',1),
    ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','Café do Cais','Breakfast, brunch and light lunches on the ground floor.','Café / Brunch','07:00 – 15:00','Ground floor','active',2),
    ('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000002','Riad Ksar','Moroccan dinners around the candlelit courtyard: tagines, couscous and pastilla.','Moroccan','19:30 – 23:30','Courtyard','active',1),
    ('00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000002','Terrase de l''Atlas','Grill and mezze on the rooftop, with the Atlas Mountains on the horizon.','Grill / Middle Eastern','12:00 – 22:30','Rooftop','active',2),
    ('00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000003','La Pergola del Pincio','Seasonal Italian tasting menu on the garden terrace.','Italian','19:00 – 23:00','Garden terrace','active',1);


INSERT INTO faqs (id, hotel_id, question, answer, category, sort_order, status) VALUES
    ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','What are the check-in and check-out times?','Check-in is from 15:00 and check-out is until 12:00. Late check-out can be requested at reception.','stay',1,'active'),
    ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','Is parking available?','Yes — secure on-site parking is available for €15 per night, or €20 with valet.','stay',2,'active'),
    ('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','Do you offer airport transfers?','Yes, a private transfer from Lisbon airport can be added to your booking for €45 one way.','travel',3,'active'),
    ('00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000002','What are the check-in and check-out times?','Check-in is from 14:00 and check-out is until 12:00. The riad is reached by a short walk from the nearest car park.','stay',1,'active'),
    ('00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000002','Are children welcome?','Yes — children are welcome and the Family Riad Suite sleeps up to four. Cots are available on request.','stay',2,'active'),
    ('00000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000002','Do you provide hammam treatments?','Yes, our hammam and massage treatments can be booked through the front desk or added to your stay.','wellness',3,'active'),
    ('00000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000003','What are the check-in and check-out times?','Check-in is from 15:00 and check-out is until 11:00.','stay',1,'active'),
    ('00000000-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000003','Is the hotel accessible?','The palazzo is a listed building; the main floor and the restaurant are step-free. Please let us know your needs at booking.','stay',2,'active'),
    ('00000000-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000003','Can you arrange tickets for museums?','Yes, our concierge books skip-the-line tickets and private tours for the Colosseum, Vatican and Borghese Gallery.','travel',3,'active');


-- ---------------------------------------------------------------------------
-- availability (sparse — nights with activity only; total_inventory on room types)
-- ---------------------------------------------------------------------------

INSERT INTO availability (room_type_id,stay_date,rooms_sold,out_of_order,blocked, id)
VALUES
    ('00000000-0000-0000-0000-000000000001','2026-09-01',9,0,0, gen_random_uuid()),
    ('00000000-0000-0000-0000-000000000001','2026-09-02',10,0,0, gen_random_uuid()),
    ('00000000-0000-0000-0000-000000000001','2026-09-03',6,0,0, gen_random_uuid()),
    ('00000000-0000-0000-0000-000000000002','2026-09-01',6,0,0, gen_random_uuid()),
    ('00000000-0000-0000-0000-000000000002','2026-09-02',4,0,0, gen_random_uuid()),
    ('00000000-0000-0000-0000-000000000003','2026-09-01',7,0,0, gen_random_uuid()),
    ('00000000-0000-0000-0000-000000000003','2026-10-01',5,0,0, gen_random_uuid()),
    ('00000000-0000-0000-0000-000000000004','2026-09-01',6,0,0, gen_random_uuid()),
    ('00000000-0000-0000-0000-000000000004','2026-09-02',8,0,0, gen_random_uuid()),
    ('00000000-0000-0000-0000-000000000005','2026-09-05',4,0,0, gen_random_uuid()),
    ('00000000-0000-0000-0000-000000000007','2026-09-01',3,0,0, gen_random_uuid()),
    ('00000000-0000-0000-0000-000000000009','2026-09-01',4,0,0, gen_random_uuid());


-- ---------------------------------------------------------------------------
-- reviews (approved; one pending on hotel 1)
-- ---------------------------------------------------------------------------

INSERT INTO reviews (id, hotel_id, author_name, rating, cleanliness_rating, location_rating,
                     service_rating, value_rating, title, comment, moderation_status,
                     response_text, responded_at, responded_by_user_id, created_at, is_featured_on_homepage) VALUES
    ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Sofia Marques',5,5,5,5,4,'A perfect seaside escape','The room was bright and spotless, the rooftop dinner unforgettable, and the staff could not have been more helpful. Already planning a return.','approved','Thank you Sofia — we would love to welcome you back!',now() - interval'12 days','00000000-0000-0000-0000-000000000002',now() - interval'20 days',TRUE),
    ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','Tom Keller',4,4,5,4,4,'Great location, lovely pool','Two minutes from the marina and an easy tram ride into town. Rooms are well kept; breakfast is worth the upgrade.','approved',NULL,NULL,NULL,now() - interval'15 days',FALSE),
    ('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','Aïcha Benjelloun',5,5,5,5,5,'The Sintra trip made the stay','Booked through the hotel and it was seamless — private driver, skip-the-line tickets, zero stress. The sea-view suite is gorgeous.','approved',NULL,NULL,NULL,now() - interval'9 days',TRUE),
    ('00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','Nora Lindqvist',3,4,4,3,3,'Nice but busy weekend','Beautiful hotel, but the pool was crowded and our room faced the garden rather than the sea. Still a good base for Lisbon.','pending',NULL,NULL,NULL,now() - interval'2 days',FALSE),
    ('00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000002','Claire Dubois',5,5,5,5,5,'The most magical riad','The courtyard at night is pure magic. Hammam, rooftop dinners, and the kindest staff. We did the balloon ride at sunrise — book it.','approved','Merci Claire — the balloon is our favourite too!',now() - interval'10 days','00000000-0000-0000-0000-000000000004',now() - interval'18 days',TRUE),
    ('00000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000002','James Whitfield',5,5,4,5,4,'Worth every dirham','A short walk through the medina to get there, then total calm. The Atlas Mountain day trip organised by the riad was a highlight.','approved',NULL,NULL,NULL,now() - interval'14 days',FALSE),
    ('00000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000002','Sara Al Farsi',4,5,5,4,4,'Beautiful and authentic','Authentic, beautifully kept riad. Rooms are cool in summer. Only note: the streets around are busy with scooters at night.','approved',NULL,NULL,NULL,now() - interval'8 days',TRUE),
    ('00000000-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000002','David Okafor',5,5,5,5,5,'Honeymoon perfection','They upgraded us to the Family Riad Suite with the plunge pool. Every evening a note from the chef about dinner. Unforgettable.','approved',NULL,NULL,NULL,now() - interval'6 days',FALSE),
    ('00000000-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000003','Elena Petrov',5,5,5,5,5,'A Roman gem','The palazzo is stunning and surprisingly quiet. The staff remembered our names and arranged a private Colosseum tour at short notice.','approved','Grazie mille Elena — the pleasure was ours!',now() - interval'11 days','00000000-0000-0000-0000-000000000005',now() - interval'19 days',TRUE),
    ('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000003','Marcus Reed',4,4,5,5,4,'Terrific location and service','A ten-minute walk to the Spanish Steps, and the garden terrace breakfast is superb. Room was compact but beautifully finished.','approved',NULL,NULL,NULL,now() - interval'13 days',FALSE),
    ('00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000003','Ines Alvarez',5,5,5,5,5,'The wine cellar tasting is a must','A hidden 19th-century cellar under the palazzo with an excellent sommelier. Book the Imperial Suite if you can.','approved',NULL,NULL,NULL,now() - interval'5 days',TRUE),
    ('00000000-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000003','Hans Müller',4,5,4,4,4,'Elegant, classic Rome','Frescoes, high ceilings, perfect espresso. Taxi to the centre is quick. Would happily return.','approved',NULL,NULL,NULL,now() - interval'3 days',FALSE);


-- ---------------------------------------------------------------------------
-- media (images.unsplash.com — frontend CSP allows unsplash)
-- ---------------------------------------------------------------------------

INSERT INTO media (id, url, alt_text, caption, category, mime_type, hotel_id, room_type_id,
                   experience_id, restaurant_id, platform_id, is_primary, sort_order) VALUES
    -- platform hero
    ('00000000-0000-0000-0000-000000000001','https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1800&q=80','The Hotel Collection — resort pool at dusk','Where every stay is a story','hero','image/jpeg',NULL,NULL,NULL,NULL,'00000000-0000-0000-0000-000000000001',TRUE,0),
    ('00000000-0000-0000-0000-000000000002','https://images.unsplash.com/photo-1505843513577-22bb7d1e6e2a?auto=format&fit=crop&w=1200&q=80','The Hotel Collection — boutique hotel lobby',NULL,'hero','image/jpeg',NULL,NULL,NULL,NULL,'00000000-0000-0000-0000-000000000001',FALSE,1),
    -- hotels
    ('00000000-0000-0000-0000-000000000003','https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1400&q=80','Azure Bay Resort — saltwater pool',NULL,'general','image/jpeg','00000000-0000-0000-0000-000000000001',NULL,NULL,NULL,NULL,TRUE,0),
    ('00000000-0000-0000-0000-000000000004','https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1400&q=80','Azure Bay Resort — building and terrace',NULL,'general','image/jpeg','00000000-0000-0000-0000-000000000001',NULL,NULL,NULL,NULL,FALSE,1),
    ('00000000-0000-0000-0000-000000000005','https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1400&q=80','Azure Bay Resort — lounge chairs by the water',NULL,'general','image/jpeg','00000000-0000-0000-0000-000000000001',NULL,NULL,NULL,NULL,FALSE,2),
    ('00000000-0000-0000-0000-000000000006','https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1400&q=80','Dar Zellij — courtyard pool',NULL,'general','image/jpeg','00000000-0000-0000-0000-000000000002',NULL,NULL,NULL,NULL,TRUE,0),
    ('00000000-0000-0000-0000-000000000007','https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1400&q=80','Dar Zellij — riad exterior',NULL,'general','image/jpeg','00000000-0000-0000-0000-000000000002',NULL,NULL,NULL,NULL,FALSE,1),
    ('00000000-0000-0000-0000-000000000008','https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=1400&q=80','Dar Zellij — candlelit courtyard',NULL,'general','image/jpeg','00000000-0000-0000-0000-000000000002',NULL,NULL,NULL,NULL,FALSE,2),
    ('00000000-0000-0000-0000-000000000009','https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1400&q=80','Villa Aurelia — palazzo façade',NULL,'general','image/jpeg','00000000-0000-0000-0000-000000000003',NULL,NULL,NULL,NULL,TRUE,0),
    ('00000000-0000-0000-0000-000000000010','https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=1400&q=80','Villa Aurelia — garden terrace',NULL,'general','image/jpeg','00000000-0000-0000-0000-000000000003',NULL,NULL,NULL,NULL,FALSE,1),
    ('00000000-0000-0000-0000-000000000011','https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=1400&q=80','Villa Aurelia — elegant lounge',NULL,'general','image/jpeg','00000000-0000-0000-0000-000000000003',NULL,NULL,NULL,NULL,FALSE,2),
    -- room types
    ('00000000-0000-0000-0000-000000000012','https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80','Deluxe Sea View — king bed with window over the marina',NULL,'rooms','image/jpeg',NULL,'00000000-0000-0000-0000-000000000001',NULL,NULL,NULL,TRUE,0),
    ('00000000-0000-0000-0000-000000000013','https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80','Family Suite — lounge area',NULL,'rooms','image/jpeg',NULL,'00000000-0000-0000-0000-000000000002',NULL,NULL,NULL,TRUE,0),
    ('00000000-0000-0000-0000-000000000014','https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80','Garden Twin — bright twin room',NULL,'rooms','image/jpeg',NULL,'00000000-0000-0000-0000-000000000003',NULL,NULL,NULL,TRUE,0),
    ('00000000-0000-0000-0000-000000000015','https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=80','Courtyard Double — traditional room',NULL,'rooms','image/jpeg',NULL,'00000000-0000-0000-0000-000000000004',NULL,NULL,NULL,TRUE,0),
    ('00000000-0000-0000-0000-000000000016','https://images.unsplash.com/photo-1595576508898-0ad5c879a061?auto=format&fit=crop&w=1200&q=80','Atlas Mountain View — king room with bathtub',NULL,'rooms','image/jpeg',NULL,'00000000-0000-0000-0000-000000000005',NULL,NULL,NULL,TRUE,0),
    ('00000000-0000-0000-0000-000000000017','https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80','Family Riad Suite — living space',NULL,'rooms','image/jpeg',NULL,'00000000-0000-0000-0000-000000000006',NULL,NULL,NULL,TRUE,0),
    ('00000000-0000-0000-0000-000000000018','https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80','Classic Room — restored palazzo room',NULL,'rooms','image/jpeg',NULL,'00000000-0000-0000-0000-000000000007',NULL,NULL,NULL,TRUE,0),
    ('00000000-0000-0000-0000-000000000019','https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80','Panorama Superior — king room with balcony',NULL,'rooms','image/jpeg',NULL,'00000000-0000-0000-0000-000000000008',NULL,NULL,NULL,TRUE,0),
    ('00000000-0000-0000-0000-000000000020','https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80','Imperial Suite — grand salon',NULL,'rooms','image/jpeg',NULL,'00000000-0000-0000-0000-000000000009',NULL,NULL,NULL,TRUE,0),
    -- experiences
    ('00000000-0000-0000-0000-000000000021','https://images.unsplash.com/photo-1555993539-1732b0258235?auto=format&fit=crop&w=1200&q=80','Sunset cruise on the Tagus',NULL,'experiences','image/jpeg',NULL,NULL,'00000000-0000-0000-0000-000000000001',NULL,NULL,TRUE,0),
    ('00000000-0000-0000-0000-000000000022','https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80','Old Lisbon walking tour',NULL,'experiences','image/jpeg',NULL,NULL,'00000000-0000-0000-0000-000000000002',NULL,NULL,TRUE,0),
    ('00000000-0000-0000-0000-000000000023','https://images.unsplash.com/photo-1519677100203-a0e668c92439?auto=format&fit=crop&w=1200&q=80','Sintra day trip',NULL,'experiences','image/jpeg',NULL,NULL,'00000000-0000-0000-0000-000000000003',NULL,NULL,TRUE,0),
    ('00000000-0000-0000-0000-000000000024','https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1200&q=80','Atlas Mountains day trip',NULL,'experiences','image/jpeg',NULL,NULL,'00000000-0000-0000-0000-000000000004',NULL,NULL,TRUE,0),
    ('00000000-0000-0000-0000-000000000025','https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=1200&q=80','Marrakech medina and souks tour',NULL,'experiences','image/jpeg',NULL,NULL,'00000000-0000-0000-0000-000000000005',NULL,NULL,TRUE,0),
    ('00000000-0000-0000-0000-000000000026','https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?auto=format&fit=crop&w=1200&q=80','Sunrise hot air balloon over the Palmeraie',NULL,'experiences','image/jpeg',NULL,NULL,'00000000-0000-0000-0000-000000000006',NULL,NULL,TRUE,0),
    ('00000000-0000-0000-0000-000000000027','https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1200&q=80','Colosseum by night tour',NULL,'experiences','image/jpeg',NULL,NULL,'00000000-0000-0000-0000-000000000007',NULL,NULL,TRUE,0),
    ('00000000-0000-0000-0000-000000000028','https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80','Trastevere food tour',NULL,'experiences','image/jpeg',NULL,NULL,'00000000-0000-0000-0000-000000000008',NULL,NULL,TRUE,0),
    ('00000000-0000-0000-0000-000000000029','https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=1200&q=80','Villa d''Este gardens day trip',NULL,'experiences','image/jpeg',NULL,NULL,'00000000-0000-0000-0000-000000000009',NULL,NULL,TRUE,0),
    -- restaurants
    ('00000000-0000-0000-0000-000000000030','https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80','Maré Alta Rooftop — dining terrace',NULL,'restaurants','image/jpeg',NULL,NULL,NULL,'00000000-0000-0000-0000-000000000001',NULL,TRUE,0),
    ('00000000-0000-0000-0000-000000000031','https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80','Riad Ksar — candlelit courtyard dinner',NULL,'restaurants','image/jpeg',NULL,NULL,NULL,'00000000-0000-0000-0000-000000000003',NULL,TRUE,0),
    ('00000000-0000-0000-0000-000000000032','https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=80','Terrase de l''Atlas — rooftop grill',NULL,'restaurants','image/jpeg',NULL,NULL,NULL,'00000000-0000-0000-0000-000000000004',NULL,TRUE,0),
    ('00000000-0000-0000-0000-000000000033','https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=1200&q=80','La Pergola del Pincio — tasting menu',NULL,'restaurants','image/jpeg',NULL,NULL,NULL,'00000000-0000-0000-0000-000000000005',NULL,TRUE,0);


-- ---------------------------------------------------------------------------
-- platform content blocks (theme of the landing page)
-- ---------------------------------------------------------------------------

INSERT INTO platform_content_blocks (id, platform_id, type, position, is_enabled) VALUES ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','HERO',1,TRUE), ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','EXPERIENCES',2,TRUE);


INSERT INTO hero_blocks (content_block_id, eyebrow, title, subtitle, image_media_id, mobile_image_media_id, cta_label, cta_target)
VALUES ('00000000-0000-0000-0000-000000000001','The Hotel Collection','Stays with a story','Three hotels, three cities, one standard of care — from a Lisbon marina resort to a Marrakech riad and a Roman palazzo.','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','Reserve your stay','/search');


INSERT INTO featured_experiences_blocks (content_block_id, title)
VALUES ('00000000-0000-0000-0000-000000000002','Experiences to remember');


INSERT INTO featured_experience_items (content_block_id,experience_id,position, id)
VALUES ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001',1, gen_random_uuid()), ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002',2, gen_random_uuid()), ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003',3, gen_random_uuid());


COMMIT;
