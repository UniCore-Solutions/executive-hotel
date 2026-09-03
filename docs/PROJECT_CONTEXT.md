# PROJECT_CONTEXT

> Compressed, factual model of this repository. Verified against source, config, the
> live database and the running backend on **2026-08-27** (branch
> `feature/canonical-single-hotel`).
> Source code and runtime behaviour are authoritative; the `docs/` folders inside each
> sub-project are historical (see [KNOWN_ISSUES.md](KNOWN_ISSUES.md) §Documentation).

## 1. What this is

A **direct-booking single-property hotel platform**: a guest-facing website (browse the
one hotel → check live availability computed from physical room inventory → get a
server-priced quote → book → pay → look up / cancel / check in) plus a staff back-office
(catalog, rates, promotions, inventory, reservations, guests, payments, invoices,
reviews, users, audit).

**The platform operates exactly ONE hotel** (canonical model, V26+V30):
Executive Hotel, Lisbon. Non-canonical hotels were deactivated; `canonicalHotel`
is the enforcing
contract. Room types are sellable categories; physical rooms are the inventory;
reservations consume one unit per room line per night for their exact dates.
See [ARCHITECTURE.md](ARCHITECTURE.md) §8 for the full business model.

Money is denominated in **MAD** (migration `V21__convert_eur_to_mad.sql`); other
currencies are display-only FX conversions applied client-side.

Not a channel manager, not a PMS, no OTA integrations, no real payment provider.

## 2. Repository layout

Polyrepo-in-one-directory. **No workspace/monorepo tooling** — each sub-project has its
own lockfile and is built independently; the root only holds Docker Compose + scripts.

```
/
├── backend-hotel/      Spring Boot 4.1.0 / Java 21 — the only backend, owns the DB
├── frontend-hotel/     Next.js 16 (App Router) — guest site        :3000
├── backoffice-hotel/   Next.js 16 (App Router) — staff console (legacy)     :3101
├── admin-hotel/        Next.js 16 (App Router) — new staff console          :3102
│                       (docs/ADMIN_REBUILD_PROGRESS.md tracks build-out; backoffice-hotel
│                       stays untouched and running until admin-hotel reaches parity)
├── database/           Oracle-dialect legacy schema, READ-ONLY reference, not executed
├── scripts/            bash entry points (setup/build/start/test/db-*)
├── backups/postgres/   gitignored pg_dump output
├── docker-compose{,.dev,.prod}.yml
├── Makefile            thin wrapper over scripts/
└── docs/               ← THIS persistent context (repo-wide, authoritative)
```

## 3. Major technologies (verified from manifests + running containers)

| Layer | Actual |
|---|---|
| Backend | Spring Boot **4.1.0**, Java **21**, Maven wrapper (`./mvnw`; no system `mvn`) |
| API | **GraphQL read-only** (spring-boot-starter-graphql, schema split per domain) + **REST writes** (`/api/v1/**`) — API rule: GraphQL = READ, REST = WRITE/ACTION (see [API_GUIDELINES.md](API_GUIDELINES.md)) |
| Persistence | PostgreSQL **16.4**, Spring Data JPA/Hibernate, `ddl-auto: validate` |
| Migrations | **Flyway V1 → V26**, all applied and green in the live DB |
| Messaging | Apache **Kafka 3.9.1** (KRaft, single node) — **producer only, zero consumers** |
| Auth | bcrypt(12) + **JJWT 0.11.5** HS256, stateless, role+hotel scoping |
| Frontends | **Next.js 16**, React 19, TypeScript 5.9 strict, Tailwind v4, Radix UI, lucide |
| FE data | `graphql-codegen` client preset; guest = **Apollo Client** (reads) + **Axios** (writes via `/api/rest` BFF proxy); back-office = **Apollo Client** (reads) + **Axios** (writes) + `@tanstack/react-query` (mutation lifecycle only) |
| Tests | JUnit 5 + **Testcontainers** + **ArchUnit** (backend); **Vitest** + **Playwright** (both frontends) |
| Deploy | **Docker Compose only.** No CI/CD, no Kubernetes, no Terraform, no cloud config |

## 4. Architecture style

A **layered monolith**, single deployable, single database.

- Backend packages are flat by layer: `controller/ · service/ · service/impl/ ·
  repository/ · entity/ · dto/<domain>/ · mapper/ · security/ · config/ · exception/ ·
  util/ · storage/`. There are **no** per-domain `api/application/domain/adapter`
  packages — an ArchUnit rule actively forbids them.
- "Modules" exist only as a **naming convention**: DTO packages, GraphQL schema files
  and service interfaces are grouped by domain (catalog, rate, reservation, …), and
  cross-domain access must go through `service/` interfaces.
- The `docs/architecture/architecture.md` + `ADR-008` claim of a *hexagonal modular
  monolith* is **wrong**; the working-tree `ADR-009-layered-architecture.md` (untracked)
  supersedes it. See [ARCHITECTURE.md](ARCHITECTURE.md).

## 5. Data stores

- **PostgreSQL** `hotel_platform` — 54 tables, sole store, owned exclusively by
  `backend-hotel`. Neither frontend touches it.
- **Local filesystem** for uploaded media (`MEDIA_STORAGE_PATH`, `media_data` volume),
  behind the `MediaStorageProvider` port. No S3/Cloudinary.
- **Browser `localStorage`** in the guest site for consent, newsletter opt-ins and
  browsing history only.
- **Kafka** topics `hotelcollection.<eventType>.v<n>` — written, never read.

## 6. Communication

```
Browser ──HTTP──► frontend-hotel (Next)
   │                 ├─ /api/graphql (BFF proxy, reads; injects cookie Bearer)
   │                 ├─ /api/rest/... (BFF proxy, writes)
   │                 └─ /api/auth/*   (BFF; httpOnly guest_session cookie)

Browser ──HTTP──► backoffice-hotel (Next BFF)
                     ├─ /api/auth/{login,me,logout}   sets httpOnly `bo_session` cookie
                     ├─ /api/graphql  ──► backend :8180/graphql  (reads, injects Bearer)
                     └─ /api/rest/... ──► backend :8180/api/v1/** (writes, injects Bearer)

backend ──JPA──► PostgreSQL
backend ──outbox table──► OutboxRelay (@Scheduled 1s) ──► Kafka   (nothing consumes)
```

All inter-process calls are **synchronous HTTP/GraphQL**. There is **no gRPC anywhere**
in this repository. Kafka is the only async path and it currently terminates at the broker.

Full traces in [DATA_FLOW.md](DATA_FLOW.md).

## 7. External integrations

**None are live.** Every outbound integration is either absent or a local stand-in:

| Concern | Reality |
|---|---|
| Payment gateway | No PSP. `PaymentServiceImpl` persists real payments and "captures" with a `MOCK-XXXXXXXX` reference. |
| Email | **Real, async, provider-agnostic** (since 2026-09-03) — `EmailEventConsumer` (Kafka) → `NotificationService` → `EmailProviderFactory` → `EmailProvider`. `app.email.provider=simulated` (default) logs and never delivers; `=smtp` delivers through `spring.mail.*` (Gmail's relay is the reference target, config-only — no Gmail dependency in code). See ARCHITECTURE.md §5a. SMS: still no implementation. |
| Media CDN | Local disk only. |
| Image hosts | Fixture images hot-link `images.unsplash.com`, `cf.bstatic.com`, `aw-d.tripcdn.com` (allow-listed in `next.config.ts` CSP). |
| Analytics / chatbot | Feature-flagged off (`NEXT_PUBLIC_ENABLE_*=false`); no vendor code. |

## 8. Deployment model

`docker compose` with three overlays driven by `scripts/start.sh`
(`--dev` bind-mounts + hot reload · base = locally built prod images · `--prod` hardened).
Ports are host-side only and come from `.env`: frontend 3000, back-office 3101,
backend **8180**, Postgres **5433**, Kafka 9092.

The **`backoffice` service is profile-gated** (`profiles: ["backoffice"]`, commit
`1e52894`) and therefore does **not** start with the default `docker compose up` —
despite the root README presenting it as part of the quickstart. **`admin` is not
profile-gated** (commit `0a80d4b`, 2026-09-02) — it starts automatically with the
default stack, alongside `frontend` and `backend`, on port 3102.

Backend boot hard-depends on both Postgres *and* Kafka being healthy.

## 9. Current development state (one paragraph)

The platform is a **canonical single-hotel system** (branch
`feature/canonical-single-hotel`): one active hotel (Executive Hotel, Lisbon), inventory
derived from physical rooms (V26 triggers), availability = physical rooms − reservations
per night (sparse rows), reservations consumed/released transactionally with overbooking
blocked at the database. The guest frontend no longer offers a hotel picker, the index
page renders the canonical property from the backend (no collection section, no fixture
fallbacks), `/hotel` without a `hotelid` redirects to the canonical property, and a new
`canonicalHotel` GraphQL query is the single-property contract. Backend: 152/152 tests
green (including all 5 ArchUnit rules, previously 2 red). Frontend: typecheck/lint/build
clean, 72/72 vitest. Remaining known gaps: no payment provider (mock gateway references),
no email/SMS, no Kafka consumer, the stale Playwright e2e suite still targets the retired
fixture world, and `frontend-hotel/src/data/index.ts` remains as unit-test fixtures plus
the legacy `img()` utility. Details: [CURRENT_STATE.md](CURRENT_STATE.md),
[KNOWN_ISSUES.md](KNOWN_ISSUES.md), [FRONTEND.md](FRONTEND.md).
