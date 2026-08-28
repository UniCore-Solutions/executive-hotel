-- ============================================================================
-- V30: CANONICAL HOTEL IDENTITY — "Executive Hotel"
-- ----------------------------------------------------------------------------
-- The single-hotel platform carried two identities that were the SAME
-- property but different records: the platform brand ("Executive Hotel",
-- drives the header/footer and most page metadata) and the canonical hotel
-- record ("Azure Bay Resort", drives the hotel page: breadcrumb, title,
-- gallery alt texts, JSON-LD). On a single-property platform that split is
-- the bug — the hotel entity itself is the platform brand.
--
-- This migration unifies the canonical hotel (id ...001) under the
-- "Executive Hotel" identity: the hotel row (name/brand/slug), its media alt
-- texts, the platform marketing copy and the hero block.
-- ============================================================================

UPDATE hotels
SET name = 'Executive Hotel',
    brand = 'Executive Hotel',
    slug = 'executive-hotel',
    email = 'hello@executivehotel.example',
    updated_at = now()
WHERE id = '00000000-0000-0000-0000-000000000001';

UPDATE media
SET alt_text = replace(alt_text, 'Azure Bay Resort', 'Executive Hotel')
WHERE hotel_id = '00000000-0000-0000-0000-000000000001';

UPDATE platforms
SET description = 'Executive Hotel is a four-star seaside hotel on Lisbon''s Marina — sunlit rooms with sea views, a rooftop seafood restaurant and a saltwater pool.',
    updated_at = now()
WHERE slug = 'executive-hotel';

UPDATE hero_blocks hb
SET title = 'Executive Hotel'
FROM platform_content_blocks cb
JOIN platforms p ON p.id = cb.platform_id
WHERE hb.content_block_id = cb.id
  AND p.slug = 'executive-hotel'
  AND cb.type = 'HERO';
