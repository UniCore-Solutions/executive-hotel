---
name: platform-ops
description: Running, configuring and troubleshooting the hotel platform locally — Docker Compose modes, the scripts/ entry points, ports, environment variables and health checks. Use when starting or debugging the stack, changing compose/env configuration, or wiring service-to-service URLs.
---

# platform-ops

Docker Compose is the only deployment mechanism. **There is no CI/CD, no Kubernetes, no
Terraform, no cloud configuration in this repository.**

## Everything runs through `scripts/`

The `Makefile` is a thin wrapper; the scripts hold all logic.

```bash
./scripts/setup.sh            # creates .env, generates JWT_SECRET + POSTGRES_PASSWORD
./scripts/build.sh            # build all images (~5 min cold)
./scripts/start.sh            # boot, wait for health, auto-seed if `hotels` is empty
./scripts/status.sh           # container + HTTP health matrix
./scripts/logs.sh api         # aliases: db · api · web · admin   (add -f to follow)
./scripts/stop.sh             # data survives in named volumes
./scripts/restart.sh          # reuses the last mode
./scripts/clean.sh [--all]    # --all also removes networks + volumes (DESTRUCTIVE)
./scripts/health.sh           # non-zero exit if anything is unhealthy
```

Database: `db-start · db-stop · db-migrate · db-reset [--yes] · db-backup [--gzip] ·
db-restore FILE`. Tests: see the `platform-testing` skill.

## Modes

`start.sh --dev | (default base) | --prod`. The choice is remembered in `.docker-mode`.

| Mode | Overlay | Behaviour |
|---|---|---|
| `--dev` | `docker-compose.dev.yml` | source bind-mounts; `mvnw spring-boot:run` + `npm run dev`; hot reload |
| base | — | locally built production images, non-root, healthchecks |
| `--prod` | `docker-compose.prod.yml` | Postgres/Kafka host ports unbound, log rotation, **requires an explicit `CORS_ALLOWED_ORIGINS`** |

## Services and ports

| Service | Container | Host port | Note |
|---|---|---|---|
| guest frontend | `hotel-frontend` | **3000** | |
| back-office | `hotel-backoffice` | **3101** | **profile-gated — see below** |
| backend API | `hotel-backend` | **8180** | `/graphql`, `/graphiql` (dev), `/actuator/health` |
| PostgreSQL 16.4 | `hotel-platform-postgres` | **5433** | container-internal 5432 |
| Kafka 3.9.1 (KRaft) | `hotel-platform-kafka` | 9092 | internal `kafka:29092` |

Ports 8180 and 5433 are **deliberate non-defaults** (commits `c808123`, `b0ee81b`) —
another project on this machine uses 8080/5432.

> **The back-office does not start by default.** `docker-compose.yml` gives it
> `profiles: ["backoffice"]` (commit `1e52894`). The root README's quickstart is wrong
> about this. To run it:
> `docker compose --profile backoffice up -d backoffice` — or `npm run dev` in the project.

## Startup dependencies

`backend` waits for **both** `postgres: service_healthy` **and** `kafka: service_healthy`.
Kafka has no consumers anywhere in the codebase, so this is pure startup cost —
but removing it is a deliberate change, not a cleanup (KNOWN_ISSUES §A2).
`frontend` and `backoffice` wait for `backend: service_healthy`.

## Configuration

All of it flows from `.env` (gitignored; `.env.example` is the template).

**Required:** `JWT_SECRET` (≥ 32 bytes — the backend *refuses to start* without a strong
one, and rejects the historic in-repo default), `POSTGRES_PASSWORD`.

The URL wiring is the part that bites:

| Variable | Consumed by | Meaning |
|---|---|---|
| `API_INTERNAL_URL` | frontend **build arg + runtime** | target of the Next rewrite for browser `/graphql` calls. **Baked at build time** — changing it needs a rebuild. |
| `HOTEL_API_URL` | back-office runtime | BFF proxy target, server-side only |
| `MEDIA_BASE_URL` | backend | public media URLs — must be **browser-resolvable**, hence `localhost:8180`, never `backend` |
| `CORS_ALLOWED_ORIGINS` | backend | `*` in dev; the prod overlay requires a real list |
| `NEXT_PUBLIC_*` | frontend build args | all baked into the image at build time |
| `OUTBOX_RELAY_INTERVAL_MS` | backend | outbox poll interval (default 1000) |
| `SEED_ON_START` | `start.sh` | seed when `hotels` is empty; ignored under `--prod` |

Rule of thumb: **anything `NEXT_PUBLIC_*` or `API_INTERNAL_URL` requires an image rebuild,
not a restart.**

Inside the compose network, services address each other by name (`backend:8180`,
`postgres:5432`, `kafka:29092`). From the host, use the mapped ports above.

## Health checks

```bash
docker ps --format '{{.Names}}\t{{.Status}}'
curl -s localhost:8180/actuator/health          # {"status":"UP"}
curl -s localhost:8180/actuator/health/readiness
./scripts/status.sh
```

Exposed actuator endpoints: `health`, `info`, `prometheus` (a Micrometer/Prometheus
registry is on the classpath; nothing scrapes it in this repo).

## Volumes

`postgres_data`, `kafka_data`, `media_data`. `clean.sh` never touches them without
`--all`. `db-reset.sh` drops and rebuilds the database volume — always confirm with the
user first.

## Troubleshooting

- **Port conflict** → override `*_PORT` in `.env`, then `./scripts/restart.sh`.
- **Backend won't start** → almost always `JWT_SECRET` (missing/short/default) or Kafka
  not yet healthy. `./scripts/logs.sh api`.
- **Schema validation failure at boot** → a JPA entity drifted from Flyway. Fix the
  entity or add a migration; never switch `ddl-auto`.
- **Name collisions with `backend-hotel/docker-compose.yml`** (a second, older compose
  file for that project alone) → `start.sh` detects them and prints the exact fix. It
  never deletes that project's volumes.
- **Frontend shows stale config** → rebuild; `NEXT_PUBLIC_*` is baked in.
- **Fresh start** → `./scripts/db-reset.sh --yes`.
