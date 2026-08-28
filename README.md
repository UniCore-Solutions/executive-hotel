# The Hotel Collection — Docker Platform

One-command Dockerization of the full platform:

| Service | Source | URL | Container |
|---|---|---|---|
| Guest frontend (Next.js) | `frontend-hotel/` | http://localhost:3000 | `hotel-frontend` |
| Back-office (Next.js) | `backoffice-hotel/` | http://localhost:3101/login · **profile-gated: start with `docker compose --profile backoffice up -d backoffice`** | `hotel-backoffice` |
| Backend API (Spring Boot) | `backend-hotel/` | GraphQL reads at http://localhost:8180/graphql · REST writes at `/api/v1/**` · GraphiQL at `/graphiql` | `hotel-backend` |
| PostgreSQL 16 | — | localhost:5433 (`POSTGRES_USER/PASSWORD/DB` from `.env`) | `hotel-platform-postgres` |
| Kafka (KRaft) | — | localhost:9092 (external), `kafka:29092` (internal) | `hotel-platform-kafka` |

> **API rule:** GraphQL = READ, REST = WRITE/ACTION. The GraphQL schema has no
> Mutation root; every state change goes through `/api/v1/**`. See
> `docs/API_GUIDELINES.md`.

## Quickstart

```bash
./scripts/setup.sh        # checks Docker + creates .env with generated secrets
./scripts/build.sh        # build all images (~5 min first time)
./scripts/start.sh        # boot stack, wait for health, auto-seed if DB empty
./scripts/status.sh       # container + HTTP health matrix
```

Open http://localhost:3000 (guest site) and http://localhost:3101/login (back-office).

Stop everything with `./scripts/stop.sh` — data persists in named volumes.

## Modes

`start.sh --dev | (default base) | --prod`. The chosen mode is remembered by `restart.sh`.

| Mode | Overlay | Behavior |
|---|---|---|
| `--dev` | `docker-compose.dev.yml` | Source bind-mounts; backend runs `mvnw spring-boot:run`, frontends `npm run dev`; hot reload |
| base | — | Production images from local builds |
| `--prod` | `docker-compose.prod.yml` | Postgres/Kafka ports unbound; log rotation; requires `CORS_ALLOWED_ORIGINS` |

`./scripts/clean.sh` removes containers/images (never volumes). Add `--all` for networks+volumes too — **destructive**.

## Database

Flyway migrations (V1–V20) apply automatically on backend start. If `hotels` is empty on first boot, `start.sh` applies `backend-hotel/scripts/seed.sql` (3 hotels, rooms, rates, users, CMS content). Disable with `SEED_ON_START=false` or `--no-seed`.

```bash
./scripts/db-status.sh    # Flyway state + row counts      (alias: db-migrate)
./scripts/db-reset.sh     # DROP volume → migrate → seed   (--yes to skip prompt)
./scripts/db-backup.sh    # backups/postgres/backup-TIMESTAMP.sql[.gz]
./scripts/db-restore.sh FILE [--yes]
```

Seed users all share password `admin123` (e.g. `admin@hotelcollection.test`, `manager@hotelcollection.test`).
Roles and amenities are seeded **by migrations** (random UUIDs); the SQL seed joins them by name and uses fixed UUIDs (`00000000-…-NNNNNNNNNNNN`) elsewhere.

The legacy bigint-era seed is preserved at `backend-hotel/scripts/seed-bigint-legacy.sql.bak`.

## Configuration

All config flows through `.env` (see `.env.example`). Required: `JWT_SECRET`, `POSTGRES_PASSWORD`. Ports (`FRONTEND_PORT`, `BACKOFFICE_PORT`, `BACKEND_PORT`, `POSTGRES_HOST_PORT`, `KAFKA_HOST_PORT`) are host-side only — change freely without touching code.

Frontend browser calls go to same-origin `/api/graphql` (reads) and `/api/rest/...`
(writes) — BFF route handlers that inject the httpOnly session cookie's Bearer and
forward to `API_INTERNAL_URL` (**baked at build time** — set as build arg when
deploying elsewhere). Server-side rendering talks straight to `http://backend:8180/graphql`
inside the network.

Cross-machine: everything binds `0.0.0.0`; access other PCs via `http://<LAN-IP>:3000` etc. For browser access from other machines, add their origin to `CORS_ALLOWED_ORIGINS` or serve through a reverse proxy.

## Tests & quality

```bash
./scripts/test.sh          # backend mvn test + both frontends (lint/test) + e2e smoke
./scripts/test.sh --backend --e2e    # subset flags available
./scripts/lint.sh          # lint only
```

## Troubleshooting

- **Port conflicts** → override `*_PORT` in `.env`, then `./scripts/restart.sh`.
- **Leftover containers from `backend-hotel/docker-compose.yml`** → `start.sh` detects name collisions and tells you the exact fix; it never deletes that project's volumes.
- **Backend logs** → `./scripts/logs.sh api` (aliases: `db`, `api`, `web`, `admin`).
- **Fresh start** → `./scripts/db-reset.sh --yes` rebuilds schema+seed in place.
