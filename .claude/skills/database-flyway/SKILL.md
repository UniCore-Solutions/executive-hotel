---
name: database-flyway
description: Schema, migration and seed conventions for the hotel platform's PostgreSQL database. Use when adding or altering tables/columns/constraints, writing a Flyway migration, changing a JPA entity, or working with seed/demo data.
---

# database-flyway

One PostgreSQL 16 database, `hotel_platform`, owned solely by `backend-hotel`.
**54 tables. Flyway V1 → V22, all applied.** `spring.jpa.hibernate.ddl-auto: validate`.

## Non-negotiables

1. **Flyway owns the schema.** Never `ddl-auto: update`, never `create-drop`.
2. **Applied migrations are immutable.** V1–V22 are in the live database and in
   `flyway_schema_history`. Editing one breaks the checksum and the app will not start.
   Always add `V23__…`.
3. **Entity and schema must match exactly.** `validate` fails startup on drift — this is
   the safety net, so a red boot after a migration means the entity is wrong, not the check.
4. **PostgreSQL only, no H2.** Integration tests use Testcontainers with a real
   `postgres:16.4` image.
5. `database/collection-schema*.sql` is **Oracle-dialect legacy**, never executed, and
   superseded by the Flyway history. `backend-hotel/AGENTS.md` still calls it "the
   existing schema" — that is stale. Ignore it.

## Migration history (what each block established)

| Range | Content |
|---|---|
| V1–V2 | reference data, identity + RBAC |
| V3–V5 | catalog, pricing & promotions, inventory |
| V6–V8 | booking, billing & stay, reviews/notifications/events/audit |
| V9, V17 | outbox publishing status + `updated_at` |
| V10–V11, V14 | seeded reference data, amenity catalog, platform demo |
| V12 | **sparse availability** — a missing row means fully available |
| V13, V19 | platform CMS content, homepage featured flags |
| V15–V16, V18 | totals/extras fixes, room-type inventory enforcement |
| **V20** | **`bigint` → `uuid` identifiers across the schema** |
| **V21** | **EUR → MAD currency conversion** |
| V22 | `room_types.slug` |

## Writing a migration

`src/main/resources/db/migration/V23__short_snake_case.sql`

- Double underscore after the version; description becomes the `flyway_schema_history` row.
- Prefer additive changes. A destructive change needs a data-migration step in the same file.
- Preserve the existing constraint style: FKs, `CHECK`s, partial unique indexes for
  idempotency (e.g. `(provider, provider_reference)`, `reservations.idempotency_key`),
  GiST indexes on price ranges, and capacity triggers.
- IDs are `uuid` since V20. Seed data uses fixed UUIDs of the form
  `00000000-0000-0000-0000-0000000000NN`; roles and amenities are seeded **by migrations**
  with random UUIDs, so the SQL seed joins them **by name**.
- Money columns are `numeric` and map to `BigDecimal`.

Then update the JPA entity in `entity/` to match, and run `./mvnw test` — the
`DatabaseIntegrityIntegrationTest` (26 tests) checks constraints and invariants.

## Seed data

- `backend-hotel/scripts/seed.sql` — 3 hotels, room types, rates, users, CMS content.
- `scripts/start.sh` applies it automatically when `hotels` is empty. Disable with
  `SEED_ON_START=false` or `--no-seed`; skipped entirely under the prod overlay.
- Seed users (all share the password **`admin123`**, verified by logging in against the
  running backend): `admin@ · manager@ · content@ · manager.riad@ · manager.rome@`
  `hotelcollection.test`.
  **The root `README.md` is wrong here** — it claims `password123` and lists
  `analyst@`/`frontdesk@`/`guest@`, none of which exist.
- Legacy pre-UUID seed preserved at `scripts/seed-bigint-legacy.sql.bak`.

**The seeded hotels are Azure Bay Resort (Lisbon), Dar Zellij (Marrakech) and Villa
Aurelia (Rome)** — not the "Executive Hotel, Rabat" of the guest frontend's fixture.

## Inspecting the live database

```bash
docker exec hotel-platform-postgres psql -U hotel_app -d hotel_platform -c "\dt"
docker exec hotel-platform-postgres psql -U hotel_app -d hotel_platform \
  -c "select version, description, success from flyway_schema_history order by installed_rank;"
docker exec hotel-platform-postgres psql -U hotel_app -d hotel_platform \
  -c "select relname, n_live_tup from pg_stat_user_tables order by n_live_tup desc;"
```

Helper scripts: `./scripts/db-migrate.sh` (re-boot to apply pending),
`./scripts/db-reset.sh [--yes]` (**destructive**: drop volume → migrate → seed),
`./scripts/db-backup.sh [--gzip]`, `./scripts/db-restore.sh FILE`.

## Tables that exist but are never written

`permissions`, `role_permissions`, `notification_templates`, `notifications`,
`check_ins`, `event_consumption`, `promotion_eligible_rate_plans`,
`promotion_eligible_room_types`, `rate_restrictions`.

Do not assume a table is wired just because it is modelled. Check for a writer before
building on it — several of these back features that were designed and never finished
(KNOWN_ISSUES §E1).
