-- V11: seed the shared amenity catalog (referenced by admin UI via `adminAmenities`)
-- Names are UNIQUE; ON CONFLICT keeps this migration idempotent on re-run.

INSERT INTO amenities (name, icon, category) VALUES
    ('Wi-Fi',                'wifi',      'general'),
    ('Parking',              'car',       'general'),
    ('Airport Shuttle',      'bus',       'general'),
    ('24-hour Front Desk',   'clock',     'general'),
    ('Concierge',            'bell',      'general'),
    ('Luggage Storage',      'baggage',   'general'),
    ('Pet Friendly',         'paw',       'general'),
    ('Laundry Service',      'shirt',     'general'),
    ('Room Service',         'room-service', 'general'),
    ('Restaurant',           'utensils',  'general'),
    ('Bar',                  'glass',     'general'),
    ('Gym',                  'dumbbell',  'wellness'),
    ('Spa',                  'spa',       'wellness'),
    ('Swimming Pool',        'pool',      'wellness'),
    ('Sauna',                'sauna',     'wellness'),
    ('Hammam',               'hammam',    'wellness'),
    ('Business Center',      'briefcase', 'business'),
    ('Meeting Rooms',        'users',     'business'),
    ('Air Conditioning',     'snowflake', 'room'),
    ('Heating',              'thermometer', 'room'),
    ('Minibar',              'minibar',   'room'),
    ('Safe',                 'safe',      'room'),
    ('Balcony',              'balcony',   'room'),
    ('Sea View',             'waves',     'room'),
    ('City View',            'building',  'room'),
    ('Flat-screen TV',       'tv',        'room'),
    ('Coffee Machine',       'coffee',    'room'),
    ('Bathrobe & Slippers',  'bath',      'room')
ON CONFLICT (name) DO NOTHING;