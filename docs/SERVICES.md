# SERVICES

Three deployables, then the backend's internal application services.

---

## Deployable: `backend-hotel`

- **Purpose** — the entire domain: catalog, rates, inventory, booking, billing,
  identity, reviews, media, CMS content, audit. Sole owner of the database.
- **Technology** — Spring Boot 4.1.0, Java 21, Maven wrapper (`./mvnw`).
- **Entry points** — `POST /graphql` (**read-only**; API rule: GraphQL = READ,
  REST = WRITE/ACTION — see [API_GUIDELINES.md](API_GUIDELINES.md)), `/graphiql` (dev only),
  `/api/v1/{auth,reservations,payments,media,admin,hotels/*/reviews}` (REST — the only write path),
  `/actuator/{health,info,prometheus}`, `/media/**` (static uploads).
- **Database** — PostgreSQL 16 `hotel_platform`, Flyway V1–V22, `ddl-auto: validate`.
- **Inbound** — both frontends over HTTP.
- **Outbound** — PostgreSQL (JPA), Kafka (outbox relay, fire-and-forget), local
  filesystem (media). **No other external calls exist.**
- **Events produced** — `booking.confirmed`, `booking.cancelled`, `payment.created`,
  `payment.captured` → `hotelcollection.<type>.v1`.
- **Events consumed** — none.
- **Auth** — stateless JWT bearer; `/graphql` open at the filter chain, authorization
  inside services.
- **Status** — substantially complete and real.
- **Known problems** — Kafka is a hard startup dependency with no consumer;
  no email; mock payment capture; `stay_x_pay_y` promos throw.

---

## Deployable: `frontend-hotel` (guest site, :3000)

- **Purpose** — public marketing + booking funnel.
- **Technology** — Next.js 16 App Router, React 19, TS strict, Tailwind v4, Radix.
  `output: 'standalone'`.
- **Entry points** — 18 pages: `/`, `/search`, `/hotel`, `/room/[roomId]`, `/offers`,
  `/booking`, `/confirmation`, `/reservation`, `/checkin`, `/account`, `/contact`,
  `/faq`, `/index-2`, plus legal pages.
- **Database** — none.
- **Outbound** — reads: same-origin `/api/graphql` (BFF proxy → `API_INTERNAL_URL`)
  via **Apollo Client**; writes: `/api/rest/...` (BFF proxy) via **Axios**; auth via
  `/api/auth/*` (httpOnly `guest_session` cookie).
- **Auth** — httpOnly cookie held by the BFF; the browser never sees the JWT.
- **Status** — mid-migration. Booking funnel is real; marketing surface is fixtures;
  client reads still route through the typed services seam (GraphQL via the BFF).
- **Known problems** — `src/app/api/{chat,extras,newsletter,offers,reservations,
  rooms,search}/`, `src/features/`, `src/config/` are **empty leftover directories**.

---

## Deployable: `backoffice-hotel` (staff console, :3101)

- **Purpose** — operate the collection: dashboard, hotels/room types/rooms, rate plans
  & prices, promotions, availability, reservations, guests, payments, invoices, reviews
  moderation, users & roles, notifications, audit log.
- **Technology** — Next.js 16 App Router, **Apollo Client** (reads),
  **Axios** (writes), `@tanstack/react-query` (mutation lifecycle only).
- **Entry points** — `(auth)/login` + 13 `(backoffice)/*` pages; BFF route handlers
  `/api/auth/{login,me,logout}`, `/api/graphql` and `/api/rest/[...path]`.
- **Outbound** — only its own BFF; the BFF calls `HOTEL_API_URL` server-side.
- **Auth** — httpOnly `bo_session` cookie (7 d) holding the backend JWT; the browser
  never sees the token.
- **Status** — **the most complete client.** All 14 pages are wired to real GraphQL.
- **Known problems** — **disabled by default** in Docker (`profiles: ["backoffice"]`);
  several debug scripts (`debug2..6.mjs`, `debug-e2e.mjs`) are committed at the
  project root. Being replaced by `admin-hotel/`; left untouched and running until that
  reaches parity.

---

## Deployable: `admin-hotel` (new staff console, :3102)

- **Purpose** — its eventual purpose is the same as `backoffice-hotel`'s, rebuilt with a
  module-first IA, a multi-hotel-ready URL shape (`/hotels/[hotelId]/...`), a shared
  data-table/form architecture and honest empty/error states. See
  `docs/ADMIN_REBUILD_PROGRESS.md` for the live task register.
- **Technology** — Next.js 16 App Router, TS strict, Tailwind v4 (tokens copied from
  `frontend-hotel`), Apollo Client (reads), Axios (writes), react-hook-form + Zod, TanStack
  Table + TanStack Query (mutation lifecycle only).
- **Entry points** — `(auth)/login`, `/hotels` (global list, role-scoped), and under
  `/hotels/[hotelId]/...`: `dashboard`, `reservations`, `room-types` (+ `[id]`), `rooms`,
  `rate-plans` (+ `[id]`), `availability`, `settings`, `guests`, `payments`; BFF route
  handlers `/api/auth/{login,me,logout}`, `/api/graphql`, `/api/rest/[...path]`.
- **Auth** — httpOnly `admin_session` cookie (distinct from the old admin's `bo_session`
  so both can run concurrently), 7 d. Staff-only gate (`STAFF_ROLES`) plus role-filtered
  nav; a single-hotel staff account is auto-routed into their hotel rather than seeing
  the global list.
- **Status** — Foundation, multi-hotel routing/RBAC entry, Dashboard, Reservations, Room
  Types/Rooms, Rate Plans & Pricing, Availability (calendar + block/out-of-order editor),
  Hotel Settings (Profile/Policies/Amenities/Media), and Guests/Payments are all shipped
  and live-verified against the running backend. Not started: Promotions (unblocked now
  that rate plans exist), the `/hotels` search/sort/create polish (E-NAV-2/3/4), and
  Users/Audit/Reviews (E8) — plus the fully backend-blocked modules (Front desk, Extras,
  Content, Invoices, Reports).
- **Known problems** — see `docs/ADMIN_REBUILD_PROGRESS.md`'s "Backend gaps" table for
  the current list (no `cancellationReasons` or `currencies` reference query, no
  admin-side `policies` read field, no admin single-reservation-by-id query, `adminHotels`
  has no server-side search/sort args). The earlier claim that `Payment` has no
  reservation reference was itself stale and has been corrected — it does.
- **Not profile-gated** — starts with the default `docker compose up`, same as
  `frontend` and `backend` (changed 2026-09-02, was `profiles: ["admin"]` before).
  `backoffice-hotel` keeps its separate profile gate.

---

# Backend application services

Interfaces in `service/`, implementations in `service/impl/`. **Cross-domain access must
go through these interfaces** (ArchUnit-enforced).

| Service | Does | Reality |
|---|---|---|
| `AuthService` | login/register, bcrypt verify, JWT issue, `me` | **Real** |
| `IdentityAdminService` | create users, assign/revoke roles (+audit) | **Real** |
| `CatalogQueryService` | hotels, room types, rooms, amenities, extras, FAQs, experiences, restaurants, search & sort | **Real** |
| `CatalogAdminService` | hotel/room-type/room CRUD, amenity & media association (+audit) | **Real** |
| `PricingService` | `quote` — nightly rate resolution, extras, promo, taxes/fees from `tax_fee_types`, totals identity; `rates`, `fromPrice`, `evaluateCancellation` | **Real**, DB-driven. `stay_x_pay_y` promos **throw VALIDATION** |
| `RateQueryService` / `RateAdminService` | rate plans, prices, links, promotions | **Real** |
| `AvailabilityService` | per-night availability + capacity fit | **Real**, sparse model |
| `AvailabilityAdminService` | single-day and range inventory edits (+audit) | **Real** |
| `InventoryService` | `lockAndSell` / `release` — `ensureRow` upsert then `SELECT … FOR UPDATE` over the night range | **Real**, pessimistic locking |
| `BookingService` | create (idempotency key, server-priced snapshot, inventory lock, outbox event), lookup by reference+email, `myReservations`, cancel (penalty + release + event), admin cancel/list | **Real**, the most complete flow |
| `PaymentService` | create (balance & currency validated server-side, overpayment rejected), capture, owner-or-staff IDOR guard | **Real persistence, mock gateway** — capture invents `MOCK-XXXXXXXX` |
| `InvoiceService` | issue invoice + items | **Real** — `invoices` table empty in the live DB (never exercised) |
| `BillingAdminService` | admin payment/invoice listings | **Real** |
| `ReviewService` | create (proof-of-stay via completed `checked_out` reservation), list, moderate | **Real**, but gated on a checkout that the product can never reach — see below |
| `MediaStorageService` / `MediaAdminService` / `MediaQueryService` | upload/delete/serve behind `MediaStorageProvider` | **Real**, local filesystem only |
| `HomepageService` | curated featured hotels/room types/experiences/reviews from DB flags | **Real** |
| `PlatformService` | hero + featured-experience CMS blocks by platform slug | **Real** |
| `AdminDashboardService` | arrivals/departures/in-house/occupancy/revenue aggregation | **Real** |
| `AuditService` | writes `audit_logs` on every admin mutation | **Real** (table empty only because no admin writes have run here) |
| `NotificationQueryService` | **read-only** listing of `notifications` | **Dead read path** — nothing in the codebase ever writes a `Notification` |
| `ReferenceQueryService` | countries, currencies, cancellation reasons, tax/fee types | **Real** |
| `EventPublisher` → `OutboxEventPublisher` | writes `event_outbox` inside the business transaction | **Real** |
| `OutboxPublisher` → `KafkaOutboxPublisher` + `OutboxRelay` | claim → publish → settle, stale-claim recovery | **Real bus, no consumer** |
| `GuestProvisioningService` | links guest records to user accounts | **Real** |

### Two service-level traps worth knowing

1. **`NotificationQueryService` has no writer.** `notifications` and
   `notification_templates` are never inserted into by any code path. The back-office
   notifications page will always be empty.
2. **`ReviewService` proof-of-stay is unreachable.** It requires a reservation in
   `checked_out` status; the only status transitions implemented are
   `→ confirmed` (create) and `→ cancelled` (cancel). There is no check-in or check-out
   mutation, so no reservation can ever reach `checked_out` through the product.
