# CLAUDE.md

Hotel Collection platform — a direct-booking system for a small multi-hotel collection.
Three deployables: a Spring Boot backend, a Next.js guest site, a Next.js back-office.

## Read this first, in this order

1. **[docs/PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md)** — what the system is, the stack,
   the layout. Always.
2. **[docs/CURRENT_STATE.md](docs/CURRENT_STATE.md)** — what works, what is mocked, what is
   broken, and **where development stopped**. Always, before planning any change.
3. Then only what your task needs:
   - [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — layers, API surface, security boundaries, eventing
   - [docs/SERVICES.md](docs/SERVICES.md) — per-service responsibilities and status
   - [docs/DATA_FLOW.md](docs/DATA_FLOW.md) — end-to-end traces (search, quote, booking, auth, outbox)
   - [docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md) — catalogued defects with evidence
   - **[docs/FRONTEND.md](docs/FRONTEND.md)** — deep audit of the guest site: a
     feature-by-feature real/mock matrix, traced user flows, 28 evidenced defects
     (F-1…F-28) with a prioritised fix plan, and the API work each mocked feature needs.
     **Read this before touching `frontend-hotel/`.**
   - [docs/AUTHENTICATION.md](docs/AUTHENTICATION.md) — email/password + Google OAuth2/OIDC
     SSO: the login-grant handoff, the provider abstraction, the account-linking policy, and
     how to add another provider. Read before touching auth in either `backend-hotel/` or
     `frontend-hotel/`.

These files exist so you do **not** need to re-audit the repository. If they answer your
question, trust them and go straight to the relevant source.

## Skills

Invoke with the Skill tool when the task matches:

| Skill | Use for |
|---|---|
| `backend-spring` | anything in `backend-hotel/` — services, controllers, entities, security |
| `graphql-contract` | changing the API: schema files, resolvers, client codegen |
| `database-flyway` | migrations, schema changes, seed data |
| `guest-frontend` | anything in `frontend-hotel/` (pair with docs/FRONTEND.md) |
| `backoffice-frontend` | anything in `backoffice-hotel/` |
| `platform-testing` | running or writing tests across any of the three stacks |
| `platform-ops` | Docker, compose, scripts, environment, the local stack |

## Authoritative vs historical

**Authoritative — believe these:**
- All source code, `application.yaml`, `docker-compose*.yml`, `.env.example`, `scripts/`
- `backend-hotel/src/main/resources/db/migration/` — Flyway is the schema
- `backend-hotel/src/main/resources/graphql/<domain>/*.graphqls` — the API contract
- `backend-hotel/src/test/.../ModuleArchitectureTest.java` — the architecture rules that
  actually run
- The live database and the running backend
- This `docs/` folder

**Historical — do not trust without checking the code:**
- `backend-hotel/AGENTS.md` and `frontend-hotel/AGENTS.md` — **both are materially wrong**
  (they describe package layouts, files and rules that no longer exist). Their *Commands*
  and *Rules* sections are still broadly useful; their *Architecture* and *Key files*
  sections are not. See KNOWN_ISSUES §DOC1.
- `backend-hotel/docs/architecture/architecture.md` and `ADR-008` — describe a hexagonal
  modular monolith that was never built. `ADR-009-layered-architecture.md` (currently
  untracked) is correct.
- `backend-hotel/docs/archive/**` — explicitly historical.
- `docs/archive/**` — the five former root-level reports (`AUDIT_REPORT.md`,
  `CURRENT_STATE_AUDIT.md`, `FULL_AUDIT_REPORT.md`, `INTEGRATION_CHANGELOG.md`,
  `SESSION_HANDOFF.md`). Moved out of the repository root because they read like current
  documentation and are not. Snapshots from earlier commits; several findings are already
  fixed. Useful for *intent*, never for *state*.
- `database/collection-schema*.sql` — Oracle-dialect legacy, never executed.

## Facts that are easy to get wrong

- The architecture is **flat layered** (`controller/service/repository/entity/dto`), not
  hexagonal. An ArchUnit rule bans `api/application/domain/adapter` packages.
- Cross-domain calls go through `service/` **interfaces** — never `service/impl/` or
  another domain's repository. Controllers must touch neither.
- Money is **MAD**. Other currencies are display-only FX.
- Backend port is **8180**, Postgres host port **5433**. Not the defaults.
- **There is no JDK on this machine** (`java` is not on PATH), so `./mvnw` cannot run
  either — it fails with "JAVA_HOME is not defined correctly". Run the backend build in a
  container:
  ```bash
  cd backend-hotel && docker run --rm -v "$PWD":/w -v "$HOME/.m2":/root/.m2 -w /w \
    --network host -e TESTCONTAINERS_HOST_OVERRIDE=localhost \
    -v /var/run/docker.sock:/var/run/docker.sock \
    maven:3.9-eclipse-temurin-21 mvn -B test
  ```
- `/graphql` is `permitAll`, so **admin authorization lives in the services**, via
  `CurrentUserAccessor.requireHotelAccess(hotelId)` / `requireSuperAdmin()`. This is no
  longer a convention you must remember: the `ADMIN_GRAPHQL_READS_ARE_AUTHORIZED` ArchUnit
  rule follows every admin resolver into its service and fails the build if no guard is
  reachable.
- The payment provider is **simulated**. `app.payments.auto-settle-enabled` defaults to
  **false** and the app **refuses to start with it enabled under the `prod` profile**
  (`config/PaymentSafetyConfig`). Dev/QA opt in via `PAYMENT_AUTO_SETTLE_ENABLED=true`.
- The back-office is **profile-gated off** in Docker; start it with
  `docker compose --profile backoffice up -d backoffice` or run `npm run dev` in it.
- There is **no gRPC**, **no email/SMS**, **no payment provider**, and **no Kafka consumer**
  anywhere in this repository.
- The backend does **no currency conversion** — `quote` echoes whatever `currencyCode` the
  client sends onto unconverted MAD figures. Send `MAD`; convert for display only.
- Seed logins are `admin123`, not the README's `password123` (KNOWN_ISSUES §DOC4).

## Verifying an assumption

Cheapest first:

```bash
# Is the stack up?
docker ps --format '{{.Names}}\t{{.Status}}'; curl -s localhost:8180/actuator/health

# Ground-truth the API (backend must be running)
curl -s -X POST localhost:8180/graphql -H 'content-type: application/json' \
  -d '{"query":"{ hotels(input:{page:{page:0,size:5}}){ items{ id name city status } } }"}'

# Ground-truth the data
docker exec hotel-platform-postgres psql -U hotel_app -d hotel_platform \
  -c "select relname, n_live_tup from pg_stat_user_tables order by n_live_tup desc;"

# Is a feature real or a stub? Trace it, don't infer from the name:
#   frontend service → src/graphql/*.graphql → schema .graphqls → controller → service/impl
```

Never conclude "this feature works" from the existence of a UI, a route, a schema field
or a table. Follow the call through to the implementation.

## Working rules

- **Do not commit or push unless asked.** The working tree currently holds ~2 200 lines
  of uncommitted, in-progress integration work — read CURRENT_STATE §Stopping point
  before editing anything it touches, and do not revert or "clean up" those changes.
- Verify before declaring done: backend tests in the Maven container (above); frontends
  `npm run typecheck && npm run lint && npm test`.
  **The backend suite is fully green — 202 tests, 0 failures, all 7 ArchUnit rules**
  (verified 2026-09-01). Guest frontend: `tsc` clean, 0 eslint errors, 85/85 vitest.
  There are no known-failing tests: any failure you see is yours. (An earlier version of
  this file claimed 2 red ArchUnit rules; that was stale and taught contributors to ignore
  a real signal.)
- Schema changes are Flyway-only. Never `ddl-auto: update`; entities must match the
  migrations or the app refuses to start.
- Secrets come from `.env`, which is gitignored. Never hardcode `JWT_SECRET` or passwords.

## Keeping this current

After a change that alters architecture, a service boundary, an integration, or the
real-vs-mocked status of a feature, update the affected `docs/` file in the same change.
Keep entries short and evidence-backed (`file:line`, a command, a query). If a
KNOWN_ISSUES entry is resolved, delete it rather than annotating it.
