# Schema and Migrations

**Verified against the live database on 2026-08-28.**

## Flyway is the schema

Migrations live in `backend-hotel/src/main/resources/db/migration/`. **`V1` through `V30` are
applied** — confirmed by `flyway_schema_history` holding 30 rows in the running database.

Schema changes are **Flyway-only**:

- Never set `ddl-auto: update`. Entities must match the migrations or the application refuses
  to start — that refusal is a feature, not an obstacle.
- Never edit an applied migration. Add a new one.
- The entity classes and the migrations are two representations of one schema; drift between
  them is a startup failure.

## Reading the migration history

The migration names record how the product actually evolved, which is useful context:

| Migration | What it tells you |
|---|---|
| `V1–V8` | Original build-out: reference data, identity/RBAC, catalog, pricing, inventory, booking, billing, reviews |
| `V9`, `V17` | `event_outbox` publishing status — an outbox pattern for eventing |
| `V12` | Sparse availability — availability is stored sparsely, not one row per room per night |
| `V15`, `V16` | Two consecutive fixes to reservation totals involving extras — this arithmetic has been wrong before |
| `V20` | Switch to UUID identifiers |
| `V21` | **EUR converted to MAD** — the system used to run in euros |
| `V23` | Payment idempotency and pending-uniqueness constraints |
| `V26`, `V30` | Collapse onto a single canonical hotel identity |
| `V27` | Provisioned guest accounts |

`V15`/`V16` and `V23` are worth internalising: **reservation totals and payment idempotency
are areas with a history of defects.** Changes there deserve tests before code.

## Live data shape

Top tables by row count in the running database:

```
countries 245 · room_type_amenities 57 · hotel_amenities 56 · media 33
flyway_schema_history 30 · amenities 28 · rate_plan_prices 18
room_type_rate_plans 18 · event_outbox 17 · rooms 13 · extras 12
reviews 12 · users 10 · reservation_charges 10 · payment_transactions 10
```

This is **seed and demo data, not production volume.** Do not infer performance
characteristics from it — 13 rooms and 10 reservations will hide any N+1 query or missing
index. Anything with a plausible scaling concern needs deliberate load thinking, not a
green local run.

## Useful commands

```bash
# Row counts
docker exec hotel-platform-postgres psql -U hotel_app -d hotel_platform \
  -c "select relname, n_live_tup from pg_stat_user_tables order by n_live_tup desc;"

# Applied migrations
docker exec hotel-platform-postgres psql -U hotel_app -d hotel_platform \
  -c "select version, description, success from flyway_schema_history order by installed_rank;"
```

## Ignore `database/`

The repo-root `database/` folder holds Oracle-dialect SQL that has never been executed against
this system. It is dead legacy. PostgreSQL 16 plus Flyway is the real schema.

## Related notes

- [[Architecture/system-overview]] — the single-hotel collapse and the MAD currency rule
- [[Backend/local-development]]
