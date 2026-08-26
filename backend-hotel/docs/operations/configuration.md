# Configuration

All configuration is environment-driven. Secrets come **only** from
environment variables — never from committed files. `.env.example` at the
repo root documents every variable; copy it to `.env` locally (never
committed, see `.gitignore`).

## Environment variables

| Variable | Required | Default | Used for |
|---|---|---|---|
| `JWT_SECRET` | **yes** | — | JWT signing secret. The app **fails to start** without it; `JwtService` rejects secrets < 32 bytes or equal to the historic default. Generate: `openssl rand -hex 32` |
| `JWT_TTL_MINUTES` | no | `60` | access-token lifetime |
| `POSTGRES_HOST` / `POSTGRES_PORT` / `POSTGRES_DB` | no | `localhost` / `5432` / `hotel_platform` | datasource |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` | no | `postgres` / `postgres` | datasource (dev defaults; real deployments must set them) |
| `KAFKA_BOOTSTRAP` | no | `localhost:9092` | Kafka bootstrap servers |
| `MEDIA_STORAGE_PATH` | no | `./data/media` | local filesystem media root (gitignored) |
| `MEDIA_BASE_URL` | no | `http://localhost:8180` | public base URL for media reads |
| `OUTBOX_RELAY_INTERVAL_MS` | no | `1000` | outbox relay poll interval |
| `CORS_ALLOWED_ORIGINS` | no | `*` | comma-separated allowed browser origins (pin real origins in production) |

## Spring profiles

| Profile | Activation | Behavior |
|---|---|---|
| `dev` (default) | none needed | GraphiQL on (`application-dev.yaml`), dev-friendly defaults |
| `test` | test runtime | test overrides (rate limiter off by default, test JWT secret) |
| `prod` | `SPRING_PROFILES_ACTIVE=prod` | GraphiQL off, fail-fast `JWT_SECRET` check — **deployments MUST set this** |

## Key non-env settings (in `application.yaml`)

- `spring.jpa.hibernate.ddl-auto: validate` — entity/schema drift fails boot.
- `spring.jpa.open-in-view: false` — explicit fetching required for graph edges.
- `spring.graphql.graphiql.enabled` — off by default; on only in `dev`.
- `server.shutdown: graceful` — graceful shutdown on SIGTERM.
- `management.endpoints.web.exposure.include: health,info,prometheus` —
  health probes (`/actuator/health/readiness|/liveness`) and metrics are
  public; `show-details: never`; everything else deny-all.
- `app.security.auth-rate-limit-enabled` (in test yaml / test annotations) —
  per-IP 20/min limit on auth operations (REST + GraphQL); on by default.
- Multipart limits: 10 MB file / 12 MB request.

## Media storage

Local filesystem behind the `MediaStorageProvider` port (root
`MEDIA_STORAGE_PATH`, gitignored `data/media/`). S3-compatible object
storage is a future implementation behind the same port — no config change
surface beyond this property today.