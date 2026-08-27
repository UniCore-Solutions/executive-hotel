# SERVICES

Three deployables, then the backend's internal application services.

---

## Deployable: `backend-hotel`

- **Purpose** — the entire domain: catalog, rates, inventory, booking, billing,
  identity, reviews, media, CMS content, audit. Sole owner of the database.
- **Technology** — Spring Boot 4.1.0, Java 21, Maven wrapper (`./mvnw`).
- **Entry points** — `POST /graphql` (primary), `/graphiql` (dev only),
  `/api/v1/{auth,reservations,payments,media,hotels/*/reviews}` (REST),
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
- **Known problems** — `./mvnw test` is RED (2 ArchUnit violations,
  `StaySearchGraphQLController:48`); Kafka is a hard startup dependency with no consumer;
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
- **Outbound** — same-origin `/graphql` (Next rewrite → `API_INTERNAL_URL`) for
  everything except auth, which calls `:8180/api/v1/auth/*` directly.
- **Auth** — JWT in a module-level variable; **lost on page reload**.
- **Status** — mid-migration. Booking funnel is real; marketing surface is fixtures.
- **Known problems** — see [CURRENT_STATE.md](CURRENT_STATE.md) §Mocked and
  §Partially implemented. `src/app/api/*`, `src/features/`, `src/config/` are **empty
  leftover directories**.

---

## Deployable: `backoffice-hotel` (staff console, :3101)

- **Purpose** — operate the collection: dashboard, hotels/room types/rooms, rate plans
  & prices, promotions, availability, reservations, guests, payments, invoices, reviews
  moderation, users & roles, notifications, audit log.
- **Technology** — Next.js 16 App Router, `@tanstack/react-query`, `graphql-request`.
- **Entry points** — `(auth)/login` + 13 `(backoffice)/*` pages; BFF route handlers
  `/api/auth/{login,me,logout}` and `/api/graphql`.
- **Outbound** — only its own BFF; the BFF calls `HOTEL_API_URL` server-side.
- **Auth** — httpOnly `bo_session` cookie (7 d) holding the backend JWT; the browser
  never sees the token.
- **Status** — **the most complete client.** All 14 pages are wired to real GraphQL.
- **Known problems** — **disabled by default** in Docker (`profiles: ["backoffice"]`);
  `codegen.ts` points at the schema *skeleton*, so `npm run graphql:generate` cannot
  work; several debug scripts (`debug2..6.mjs`, `debug-e2e.mjs`) are committed at the
  project root; uses the `@deprecated` `updateAvailability` mutation.

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
