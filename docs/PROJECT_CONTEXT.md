# PROJECT_CONTEXT

> Compressed, factual model of this repository. Verified against source, config, the
> live database and the running backend on **2026-08-27** (HEAD `82c4414` + a large
> uncommitted working tree — see [CURRENT_STATE.md](CURRENT_STATE.md)).
> Source code and runtime behaviour are authoritative; the `docs/` folders inside each
> sub-project are historical (see [KNOWN_ISSUES.md](KNOWN_ISSUES.md) §Documentation).

## 1. What this is

A **direct-booking hotel platform** for a small multi-hotel collection: a guest-facing
website (browse hotels → check live availability → get a server-priced quote → book →
pay → look up / cancel / check in) plus a staff back-office (catalog, rates, promotions,
inventory, reservations, guests, payments, invoices, reviews, users, audit).

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
├── backoffice-hotel/   Next.js 16 (App Router) — staff console     :3101
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
| API | **GraphQL primary** (spring-boot-starter-graphql, schema split per domain) + a small REST surface |
| Persistence | PostgreSQL **16.4**, Spring Data JPA/Hibernate, `ddl-auto: validate` |
| Migrations | **Flyway V1 → V22**, all applied and green in the live DB |
| Messaging | Apache **Kafka 3.9.1** (KRaft, single node) — **producer only, zero consumers** |
| Auth | bcrypt(12) + **JJWT 0.11.5** HS256, stateless, role+hotel scoping |
| Frontends | **Next.js 16**, React 19, TypeScript 5.9 strict, Tailwind v4, Radix UI, lucide |
| FE data | `graphql-codegen` client preset; guest = hand-rolled fetch client, back-office = `@tanstack/react-query` + `graphql-request` |
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
   │                 └─ /graphql rewrite ──► backend :8180/graphql
   └─ direct fetch to :8180/api/v1/auth/*        (REST, login/register)

Browser ──HTTP──► backoffice-hotel (Next BFF)
                     ├─ /api/auth/{login,me,logout}   sets httpOnly `bo_session` cookie
                     └─ /api/graphql  ──► backend :8180/graphql  (injects Bearer)

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
| Email / SMS | **No implementation at all** — no `JavaMailSender`, no provider, no SMTP config. `notifications` / `notification_templates` tables are never written. |
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
despite the root README presenting it as part of the quickstart.

Backend boot hard-depends on both Postgres *and* Kafka being healthy.

## 9. Current development state (one paragraph)

The backend is substantially complete and real. The back-office is fully wired to it.
The guest frontend is mid-migration from static fixtures to the live API: auth,
reservations, payment, pricing/quote, search, availability and the booking/confirmation/
account flows are done; the marketing surface (home, `/hotel` without a `hotelid`,
`/index-2`, header/footer/FAQ/offers copy) still renders `src/data/index.ts` fixtures
describing a hotel ("Executive Hotel", Rabat) that **does not exist in the database**
(the seed has Azure Bay Resort / Dar Zellij / Villa Aurelia). Work stopped mid-stream:
a ~2.2k-line change set is uncommitted, and `./mvnw test` is **red** on two ArchUnit
rules. Details and evidence: [CURRENT_STATE.md](CURRENT_STATE.md),
[KNOWN_ISSUES.md](KNOWN_ISSUES.md).
