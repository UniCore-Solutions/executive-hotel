#!/usr/bin/env bash
# Dev database reset: wipes business data (keeps schema + Flyway history +
# reference data from migrations) and applies scripts/seed.sql.
# Usage: scripts/seed-db.sh [db_name]
set -euo pipefail

DB_NAME="${1:-hotel_platform}"
PSQL=(docker exec -i hotel-platform-postgres psql -U postgres -d "$DB_NAME" -v ON_ERROR_STOP=1)

echo "== Wiping business data in $DB_NAME"
"${PSQL[@]}" <<'SQL'
TRUNCATE TABLE
    platforms, hotels, room_types, rooms, rate_plans, room_type_rate_plans,
    rate_plan_prices, promotions, promotion_eligible_rate_plans,
    promotion_eligible_room_types, tax_fee_types, extras, experiences,
    restaurants, faqs, availability, reviews, media, platform_content_blocks,
    featured_experiences_blocks, featured_experience_items, guests,
    reservations, reservation_guests, reservation_rooms, reservation_extras,
    reservation_charges, reservation_status_history, reservation_cancellations,
    payments, payment_transactions, invoices, invoice_items, check_ins,
    users, user_roles, notifications, audit_logs, event_outbox, event_consumption
    RESTART IDENTITY
    CASCADE;
SQL

echo "== Applying seed"
"${PSQL[@]}" < "$(dirname "$0")/seed.sql"

echo "== Done — seeded:"
"${PSQL[@]}" -c "SELECT 'hotels' t, count(*) FROM hotels
                 UNION ALL SELECT 'room_types', count(*) FROM room_types
                 UNION ALL SELECT 'media', count(*) FROM media
                 UNION ALL SELECT 'experiences', count(*) FROM experiences
                 UNION ALL SELECT 'reviews', count(*) FROM reviews
                 UNION ALL SELECT 'platforms', count(*) FROM platforms
                 UNION ALL SELECT 'users', count(*) FROM users"