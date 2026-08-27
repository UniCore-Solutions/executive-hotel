# ARCHITECTURE (as implemented)

> Everything below was read out of source, config or the running system.
> Where the repo's own docs disagree, the disagreement is recorded explicitly.

## 1. Shape

**Layered monolith. One deployable backend, one database, two Next.js clients.**

```
┌─────────────────────┐        ┌──────────────────────┐
│  frontend-hotel     │        │  backoffice-hotel    │
│  Next 16 :3000      │        │  Next 16 :3101       │
│  guests, public     │        │  staff, auth-walled  │
└──────────┬──────────┘        └──────────┬───────────┘
           │ /graphql (next rewrite)      │ /api/graphql (BFF route handler)
           │ /api/v1/auth/* (direct REST) │ /api/auth/*   (BFF, httpOnly cookie)
           └───────────────┬──────────────┘
                           ▼
              ┌────────────────────────────┐
              │  backend-hotel :8180       │
              │  Spring Boot 4 / Java 21   │
              │  GraphQL + narrow REST     │
              └────┬──────────────────┬────┘
                   │ JPA              │ INSERT event_outbox (same tx)
                   ▼                  ▼
          ┌──────────────┐    ┌──────────────────┐
          │ PostgreSQL16 │    │  OutboxRelay     │ @Scheduled 1s
          │ 54 tables    │    │  claim→publish   │
          └──────────────┘    └────────┬─────────┘
                                       ▼
                              ┌──────────────────┐
                              │ Kafka (KRaft)    │  ⚠ NO CONSUMERS
                              └──────────────────┘
```

## 2. Backend internal structure

`com.hotelcollection.hotel` — **257 Java files**, flat layer packages:

| Package | Responsibility | Gate |
|---|---|---|
| `controller/` | 11 GraphQL `@Controller` + 6 REST `@RestController`. Thin. | must not touch `repository/` or `service/impl/` |
| `service/` | 28 use-case **interfaces** — the only legal cross-domain seam | — |
| `service/impl/` | 29 implementations: domain logic, orchestration, authorization, transactions | ≤ 11 constructor deps |
| `repository/` | 36 Spring Data JPA repositories | reachable only from `service/..` |
| `entity/` | 55 JPA entity/enum types, mirror the Flyway schema 1:1 | `ddl-auto: validate` fails the app on drift |
| `dto/<domain>/` | 66 GraphQL/REST input & view **records**, grouped into 13 domain packages | — |
| `security/` | `SecurityConfig`, `JwtService`, `JwtAuthFilter`, `AuthRateLimitFilter`, `TraceIdFilter`, `CurrentUser(Accessor)` | — |
| `config/`, `exception/`, `mapper/`, `util/`, `storage/` | cross-cutting | — |

Enforced by `src/test/java/.../architecture/ModuleArchitectureTest.java` (**5** ArchUnit
rules, not 7 as `backend-hotel/AGENTS.md` claims):

1. `NO_LEGACY_HEXAGONAL_PACKAGES` — bans `..api..`, `..application..`, `..domain..`, `..adapter..`
2. `IMPLEMENTATIONS_ARE_ONLY_ACCESSED_FROM_SERVICES`
3. `REPOSITORIES_ARE_ONLY_ACCESSED_FROM_SERVICES` — **currently RED**
4. `CONTROLLERS_DELEGATE_TO_SERVICES` — **currently RED**
5. `SERVICES_ARE_NOT_GOD_CLASSES` (≤ 11 ctor deps)

> **Documented vs implemented — the biggest trap in this repo.**
> `backend-hotel/docs/architecture/architecture.md`, `ADR-008-modular-monolith.md` and
> `backend-hotel/AGENTS.md` all describe a *hexagonal modular monolith* with per-domain
> `admin/ audit/ availability/ …` packages each containing `api/application/domain/adapter`.
> **That layout does not exist and rule 1 forbids it.** The untracked
> `ADR-009-layered-architecture.md` (in the working tree) is the accurate description.

## 3. API surface

### GraphQL — primary (`POST /graphql`, GraphiQL at `/graphiql` in `dev` only)

Schema is **split per domain** under `src/main/resources/graphql/<domain>/*.graphqls`.
`schema.graphqls` at the root is only a skeleton: `schema { … }`, the `LocalDate` /
`DateTime` scalars and empty `type Query` / `type Mutation` that every module `extend`s.

| Domain | Queries | Mutations |
|---|---|---|
| catalog | `hotels · hotel · hotelDetails · roomType · roomTypes · experiences · restaurants · extras · faqs · adminHotel · adminHotels · adminAmenities` | `createHotel · updateHotel · setHotelAmenities · setHotelMedia · createRoomType · updateRoomType · setRoomTypeAmenities · setRoomTypeMedia · createRoom · updateRoom` |
| homepage | `homepage` | — |
| availability | `availability · staySearch` | `updateAvailability` *(@deprecated)* · `updateAvailabilityRange` |
| rate | `offers · rates · quote · adminPromotions` | `createRatePlan · updateRatePlan · linkRoomTypeRatePlan · unlinkRoomTypeRatePlan · setRatePlanPrices · createPromotion · updatePromotion · setPromotionStatus` |
| reservation | `myReservations · reservation · adminReservations · adminGuests` | `createReservation · cancelReservation · adminCancelReservation` |
| billing | `adminPayments · adminInvoices` | `createPayment · capturePayment · issueInvoice` |
| identity | `me · adminUsers · adminRoles` | `login · register · createUser · assignRole · revokeRole` |
| review | `reviews · adminReviews` | `createReview · moderateReview` |
| platform / notification / audit / admin | `platform · adminNotifications · adminAuditLogs · adminDashboard` | — |
| media | *(none — REST only)* | *(none)* |

### REST — deliberate, narrow splits

| Route | Auth | Why REST |
|---|---|---|
| `POST /api/v1/auth/{login,register}` | public (rate-limited) | token bootstrap |
| `POST /api/v1/reservations`, `…/{ref}/cancel`, `…/{ref}/invoice` | public | anonymous reference+email self-service |
| `POST /api/v1/media/upload`, `DELETE /api/v1/media/{id}` | authenticated | multipart, unsuited to GraphQL |
| `POST /api/v1/payments`, `…/{id}/capture` | authenticated | — |
| `POST /api/v1/hotels/{hotelId}/reviews` | authenticated | — |
| `GET /actuator/{health,info,prometheus}` | public | ops |

Uniform error envelope (`ApiError`) with codes `NOT_FOUND · FORBIDDEN · CONFLICT ·
VALIDATION · UNAUTHORIZED`, emitted from both the REST advice
(`GlobalExceptionHandler`) and the GraphQL advice (`GraphqlExceptionHandler`), and even
from filter-level 401/403/429 via `ErrorResponseWriter`.

## 4. Security boundaries

- **Stateless.** `SessionCreationPolicy.STATELESS`, CSRF disabled, bearer-token only.
- **`/graphql` is `permitAll` at the filter chain.** Authorization is enforced *inside*
  application services via `CurrentUserAccessor.require()` + `actor.hasRole("super_admin")
  || actor.inHotel(hotelId)` — an IDOR yields `403`, not `200`. This is deliberate
  (documented in `SecurityConfig`) but means **every new admin resolver must add its own
  scope check** — there is no declarative guard to fall back on.
- **JWT**: HS256, claims `sub · email · roles · hotels · type=access`, TTL from
  `JWT_TTL_MINUTES` (60). `JwtService` refuses to construct if `JWT_SECRET` is missing,
  `< 32 bytes`, or equals the historic in-repo default → the app fails fast at startup.
- **Passwords**: BCrypt strength 12.
- **Rate limiting**: `AuthRateLimitFilter` in front of the auth endpoints.
- **RBAC is role-name based.** The `permissions` / `role_permissions` tables exist and
  are **empty**, and the `Permission` entity has **no repository and no usages** — dead.
- **CORS**: origins from `CORS_ALLOWED_ORIGINS` (default `*`); methods GET/POST/OPTIONS;
  headers `Authorization`, `Content-Type`; credentials never allowed.

### The two clients authenticate differently

| | frontend-hotel (guest) | backoffice-hotel (staff) |
|---|---|---|
| Login call | direct REST `POST :8180/api/v1/auth/login` | BFF `POST /api/auth/login` → GraphQL `login` |
| Token storage | **module-level JS variable** (`let _token`) | **httpOnly `bo_session` cookie**, 7 days |
| Survives refresh | **No** — session is lost on reload | Yes |
| Token reaches browser | Yes (in JS memory, XSS-reachable) | No |
| Sends token | `Authorization` header added by `graphqlClient.ts` | server-side only, injected by `/api/graphql` |

`restoreSession()` exists in `frontend-hotel/src/services/auth.ts` but is **never called**
— the wiring was left unfinished.

## 5. Eventing (implemented, then dead-ends)

Textbook transactional outbox, correctly built:

- `OutboxEventPublisher` (`@Transactional(MANDATORY)`) writes `event_outbox` in the
  *same* transaction as the business change — an event can never exist without its fact.
- `OutboxRelay` (`@Scheduled fixedDelay=${app.outbox.relay-interval-ms:1000}`) claims a
  batch in its **own** transaction (`pending → publishing`, `attempts+1`) and **commits
  before** publishing, so Kafka I/O never runs inside a DB transaction; a second
  transaction records the outcome. `releaseStaleClaims` (30 s, 5-min window) recovers
  crashes; `maxAttempts` (5) bounds retries.
- `KafkaOutboxPublisher` sends synchronously with a 10 s `get()` per envelope.
- Topic = `hotelcollection.<eventType>.v<version>`.

**Event types published (exhaustive): `booking.confirmed`, `booking.cancelled`,
`payment.created`, `payment.captured`.**

**There is not a single `@KafkaListener` in the repository**, and `event_consumption`
(the idempotent-consumer table) has never been written. Kafka is nonetheless a
**hard startup dependency** of the backend container (`depends_on: kafka: service_healthy`).

## 6. Frontend architectures

### frontend-hotel (guest)
- App Router, mostly **Server Components** for shell/metadata + client components for
  interactive flows. `output: 'standalone'`.
- **No route handlers.** `src/app/api/{auth,chat,extras,newsletter,offers,reservations,
  rooms,search}/` are **empty leftover directories** from an abandoned BFF plan. So are
  `src/features/` and `src/config/`.
- Browser → same-origin `/graphql`, proxied by a `next.config.ts` rewrite to
  `API_INTERNAL_URL` (**baked at build time**). Server components fetch the backend
  directly. Both paths go through `src/services/graphqlClient.ts` (`cache: 'no-store'`).
- Auth is the exception: it bypasses the proxy and calls `:8180/api/v1/auth/*` directly.
- Contexts: `SearchContext` (stay params, URL-driven), `SessionContext`, `ToastContext`,
  `ModalContext`. Rule from the codebase: **the URL is the state** for search params.
- Strict CSP + security headers set in `next.config.ts`.

### backoffice-hotel (staff)
- A genuine **BFF**: every backend call is proxied through
  `src/app/api/graphql/route.ts`, which reads the httpOnly cookie and injects the bearer.
  The browser never sees the token and never learns the backend URL (`HOTEL_API_URL`).
- Route groups `(auth)/login` and `(backoffice)/*` (14 pages, all real GraphQL CRUD).
- Client data fetching via `@tanstack/react-query` + `proxyRequest`; server via
  `serverRequest`.

## 7. Infrastructure

- `docker-compose.yml` (base, prod-shaped images) + `.dev.yml` (bind mounts, `mvnw
  spring-boot:run` / `npm run dev`) + `.prod.yml` (ports unbound, log rotation, requires
  explicit `CORS_ALLOWED_ORIGINS`). Selected mode persisted in `.docker-mode`.
- Named volumes `postgres_data`, `kafka_data`, `media_data`. `clean.sh` never removes
  volumes unless `--all`.
- Healthchecks on all five services; backend gates on Postgres **and** Kafka.
- **No CI/CD pipeline, no Kubernetes manifests, no Terraform, no cloud provider config
  exists in this repository.** Quality gates run only via `scripts/test.sh` / `make test`.

## 8. Planned-but-not-implemented (do not mistake for architecture)

| Claimed by | Claim | Reality |
|---|---|---|
| ADR-008, `architecture.md`, backend `AGENTS.md` | hexagonal modular monolith | flat layered; hexagonal packages banned by ArchUnit |
| ADR-003 / ADR-004 | Cloudinary media / Resend email | both correctly marked **"proposed (pending approval)"** — neither implemented; listed here so they are not mistaken for current design |
| backend `AGENTS.md` | `EmailProvider` / `PaymentProvider` ports | neither interface exists |
| ADR-002 / `events-design.md` | event-driven consumers | producer only |
| root `README.md` | back-office in the default stack | profile-gated off |
| `database/collection-schema*.sql` | the schema | never executed; Flyway V1–V22 is the schema |
