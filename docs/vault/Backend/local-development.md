# Backend — Local Development

**Verified against the running stack on 2026-08-28.**

## Non-default ports

| Service | Port |
|---|---|
| Backend API | **8180** (not 8080) |
| PostgreSQL | **5433** on the host (not 5432) |
| Guest site | 3000 |
| Back-office | **3101** |

Assuming the defaults connects you to a different service or nothing at all.

## Running the stack

```bash
make start      # start the full platform
make status     # containers, health, ports
make logs S=backend F=-f
make stop       # stop, data preserved
```

`make help` lists every target. The scripts behind them live in `scripts/`.

The **back-office is profile-gated off** in Docker. Start it explicitly:

```bash
docker compose --profile backoffice up -d backoffice
# or run `npm run dev` inside backoffice-hotel/
```

## Running the backend directly

```bash
JWT_SECRET=$(openssl rand -hex 32) ./mvnw spring-boot:run
```

`JWT_SECRET` is **required and has no default** — see [[Security/authorization-model]].

The default Spring profile is `dev`, which leaves GraphiQL enabled. Deployments must run with
`SPRING_PROFILES_ACTIVE=prod`.

## Health checks

```bash
docker ps --format '{{.Names}}\t{{.Status}}'
curl -s localhost:8180/actuator/health     # {"status":"UP"}
```

## What is not in this repository

Confirmed absent, despite references in older documents: **no gRPC, no email or SMS delivery,
no payment provider integration, and no Kafka consumer.** Kafka runs and an `event_outbox`
table is populated, but nothing in this repository consumes those events.

Do not plan work on the assumption that any of these exist.

## Seed credentials

Seed logins use the password `admin123`. Older README text claiming `password123` is wrong.
These are local seed values only.

## Related notes

- [[Database/schema-and-migrations]]
- [[Testing/test-topology]]
- [[Architecture/system-overview]]
