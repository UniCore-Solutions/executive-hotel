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
- **Database** — PostgreSQL 16 `hotel_platform`, Flyway V1–V36, `ddl-auto: validate`.
- **Inbound** — both frontends over HTTP.
- **Outbound** — PostgreSQL (JPA), Kafka (outbox relay producer + the email consumer),
  local filesystem (media, documents), SMTP when `app.email.provider=smtp` (off by
  default — see below). **No other external calls exist.**
- **Events produced** — `booking.created`, `booking.confirmed`, `booking.cancelled`,
  `payment.created`, `payment.captured`, `payment.failed`, `payment.refunded`,
  `user.registered` → `hotelcollection.<type>.v1`.
- **Events consumed** — `booking.confirmed`, `booking.cancelled`, `payment.refunded`,
  `payment.failed`, `user.registered`, by `EmailEventConsumer` (the first
  `@KafkaListener` in this codebase) → `NotificationService`, which renders a
  Thymeleaf template and sends through whichever `EmailProvider` is configured
  (`SimulatedEmailProvider` by default; `SmtpEmailProvider` — a generic SMTP adapter,
  Gmail-compatible via config only — when `app.email.provider=smtp`). Idempotent via
  the previously-unused `event_consumption` table, keyed per email type so one event's
  several emails (e.g. booking.confirmed → confirmation + invoice) retry independently;
  retry/backoff + a `<topic>.DLT` dead-letter topic via `KafkaConsumerConfig`.
- **Auth** — stateless JWT bearer; `/graphql` open at the filter chain, authorization
  inside services.
- **Status** — substantially complete and real.
- **Known problems** — mock payment capture; `stay_x_pay_y` promos throw; no OTP/email-
  verification flow exists anywhere in the app (the email architecture can deliver an
  OTP the moment one does — see the class comment on `NotificationService`).

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
- **Entry points** — `(auth)/login`, `/hotels` (global list, role-scoped), `/users` and
  `/audit` (global, `super_admin`-only), `/platform/settings` (global, `super_admin`-only),
  and under `/hotels/[hotelId]/...`: `dashboard`, `reservations`, `room-types` (+ `[id]`,
  merged with the former `rooms` route), `rate-plans` (+ `[id]`), `promotions`,
  `availability`, `settings`, `guests`, `payments`, `invoices`, `reviews`; BFF route
  handlers `/api/auth/{login,me,logout}`, `/api/graphql`, `/api/rest/[...path]`.
- **Auth** — httpOnly `admin_session` cookie (distinct from the old admin's `bo_session`
  so both can run concurrently), 7 d. Staff-only gate (`STAFF_ROLES`) plus role-filtered
  nav; a single-hotel staff account is auto-routed into their hotel rather than seeing
  the global list.
- **Status** — Foundation, multi-hotel routing/RBAC entry, Dashboard, Reservations, Room
  Types/Rooms, Rate Plans & Pricing, Promotions, Availability (calendar + block/
  out-of-order editor), Hotel Settings (Profile/Policies/Amenities/Media),
  Guests/Payments/Invoices, Users & Roles, Audit Log, and Reviews moderation are all
  shipped and live-verified against the running backend. Not started: the `/hotels`
  server-side search/sort/paginate polish (E-NAV-3/4), and three genuinely
  backend-blocked modules — Extras admin write, Content/CMS beyond the `Platform` brand
  entity, and Reports (see `docs/ADMIN_REBUILD_PROGRESS.md`'s "Epics E9 (remainder)").
- **Known problems** — see `docs/ADMIN_REBUILD_PROGRESS.md`'s "Backend gaps" table for
  the current list (no `cancellationReasons` or `currencies` reference query, no
  admin-side `policies` read field, no admin single-reservation-by-id query, `adminHotels`
  has no server-side search/sort args, no per-item promotion eligibility fields, no
  `AdminUser` deactivate endpoint, `AuditLogEntry.metadata` resolves to a stringified Java
  `Map` rather than JSON). The earlier claim that `Payment` has no reservation reference
  was itself stale and has been corrected — it does.
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
| `NotificationQueryService` | **read-only** listing of `notifications` for the back-office | **Real** — no longer dead; `NotificationService` (below) is a real writer |
| `NotificationService` | Renders + sends every outbound email (welcome, booking confirmation, invoice, cancellation, refund, payment-failed) via `EmailProviderFactory`; writes one `notifications` row per send. Premium, branded HTML templates (`templates/email/*.html` + shared `fragments/layout.html`), fed a resolved `EmailTheme` (real hotel name/logo/contact, fixed brand palette) + a per-type `*EmailData` record — see ARCHITECTURE.md §5b | **Real** — called only from `EmailEventConsumer`, never from a business service directly |
| `EmailProviderFactory` → `EmailProviderFactoryImpl` | Resolves the configured `EmailProvider` (`SimulatedEmailProvider` / `SmtpEmailProvider`) from `app.email.provider`; fails fast at startup if misconfigured | **Real** |
| `ReferenceQueryService` | countries, currencies, cancellation reasons, tax/fee types | **Real** |
| `EventPublisher` → `OutboxEventPublisher` | writes `event_outbox` inside the business transaction | **Real** |
| `OutboxPublisher` → `KafkaOutboxPublisher` + `OutboxRelay` | claim → publish → settle, stale-claim recovery | **Real bus** — `EmailEventConsumer` is the first (and so far only) consumer |
| `GuestProvisioningService` | links guest records to user accounts | **Real** |

### One service-level trap worth knowing

**`ReviewService` proof-of-stay is unreachable from the guest side.** It requires a
reservation in `checked_out` status; that transition exists now (staff-driven check-in/
check-out, `admin-hotel`), but only when staff actually check a guest out through the
admin console — no guest-facing or date-triggered path reaches it.
