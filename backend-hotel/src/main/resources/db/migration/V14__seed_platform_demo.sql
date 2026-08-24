-- V14: SEED PLATFORM DEMO DATA
-- Approved in docs/planning/CLIENT_PLATFORM_INDEX_DATA_ARCHITECTURE.md (rev 3).
-- Idempotent (WHERE NOT EXISTS / ON CONFLICT DO NOTHING, V10/V11 precedent).
-- Demo-only: seeds when the demo hotel exists (id 3, Azure Bay Resort, Lisbon —
-- present in the dev database). Fresh databases without the demo hotel simply
-- skip the seed; V14 must never create business data (hotels/room types/rates).
-- Creates: the platform ("The Hotel Collection"), links demo hotel 3,
-- demo experiences (single source of truth — featured items reference them),
-- platform/hotel/room-type/experience media (existing CDN URLs so the frontend
-- CSP keeps working), and HERO + EXPERIENCES content blocks.

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM hotels WHERE id = 3) THEN

        -- ================================================================
        -- platform
        -- ================================================================

        INSERT INTO platforms (name, slug, tagline, description, status, default_currency)
        SELECT 'The Hotel Collection', 'the-hotel-collection',
               'A curated collection of boutique stays.',
               'The Hotel Collection brings together distinctive hotels, each with its own character, service and sense of place.',
               'active', NULL
        WHERE NOT EXISTS (SELECT 1 FROM platforms WHERE slug = 'the-hotel-collection');

        -- associate the demo hotel
        UPDATE hotels
        SET platform_id = (SELECT id FROM platforms WHERE slug = 'the-hotel-collection')
        WHERE id = 3;

        -- ================================================================
        -- demo experiences for hotel 3 (Azure Bay Resort, Lisbon)
        -- ================================================================

        INSERT INTO experiences (hotel_id, name, description, category, duration_minutes, price_amount,
                                 currency_code, location, status, sort_order)
        SELECT 3, 'Sunset Cruise on the Tagus',
               'Sail the Tagus at golden hour past the Belém Tower and the 25 de Abril bridge, with a glass of local wine on deck.',
               'water', 180, 45.00, 'EUR', 'Tagus River', 'active', 1
        WHERE NOT EXISTS (SELECT 1 FROM experiences WHERE hotel_id = 3 AND name = 'Sunset Cruise on the Tagus');

        INSERT INTO experiences (hotel_id, name, description, category, duration_minutes, price_amount,
                                 currency_code, location, status, sort_order)
        SELECT 3, 'Old Lisbon Walking Tour',
               'A guided walk through Alfama and Baixa: cobbled lanes, fado houses and the city''s best pastel de nata.',
               'culture', 120, 25.00, 'EUR', 'Alfama, Lisbon', 'active', 2
        WHERE NOT EXISTS (SELECT 1 FROM experiences WHERE hotel_id = 3 AND name = 'Old Lisbon Walking Tour');

        INSERT INTO experiences (hotel_id, name, description, category, duration_minutes, price_amount,
                                 currency_code, location, status, sort_order)
        SELECT 3, 'Sintra Day Trip',
               'A full day at Sintra''s Pena Palace and Quinta da Regaleira, with hotel pickup and a driver-guide.',
               'day-trip', 420, 90.00, 'EUR', 'Sintra', 'active', 3
        WHERE NOT EXISTS (SELECT 1 FROM experiences WHERE hotel_id = 3 AND name = 'Sintra Day Trip');

        -- ================================================================
        -- media (existing CDN URLs — frontend CSP permits cf.bstatic / tripcdn / unsplash)
        -- ================================================================

        -- platform-owned hero image
        INSERT INTO media (url, alt_text, category, mime_type, platform_id, is_primary, sort_order)
        SELECT 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/572984359.jpg?k=c319f2502790e9a3a12181017bfb98066f040aebf48c6f02f4665c04a5aad074&o=',
               'Azure Bay Resort lobby with a wooden feature wall', 'hero', 'image/jpeg',
               id, TRUE, 0
        FROM platforms WHERE slug = 'the-hotel-collection'
          AND NOT EXISTS (SELECT 1 FROM media
                          WHERE platform_id = (SELECT id FROM platforms WHERE slug = 'the-hotel-collection')
                            AND category = 'hero');

        -- hotel media (primary + secondary)
        INSERT INTO media (url, alt_text, category, mime_type, hotel_id, is_primary, sort_order)
        SELECT 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/576912113.jpg?k=e4a8439005872a2f65d93838b01e518ee5386fcf62eceaf457b1d91023f99a68&o=',
               'Azure Bay Resort lobby waiting area', 'general', 'image/jpeg', 3, TRUE, 0
        WHERE NOT EXISTS (SELECT 1 FROM media WHERE hotel_id = 3 AND is_primary AND category = 'general');

        INSERT INTO media (url, alt_text, category, mime_type, hotel_id, is_primary, sort_order)
        SELECT 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/576912115.jpg?k=3a21a2147228c930cc1321494aac9d1bfe1af6c8c4e5c7fe51758a348f2b78b3&o=',
               'Azure Bay Resort living room with couches', 'general', 'image/jpeg', 3, FALSE, 1
        WHERE NOT EXISTS (SELECT 1 FROM media WHERE hotel_id = 3 AND sort_order = 1);

        -- room-type media (Deluxe Sea View, room type id 1)
        INSERT INTO media (url, alt_text, category, mime_type, room_type_id, is_primary, sort_order)
        SELECT 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/572979699.jpg?k=2d66343c58755b8db3dde1f0604ee1e1891e6bbb61d7d015d98a309417c39e41&o=',
               'Deluxe Sea View double room with a desk', 'rooms', 'image/jpeg', 1, TRUE, 0
        WHERE NOT EXISTS (SELECT 1 FROM media WHERE room_type_id = 1 AND is_primary);

        -- experience media (one per demo experience)
        INSERT INTO media (url, alt_text, category, mime_type, experience_id, is_primary, sort_order)
        SELECT 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/572979710.jpg?k=28183c9921918bf87bc3195a46554a65a84eafffb9d3a4f5274533e971def62a&o=',
               'Sunset cruise on the Tagus', 'experiences', 'image/jpeg',
               (SELECT id FROM experiences WHERE hotel_id = 3 AND name = 'Sunset Cruise on the Tagus'), TRUE, 0
        WHERE EXISTS (SELECT 1 FROM experiences WHERE hotel_id = 3 AND name = 'Sunset Cruise on the Tagus')
          AND NOT EXISTS (SELECT 1 FROM media
                          WHERE experience_id = (SELECT id FROM experiences WHERE hotel_id = 3 AND name = 'Sunset Cruise on the Tagus'));

        INSERT INTO media (url, alt_text, category, mime_type, experience_id, is_primary, sort_order)
        SELECT 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/572984057.jpg?k=376fcf6b7d645d777fcbef5edbe1e58d5e2dd478457547702da11cf4f39bcbc3&o=',
               'Old Lisbon walking tour', 'experiences', 'image/jpeg',
               (SELECT id FROM experiences WHERE hotel_id = 3 AND name = 'Old Lisbon Walking Tour'), TRUE, 0
        WHERE EXISTS (SELECT 1 FROM experiences WHERE hotel_id = 3 AND name = 'Old Lisbon Walking Tour')
          AND NOT EXISTS (SELECT 1 FROM media
                          WHERE experience_id = (SELECT id FROM experiences WHERE hotel_id = 3 AND name = 'Old Lisbon Walking Tour'));

        INSERT INTO media (url, alt_text, category, mime_type, experience_id, is_primary, sort_order)
        SELECT 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/572984066.jpg?k=fccdab338c38b9d217b46f3037ec98f51d8c687e5dfcf433bf62bda4be30fedb&o=',
               'Sintra day trip', 'experiences', 'image/jpeg',
               (SELECT id FROM experiences WHERE hotel_id = 3 AND name = 'Sintra Day Trip'), TRUE, 0
        WHERE EXISTS (SELECT 1 FROM experiences WHERE hotel_id = 3 AND name = 'Sintra Day Trip')
          AND NOT EXISTS (SELECT 1 FROM media
                          WHERE experience_id = (SELECT id FROM experiences WHERE hotel_id = 3 AND name = 'Sintra Day Trip'));

        -- ================================================================
        -- content blocks
        -- ================================================================

        INSERT INTO platform_content_blocks (platform_id, type, position, is_enabled)
        SELECT id, 'HERO', 1, TRUE FROM platforms WHERE slug = 'the-hotel-collection'
        ON CONFLICT (platform_id, position) DO NOTHING;

        INSERT INTO platform_content_blocks (platform_id, type, position, is_enabled)
        SELECT id, 'EXPERIENCES', 2, TRUE FROM platforms WHERE slug = 'the-hotel-collection'
        ON CONFLICT (platform_id, position) DO NOTHING;

        -- hero block (image = platform hero media)
        INSERT INTO hero_blocks (content_block_id, eyebrow, title, subtitle, image_media_id, cta_label, cta_target)
        SELECT pcb.id,
               'The Hotel Collection',
               'Azure Bay Resort, Lisbon',
               'A seaside retreat on Lisbon''s Marina — four-star rooms, a rooftop restaurant and the Tagus on your doorstep.',
               (SELECT id FROM media WHERE platform_id = p.id AND category = 'hero'),
               'Reserve your stay',
               '/search'
        FROM platform_content_blocks pcb
        JOIN platforms p ON p.id = pcb.platform_id
        WHERE p.slug = 'the-hotel-collection' AND pcb.type = 'HERO'
        ON CONFLICT (content_block_id) DO NOTHING;

        INSERT INTO featured_experiences_blocks (content_block_id, title)
        SELECT pcb.id, 'Experiences to remember'
        FROM platform_content_blocks pcb
        JOIN platforms p ON p.id = pcb.platform_id
        WHERE p.slug = 'the-hotel-collection' AND pcb.type = 'EXPERIENCES'
        ON CONFLICT (content_block_id) DO NOTHING;

        -- featured items reference REAL experiences rows (single source of truth)
        INSERT INTO featured_experience_items (content_block_id, experience_id, position)
        SELECT pcb.id,
               (SELECT id FROM experiences WHERE hotel_id = 3 AND name = 'Sunset Cruise on the Tagus'),
               1
        FROM platform_content_blocks pcb
        JOIN platforms p ON p.id = pcb.platform_id
        WHERE p.slug = 'the-hotel-collection' AND pcb.type = 'EXPERIENCES'
          AND EXISTS (SELECT 1 FROM experiences WHERE hotel_id = 3 AND name = 'Sunset Cruise on the Tagus')
          AND NOT EXISTS (SELECT 1 FROM featured_experience_items
                          WHERE content_block_id = pcb.id
                            AND experience_id = (SELECT id FROM experiences WHERE hotel_id = 3 AND name = 'Sunset Cruise on the Tagus'));

        INSERT INTO featured_experience_items (content_block_id, experience_id, position)
        SELECT pcb.id,
               (SELECT id FROM experiences WHERE hotel_id = 3 AND name = 'Old Lisbon Walking Tour'),
               2
        FROM platform_content_blocks pcb
        JOIN platforms p ON p.id = pcb.platform_id
        WHERE p.slug = 'the-hotel-collection' AND pcb.type = 'EXPERIENCES'
          AND EXISTS (SELECT 1 FROM experiences WHERE hotel_id = 3 AND name = 'Old Lisbon Walking Tour')
          AND NOT EXISTS (SELECT 1 FROM featured_experience_items
                          WHERE content_block_id = pcb.id
                            AND experience_id = (SELECT id FROM experiences WHERE hotel_id = 3 AND name = 'Old Lisbon Walking Tour'));

        INSERT INTO featured_experience_items (content_block_id, experience_id, position)
        SELECT pcb.id,
               (SELECT id FROM experiences WHERE hotel_id = 3 AND name = 'Sintra Day Trip'),
               3
        FROM platform_content_blocks pcb
        JOIN platforms p ON p.id = pcb.platform_id
        WHERE p.slug = 'the-hotel-collection' AND pcb.type = 'EXPERIENCES'
          AND EXISTS (SELECT 1 FROM experiences WHERE hotel_id = 3 AND name = 'Sintra Day Trip')
          AND NOT EXISTS (SELECT 1 FROM featured_experience_items
                          WHERE content_block_id = pcb.id
                            AND experience_id = (SELECT id FROM experiences WHERE hotel_id = 3 AND name = 'Sintra Day Trip'));

    END IF;
END $$;