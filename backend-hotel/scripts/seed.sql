-- ============================================================================
-- DEV SEED — single canonical hotel (UUID edition)
-- Rewritten for the post-V20 schema: primary/foreign keys are UUID columns.
-- Deterministic mapping: integer n -> '00000000-0000-0000-0000-<n zero-padded>'.
-- Reference data (roles V10, amenities V11, countries/currencies V1) comes from
-- migrations and is joined BY NAME / NATURAL KEY, never by generated id.
--
-- CANONICAL MODEL: the platform operates exactly ONE hotel — Executive Hotel
-- (Lisbon, id ...001). All other hotel records were deactivated by migration
-- V26. Inventory is derived from PHYSICAL ROOMS: room_types.total_inventory
-- equals the count of active rooms of that type (trigger-enforced), and
-- availability = physical rooms − reservations/inventory allocations per
-- night. No availability rows are seeded (sparse model: a night with no row
-- is fully available) and no reservations are seeded — bookings are made
-- live through the API and consume real inventory.
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
    ('00000000-0000-0000-0000-000000000003','content@hotelcollection.test','$2b$12$fz4jS6wgF.xPDu9cJiQuTOZRtGW9.si0XMtFJVSwTZCk9rJTHaVq.','Youssef','Benali','active');


INSERT INTO user_roles (id,user_id,role_id,hotel_id)
SELECT gen_random_uuid(), u.id, r.id, NULL
FROM users u, roles r
WHERE u.id = '00000000-0000-0000-0000-000000000001' AND r.name = 'super_admin';


-- hotel-scoped staff roles — inserted AFTER hotels (hotels are seeded below)


-- ---------------------------------------------------------------------------
-- platform (the brand of the single canonical hotel)
-- ---------------------------------------------------------------------------

INSERT INTO platforms (id, name, slug, tagline, description, status, default_currency) VALUES ('00000000-0000-0000-0000-000000000001','Executive Hotel','executive-hotel','A seaside retreat on Lisbon''s Marina.','Executive Hotel is a four-star seaside hotel on Lisbon''s Marina — sunlit rooms with sea views, a rooftop seafood restaurant and a saltwater pool.','active',NULL);


-- ---------------------------------------------------------------------------
-- hotels — EXACTLY ONE canonical hotel: Executive Hotel (Lisbon)
-- ---------------------------------------------------------------------------

INSERT INTO hotels (id, name, brand, description, long_description, hotel_type,
                    address_line1, address_line2, city, country_code, latitude, longitude,
                    phone, email, star_rating, check_in_time, check_out_time,
                    default_currency, config, status, platform_id, slug, is_featured_on_homepage) VALUES
    ('00000000-0000-0000-0000-000000000001','Executive Hotel','Executive Hotel','A seaside retreat on Lisbon''s Marina','Executive Hotel sits on the edge of Lisbon''s Marina, minutes from the historic waterfront. Sunlit rooms with sea views, a rooftop seafood restaurant and a saltwater pool make it a calm base for exploring the city.','resort','Avenida da Marina 42','Doca de Alcântara','Lisbon','PT',38.7050,-9.1785,'+351 21 000 0101','hello@executivehotel.example',4,'15:00','12:00','MAD','{}','active','00000000-0000-0000-0000-000000000001','executive-hotel',TRUE);


-- hotel-scoped staff roles (hotels must exist first)
INSERT INTO user_roles (id,user_id,role_id,hotel_id)
SELECT gen_random_uuid(), u.id, r.id, h.id
FROM users u, roles r, hotels h
WHERE u.id = '00000000-0000-0000-0000-000000000002' AND r.name = 'hotel_admin' AND h.id = '00000000-0000-0000-0000-000000000001';


INSERT INTO user_roles (id,user_id,role_id,hotel_id)
SELECT gen_random_uuid(), u.id, r.id, h.id
FROM users u, roles r, hotels h
WHERE u.id = '00000000-0000-0000-0000-000000000003' AND r.name = 'content_manager' AND h.id = '00000000-0000-0000-0000-000000000001';


-- ---------------------------------------------------------------------------
-- room types (3 sellable categories; inventory = physical rooms, V26)
-- ---------------------------------------------------------------------------

INSERT INTO room_types (id, hotel_id, name, slug, description, long_description, max_adults, max_children,
                        bed_configuration, size_sqm, view_type, status, total_inventory, is_featured_on_homepage) VALUES
    ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Deluxe Sea View','deluxe-sea-view','King room overlooking the marina','A bright king room with floor-to-ceiling windows over the Tagus, a work desk and a marble bathroom with walk-in rain shower.',2,1,'1 King bed',28.00,'Sea view','active',4,TRUE),
    ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','Family Suite','family-suite','Two-bedroom suite with lounge and sea-view terrace','Two bedrooms with a shared lounge, small kitchenette and a terrace with direct marina views; sleeps four comfortably.',4,2,'1 King + 2 Single beds',55.00,'Sea view','active',2,TRUE),
    ('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','Garden Twin','garden-twin','Cosy twin overlooking the pool garden','A quiet twin room on the garden side with two single beds, tea-making corner and views of the pool deck.',2,1,'2 Single beds',24.00,'Garden view','active',2,FALSE);


-- physical rooms (a few per type so the rooms workspace is usable;
-- total_inventory is derived from these by the V26 trigger)
INSERT INTO rooms (id, hotel_id, room_type_id, room_number, floor, status, housekeeping_status, maintenance_status) VALUES
    ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','101','1','active','clean','ok'),
    ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','102','1','active','clean','ok'),
    ('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','103','1','active','dirty','ok'),
    ('00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','104','1','active','clean','ok'),
    ('00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','201','2','active','clean','ok'),
    ('00000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','202','2','active','clean','ok'),
    ('00000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','301','3','active','clean','ok'),
    ('00000000-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','302','3','active','clean','ok');


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


-- ---------------------------------------------------------------------------
-- rate plans + prices (canonical hotel only)
-- ---------------------------------------------------------------------------

INSERT INTO rate_plans (id, hotel_id, name, code, currency_code, meal_plan, cancellation_policy,
                        payment_policy, is_refundable, cancellation_deadline_days,
                        cancellation_penalty_type, cancellation_penalty_value,
                        payment_timing, deposit_percentage, min_stay, max_stay, occupancy_rules, status) VALUES
    ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Bed & Breakfast Flex','BB_FLEX','MAD','breakfast','Free cancellation up to 2 days before arrival; after that the first night is charged.','Pay at the property',TRUE,2,'first_night',NULL,'pay_at_property',NULL,1,NULL,'Maximum 2 adults + 1 child per Deluxe Sea View room','active'),
    ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','Non-Refundable Saver','SAVER','MAD',NULL,'Non-refundable; full stay charged on cancellation.','Full prepayment at booking',FALSE,NULL,'full_stay',NULL,'prepay_full',NULL,NULL,NULL,NULL,'active');


INSERT INTO room_type_rate_plans (id, hotel_id, room_type_id, rate_plan_id, currency_code) VALUES
    ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','MAD'), ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','MAD'),
    ('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','MAD'), ('00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002','MAD'),
    ('00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','MAD'), ('00000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000002','MAD');


INSERT INTO rate_plan_prices (id, room_type_rate_plan_id, currency_code, valid_from, valid_to, price_amount) VALUES
    ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','MAD','2026-01-01','2027-12-31',2077),
    ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002','MAD','2026-01-01','2027-12-31',1813),
    ('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000003','MAD','2026-01-01','2027-12-31',2638),
    ('00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000004','MAD','2026-01-01','2027-12-31',2308),
    ('00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000005','MAD','2026-01-01','2027-12-31',1649),
    ('00000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000006','MAD','2026-01-01','2027-12-31',1407);


-- ---------------------------------------------------------------------------
-- promotions (canonical hotel only)
-- ---------------------------------------------------------------------------

INSERT INTO promotions (id, hotel_id, code, name, description, discount_type, discount_value,
                         booking_window_start, booking_window_end, stay_window_start, stay_window_end,
                         min_nights, max_usage_total, max_usage_per_guest, stackable,
                         applies_to_all_room_types, applies_to_all_rate_plans, applicable_days_of_week, status) VALUES
    ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','SPRING25','Spring Escape 15%','15% off stays of 2+ nights booked before the end of the year.','percentage',15.00,'2026-08-01','2026-12-31','2026-09-01','2026-11-30',2,NULL,1,FALSE,TRUE,TRUE,NULL,'active');


-- ---------------------------------------------------------------------------
-- taxes & fees (canonical hotel only)
-- ---------------------------------------------------------------------------

INSERT INTO tax_fee_types (id, hotel_id, name, charge_type, calculation_method, value, currency_code, status) VALUES
    ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','City tax','tax','percentage',5.00,NULL,'active'),
    ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','VAT','tax','percentage',12.00,NULL,'active');


-- ---------------------------------------------------------------------------
-- extras (canonical hotel only)
-- ---------------------------------------------------------------------------

INSERT INTO extras (id, hotel_id, name, description, pricing_model, price_amount, currency_code, status) VALUES
    ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Breakfast Buffet','Daily buffet on the rooftop with views over the marina.','per_person',165,'MAD','active'),
    ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','Airport Transfer','Private transfer from Lisbon airport, one way.','per_stay',495,'MAD','active'),
    ('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','Spa Access','Access to the spa and saltwater pool for the whole stay.','per_stay',330,'MAD','active'),
    ('00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','Late Check-out','Keep the room until 16:00 on departure day.','per_room',275,'MAD','active');


-- ---------------------------------------------------------------------------
-- experiences (canonical hotel only)
-- ---------------------------------------------------------------------------

INSERT INTO experiences (id, hotel_id, name, description, category, duration_minutes, price_amount,
                         currency_code, location, status, sort_order, is_featured_on_homepage) VALUES
    ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Sunset Cruise on the Tagus','Sail the Tagus at golden hour past the Belém Tower and the 25 de Abril bridge, with a glass of local wine on deck.','water',180,495,'MAD','Tagus River','active',1,TRUE),
    ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','Old Lisbon Walking Tour','A guided walk through Alfama and Baixa: cobbled lanes, fado houses and the city''s best pastel de nata.','culture',120,275,'MAD','Alfama, Lisbon','active',2,FALSE),
    ('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','Sintra Day Trip','A full day at Sintra''s Pena Palace and Quinta da Regaleira, with hotel pickup and a driver-guide.','day-trip',420,989,'MAD','Sintra','active',3,TRUE);


-- ---------------------------------------------------------------------------
-- restaurants & FAQs (canonical hotel only)
-- ---------------------------------------------------------------------------

INSERT INTO restaurants (id, hotel_id, name, description, cuisine_type, opening_hours, location, status, sort_order) VALUES
    ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Maré Alta Rooftop','Seafood and Portuguese classics on the rooftop with marina views.','Seafood / Portuguese','19:00 – 23:00','Rooftop','active',1),
    ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','Café do Cais','Breakfast, brunch and light lunches on the ground floor.','Café / Brunch','07:00 – 15:00','Ground floor','active',2);


INSERT INTO faqs (id, hotel_id, question, answer, category, sort_order, status) VALUES
    ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','What are the check-in and check-out times?','Check-in is from 15:00 and check-out is until 12:00. Late check-out can be requested at reception.','stay',1,'active'),
    ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','Is parking available?','Yes — secure on-site parking is available for 165 MAD per night, or 220 MAD with valet.','stay',2,'active'),
    ('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','Do you offer airport transfers?','Yes, a private transfer from Lisbon airport can be added to your booking for 495 MAD one way.','travel',3,'active');


-- ---------------------------------------------------------------------------
-- availability — NOT SEEDED (sparse model): a night with no availability row
-- is fully available. Units are sold by real reservations (one unit per
-- reservation room line per night) and released on cancellation.
-- ---------------------------------------------------------------------------


-- ---------------------------------------------------------------------------
-- reviews (canonical hotel only; approved + one pending)
-- ---------------------------------------------------------------------------

INSERT INTO reviews (id, hotel_id, author_name, rating, cleanliness_rating, location_rating,
                     service_rating, value_rating, title, comment, moderation_status,
                     response_text, responded_at, responded_by_user_id, created_at, is_featured_on_homepage) VALUES
    ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Sofia Marques',5,5,5,5,4,'A perfect seaside escape','The room was bright and spotless, the rooftop dinner unforgettable, and the staff could not have been more helpful. Already planning a return.','approved','Thank you Sofia — we would love to welcome you back!',now() - interval'12 days','00000000-0000-0000-0000-000000000002',now() - interval'20 days',TRUE),
    ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','Tom Keller',4,4,5,4,4,'Great location, lovely pool','Two minutes from the marina and an easy tram ride into town. Rooms are well kept; breakfast is worth the upgrade.','approved',NULL,NULL,NULL,now() - interval'15 days',FALSE),
    ('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','Aïcha Benjelloun',5,5,5,5,5,'The Sintra trip made the stay','Booked through the hotel and it was seamless — private driver, skip-the-line tickets, zero stress. The sea-view suite is gorgeous.','approved',NULL,NULL,NULL,now() - interval'9 days',TRUE),
    ('00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','Nora Lindqvist',3,4,4,3,3,'Nice but busy weekend','Beautiful hotel, but the pool was crowded and our room faced the garden rather than the sea. Still a good base for Lisbon.','pending',NULL,NULL,NULL,now() - interval'2 days',FALSE);


-- ---------------------------------------------------------------------------
-- media (images.unsplash.com — frontend CSP allows unsplash)
-- ---------------------------------------------------------------------------

INSERT INTO media (id, url, alt_text, caption, category, mime_type, hotel_id, room_type_id,
                   experience_id, restaurant_id, platform_id, is_primary, sort_order) VALUES
    -- platform hero
    ('00000000-0000-0000-0000-000000000001','https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1800&q=80','Executive Hotel — resort pool at dusk','Where every stay is a story','hero','image/jpeg',NULL,NULL,NULL,NULL,'00000000-0000-0000-0000-000000000001',TRUE,0),
    ('00000000-0000-0000-0000-000000000002','https://images.unsplash.com/photo-1505843513577-22bb7d1e6e2a?auto=format&fit=crop&w=1200&q=80','Executive Hotel — lobby lounge',NULL,'hero','image/jpeg',NULL,NULL,NULL,NULL,'00000000-0000-0000-0000-000000000001',FALSE,1),
    -- hotel
    ('00000000-0000-0000-0000-000000000003','https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1400&q=80','Executive Hotel — saltwater pool',NULL,'general','image/jpeg','00000000-0000-0000-0000-000000000001',NULL,NULL,NULL,NULL,TRUE,0),
    ('00000000-0000-0000-0000-000000000004','https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1400&q=80','Executive Hotel — building and terrace',NULL,'general','image/jpeg','00000000-0000-0000-0000-000000000001',NULL,NULL,NULL,NULL,FALSE,1),
    ('00000000-0000-0000-0000-000000000005','https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1400&q=80','Executive Hotel — lounge chairs by the water',NULL,'general','image/jpeg','00000000-0000-0000-0000-000000000001',NULL,NULL,NULL,NULL,FALSE,2),
    -- room types
    ('00000000-0000-0000-0000-000000000006','https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80','Deluxe Sea View — king bed with window over the marina',NULL,'rooms','image/jpeg',NULL,'00000000-0000-0000-0000-000000000001',NULL,NULL,NULL,TRUE,0),
    ('00000000-0000-0000-0000-000000000007','https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80','Family Suite — lounge area',NULL,'rooms','image/jpeg',NULL,'00000000-0000-0000-0000-000000000002',NULL,NULL,NULL,TRUE,0),
    ('00000000-0000-0000-0000-000000000008','https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80','Garden Twin — bright twin room',NULL,'rooms','image/jpeg',NULL,'00000000-0000-0000-0000-000000000003',NULL,NULL,NULL,TRUE,0),
    -- experiences
    ('00000000-0000-0000-0000-000000000009','https://images.unsplash.com/photo-1555993539-1732b0258235?auto=format&fit=crop&w=1200&q=80','Sunset cruise on the Tagus',NULL,'experiences','image/jpeg',NULL,NULL,'00000000-0000-0000-0000-000000000001',NULL,NULL,TRUE,0),
    ('00000000-0000-0000-0000-000000000010','https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80','Old Lisbon walking tour',NULL,'experiences','image/jpeg',NULL,NULL,'00000000-0000-0000-0000-000000000002',NULL,NULL,TRUE,0),
    ('00000000-0000-0000-0000-000000000011','https://images.unsplash.com/photo-1519677100203-a0e668c92439?auto=format&fit=crop&w=1200&q=80','Sintra day trip',NULL,'experiences','image/jpeg',NULL,NULL,'00000000-0000-0000-0000-000000000003',NULL,NULL,TRUE,0),
    -- restaurants
    ('00000000-0000-0000-0000-000000000012','https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80','Maré Alta Rooftop — dining terrace',NULL,'restaurants','image/jpeg',NULL,NULL,NULL,'00000000-0000-0000-0000-000000000001',NULL,TRUE,0);


-- ---------------------------------------------------------------------------
-- platform content blocks (theme of the landing page — single hotel)
-- ---------------------------------------------------------------------------

INSERT INTO platform_content_blocks (id, platform_id, type, position, is_enabled) VALUES ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','HERO',1,TRUE), ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','EXPERIENCES',2,TRUE);


INSERT INTO hero_blocks (content_block_id, eyebrow, title, subtitle, image_media_id, mobile_image_media_id, cta_label, cta_target)
VALUES ('00000000-0000-0000-0000-000000000001','Lisbon · Marina','Executive Hotel','A seaside retreat on Lisbon''s Marina — four-star rooms, a rooftop seafood restaurant and the Tagus on your doorstep.','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','Reserve your stay','/search');


INSERT INTO featured_experiences_blocks (content_block_id, title)
VALUES ('00000000-0000-0000-0000-000000000002','Experiences to remember');


INSERT INTO featured_experience_items (content_block_id,experience_id,position, id)
VALUES ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001',1, gen_random_uuid()), ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002',2, gen_random_uuid()), ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003',3, gen_random_uuid());


COMMIT;
