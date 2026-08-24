---
name: database-schema
description: Conventions for the Hotel Collection hotel database schema — collection-schema-v2.sql and DATABASE_SCHEMA_V2.md. Use when editing the database schema, adding tables/columns, writing migrations, or reviewing schema docs for the hotel platform.
---

# Database Schema (Hotel Collection)

## Files of truth

- `database/collection-schema-v2.sql` — the v2.0 multi-domain schema (authoritative DDL)
- `docs/DATABASE_SCHEMA_V2.md` — changelog + rationale for v2.0 (keep in sync with the SQL)
- `docs/DATABASE_SCHEMA.md` — v1.1 legacy doc; do not edit, new changes go to the v2 files

## Core model decisions (never regress)

1. **Domain scope** — `domains` is the top-level brand scope; `hotels.domain_id` is NOT NULL. Hotel-scoped tables inherit the domain through `hotels` — never add a parallel `domain_id` column to hotel-scoped tables.
2. **Room model — three distinct concepts, never a fourth:**
   - `room_types` = bookable category (commercial)
   - `rooms` = physical units (operational state only; never counted for sellability)
   - `availability` = (room_type, stay_date) sellable counts — the ONLY inventory table. Never create `room_inventory` or any second inventory/rooms concept.
3. **No translation tables** — `languages` is a plain reference table. Content is authored once in the platform's primary language.
4. **Service-like concepts stay separate:**
   - `hotel_services` = hotel-level offerings (breakfast, dinner, airport transfer, parking)
   - `experiences` = curated activities (spa, excursions)
   - `extras` = bookable add-ons snapshotted on `reservation_extras`
     Do not merge them or add a fourth overlapping table.
5. **Hotel rules** — meal availability flags and check-in/check-out rules go in `hotel_configurations` (typed key/value: config_key/config_value/value_type). Base times stay on `hotels`.
6. **Pricing snapshots** — `reservation_rooms.rate_per_night`, `reservation_extras.unit_price`, `reservation_charges.amount` snapshot values at booking time; later catalog edits must never rewrite a past reservation.
7. **Media is polymorphic** — one `media` table (entity_type + entity_id). Never add per-entity image tables.

## DDL conventions

- PK: `BIGSERIAL PRIMARY KEY`; timestamps: `created_at`/`updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`
- Money: `NUMERIC(10,2)`; countries `CHAR(2)` / currencies `CHAR(3)` referencing `countries`/`currencies`
- Status columns: `VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN (...))` with explicit enum
- Index every FK used for lookup (`idx_<table>_<column>` naming)
- UNIQUE on natural keys (e.g. `(hotel_id, room_number)`, `(hotel_id, code)`)
- Comments explain the _why_ (e.g. concurrency guards, snapshot semantics), not the what

## Seed-data rule

Any example data in comments must match `.opencode/skills/hotel-project-facts`:
domain `The Hotel Collection`, hotel `Executive Boutique Hotel Rabat`, room types
`superior-double-or-twin` (1050 MAD) / `double-or-twin` (910 MAD) /
`executive-suite` (1550 MAD), rate plans `bb` / `ro` / `hb`.

## Workflow

1. Edit the SQL first — the doc follows the code.
2. Update `docs/DATABASE_SCHEMA_V2.md` sections A (what changed) and F (relationships) whenever tables are added/removed.
3. New tables land in the correct numbered section; additive changes only — nothing existing is renamed, retyped, or removed.
4. Migrations: the platform is pre-launch, so direct DDL edits are fine. **Once deployed, all changes go through versioned migrations** and the doc tracks them chronologically.
5. Verify: every FK target exists, indexes cover new FK columns, CHECK ranges are sensible, and no duplicate concepts were introduced (see section "Core model decisions").
