# Complete Application Audit Report

**Date:** 2026-08-26
**Scope:** Full codebase — backend-hotel, frontend-hotel, backoffice-hotel, database, infrastructure

---

## A. Executive Summary

The Hotel Collection platform is a **multi-hotel booking system** consisting of:
- **backend-hotel**: Spring Boot 4.1.0 (Java 21) modular monolith with GraphQL + REST APIs, PostgreSQL 16, Kafka, Flyway migrations
- **frontend-hotel**: Next.js 16.3 guest-facing frontend
- **backoffice-hotel**: Next.js 16.3 admin/back-office console
- **Infrastructure**: Docker Compose with PostgreSQL, Kafka, 3 app containers

### Current State

The **backend is substantially complete** — 28 services, 36 repositories, 42 entities, 22 Flyway migrations, 11 GraphQL resolvers, 6 REST controllers, comprehensive integration tests with Testcontainers. The **backoffice is 100% integrated** with the backend via GraphQL — every screen performs real CRUD operations.

The **guest frontend is the critical gap**. It operates in a hybrid dual-mode architecture: ~40% is connected to the real GraphQL backend (search, hotel listing, platform content, homepage, quote/pricing), while the remaining ~60% uses localStorage-based mock services (authentication, reservations, payments, newsletter, consent, site search, cancellation evaluation, activity tracking). The mock services were ported from a static HTML prototype (`hotel-html`) and have never been replaced with real backend integrations.

### Major Findings

| Category | Status |
|----------|--------|
| Backend services & business logic | **Complete** — all 28 services fully implemented |
| Backend data model | **Complete** — 42 entities, 22 migrations, UUID PKs |
| Backend security | **Good** — JWT auth, IDOR protection, query depth limiting; minor gaps in declarative authorization |
| Backoffice integration | **Complete** — 100% real GraphQL, zero mocks |
| Guest frontend integration | **~40% complete** — critical auth/reservation/payment flows are mocked |
| Database | **Complete** — PostgreSQL 16, Flyway V1-V22, comprehensive constraints |
| Infrastructure | **Solid** — Docker Compose, dev/prod overlays, health checks; no CI/CD |
| Testing | **Good backend coverage** (18 test files, Testcontainers); **thin backoffice** (1 unit test) |

---

## B. Feature Status Matrix

| Feature | Frontend UI | Frontend API | Backend API | Backend Service | Database | Real/Mock | Status |
|---------|------------|-------------|-------------|----------------|----------|-----------|--------|
| Hotel listing | ✅ | ✅ GraphQL | ✅ | ✅ CatalogQueryService | ✅ hotels | REAL | Complete |
| Hotel details | ✅ | ✅ GraphQL | ✅ | ✅ CatalogQueryService | ✅ | REAL | Complete |
| Room types | ✅ | ✅ GraphQL | ✅ | ✅ CatalogQueryService | ✅ room_types | REAL | Complete |
| Amenities | ✅ | ✅ GraphQL | ✅ | ✅ CatalogQueryService | ✅ amenities | REAL | Complete |
| Experiences | ✅ | ✅ GraphQL | ✅ | ✅ CatalogQueryService | ✅ experiences | REAL | Complete |
| Restaurants | ✅ | ✅ GraphQL | ✅ | ✅ CatalogQueryService | ✅ restaurants | REAL | Complete |
| Media/gallery | ✅ | ✅ GraphQL | ✅ | ✅ MediaQueryService | ✅ media | REAL | Complete |
| FAQs | ✅ | ✅ GraphQL | ✅ | ✅ CatalogQueryService | ✅ faqs | REAL | Complete |
| Extras | ✅ | ✅ GraphQL | ✅ | ✅ CatalogQueryService | ✅ extras | REAL | Complete |
| Homepage | ✅ | ✅ GraphQL | ✅ | ✅ HomepageService | ✅ | REAL | Complete |
| Search (destination/dates/guests) | ✅ | ✅ GraphQL | ✅ | ✅ StaySearchGraphQLController | ✅ | REAL | Complete |
| Availability check | ✅ | ✅ GraphQL | ✅ | ✅ AvailabilityService | ✅ availability | REAL | Complete |
| Pricing/rates | ✅ | ✅ GraphQL | ✅ | ✅ PricingService | ✅ rate_plan_prices | REAL | Complete |
| Quote (server-side) | ✅ | ✅ GraphQL | ✅ | ✅ PricingService.quote() | ✅ | REAL | Complete |
| Promo codes (frontend display) | ✅ | ✅ GraphQL | ✅ | ✅ PricingService | ✅ promotions | REAL | Complete |
| **Authentication (frontend)** | ✅ | ❌ localStorage | ✅ REST + GraphQL | ✅ AuthService | ✅ users | **MOCK** | **Broken** |
| **Reservations (frontend create)** | ✅ | ❌ localStorage | ✅ REST + GraphQL | ✅ BookingService | ✅ reservations | **MOCK** | **Broken** |
| **Reservation lookup (frontend)** | ✅ | ❌ localStorage | ✅ GraphQL | ✅ BookingService | ✅ | **MOCK** | **Broken** |
| **Reservation cancellation (frontend)** | ✅ | ❌ localStorage | ✅ GraphQL | ✅ BookingService | ✅ | **MOCK** | **Broken** |
| **Payment (frontend)** | ✅ | ❌ fake delay | ✅ REST | ✅ PaymentService (mock capture) | ✅ payments | **MOCK** | **Broken** |
| **Cancellation evaluation** | ✅ | ❌ hardcoded | ✅ | ✅ PricingService | ✅ | **MOCK** | **Broken** |
| **Newsletter** | ✅ | ❌ localStorage | N/A | N/A | N/A | **MOCK** | Not backend-integrated |
| **Consent (GDPR)** | ✅ | ❌ localStorage | N/A | N/A | N/A | **CLIENT-ONLY** | No backend |
| **Activity tracking** | ✅ | ❌ localStorage | N/A | N/A | N/A | **CLIENT-ONLY** | No backend |
| **Site search** | ✅ | ❌ hardcoded | N/A | N/A | N/A | **MOCK** | Searches fixture data |
| **QR code generation** | ✅ | N/A | N/A | N/A | N/A | **DEMO** | Deterministic fake |
| Admin dashboard | ✅ | ✅ GraphQL | ✅ | ✅ AdminDashboardService | ✅ | REAL | Complete |
| Admin hotel CRUD | ✅ | ✅ GraphQL | ✅ | ✅ CatalogAdminService | ✅ | REAL | Complete |
| Admin room type CRUD | ✅ | ✅ GraphQL | ✅ | ✅ CatalogAdminService | ✅ | REAL | Complete |
| Admin room CRUD | ✅ | ✅ GraphQL | ✅ | ✅ CatalogAdminService | ✅ | REAL | Complete |
| Admin rate plan CRUD | ✅ | ✅ GraphQL | ✅ | ✅ RateAdminService | ✅ | REAL | Complete |
| Admin availability | ✅ | ✅ GraphQL | ✅ | ✅ AvailabilityAdminService | ✅ | REAL | Complete |
| Admin reservations | ✅ | ✅ GraphQL | ✅ | ✅ ReservationAdminService | ✅ | REAL | Complete |
| Admin users/roles | ✅ | ✅ GraphQL | ✅ | ✅ IdentityAdminService | ✅ | REAL | Complete |
| Admin payments (view) | ✅ | ✅ GraphQL | ✅ | ✅ BillingAdminService | ✅ | REAL | Complete |
| Admin invoices (view) | ✅ | ✅ GraphQL | ✅ | ✅ BillingAdminService | ✅ | REAL | Complete |
| Admin promotions | ✅ | ✅ GraphQL | ✅ | ✅ RateAdminService | ✅ | REAL | Complete |
| Admin reviews | ✅ | ✅ GraphQL | ✅ | ✅ ReviewService | ✅ | REAL | Complete |
| Admin notifications (view) | ✅ | ✅ GraphQL | ✅ | ✅ NotificationQueryService | ✅ | REAL | Complete |
| Admin audit log | ✅ | ✅ GraphQL | ✅ | ✅ AuditService | ✅ | REAL | Complete |
| Kafka events | N/A | N/A | ✅ | ✅ OutboxEventPublisher | ✅ event_outbox | REAL | Complete |
| Invoice generation | N/A | N/A | ✅ | ✅ InvoiceService | ✅ invoices | REAL | Complete |

---

## C. Complete Mock Data Inventory

| # | Location | File | Mock Behavior | What It Should Use | Severity | Fix |
|---|----------|------|---------------|-------------------|----------|-----|
| 1 | Frontend | `services/auth.ts` | All auth in localStorage (login, register, session, password reset). Seeds demo user. | Backend REST `/api/v1/auth/login`, `/api/v1/auth/register` + JWT | **P0** | Replace with backend JWT auth |
| 2 | Frontend | `services/reservations.ts` | Full reservation CRUD in localStorage. Generates refs locally. Seeds 2 demo reservations. | Backend GraphQL `createReservation`, `myReservations`, `cancelReservation` | **P0** | Replace with backend BookingService |
| 3 | Frontend | `services/payment.ts` | Simulated card charge with 1.6s delay. Cards ending in '1' decline. | Backend REST `/api/v1/payments` + PaymentService | **P0** | Replace with backend PaymentService (still mock capture, but real persistence) |
| 4 | Frontend | `services/cancellation.ts` | Fee calculation against hardcoded `DATA.PROPERTY` room prices. | Backend GraphQL `quote` with cancellation evaluation | **P1** | Use backend PricingService |
| 5 | Frontend | `services/siteSearch.ts` | Searches hardcoded `DATA.PROPERTY` rooms/offers/FAQ/restaurants/experiences. | Backend GraphQL `staySearch` | **P1** | Remove; search is already connected |
| 6 | Frontend | `services/pricing.ts` | Client-side pricing engine. Real logic but no backend calls. | Backend GraphQL `quote` (server-side pricing) | **P1** | Remove; quote is already connected |
| 7 | Frontend | `services/newsletter.ts` | localStorage subscriber list. | No backend exists. | **P3** | Either implement backend or remove |
| 8 | Frontend | `services/consent.ts` | localStorage GDPR consent state. | No backend exists. | **P3** | Acceptable as client-only if no legal requirement for persistence |
| 9 | Frontend | `services/activity.ts` | localStorage browsing history (recent searches, rooms). | No backend exists. | **P3** | Acceptable as client-only UX enhancement |
| 10 | Frontend | `data/index.ts` | 641-line file: hardcoded hotel, rooms (3), offers (5), extras (5), demo reservations (2), gallery, reviews, FAQ, restaurants, experiences, facilities, policies. | Backend GraphQL queries (already exist). | **P0** | Remove fixture dependency for backend-connected sections |
| 11 | Frontend | `context/SessionContext.tsx` | Wraps localStorage auth service. | Backend JWT session via `me` query. | **P0** | Replace with backend auth |
| 12 | Frontend | `lib/qr.ts` | Deterministic fake QR code (visual only, not scannable). | Real QR code library or backend generation. | **P3** | Replace with `qrcode` npm package |
| 13 | Frontend | `services/pricing.ts` | Client-side promo code evaluation (percentage, fixed, stay_x_pay_y). | Backend GraphQL `quote` already evaluates promos. | **P1** | Remove client-side promo logic |
| 14 | Frontend | `components/booking/BookingFlow.tsx` | "(mock hold)" timer, "(mock) declines" payment. | Real hold timer + real payment API. | **P0** | Replace with real APIs |
| 15 | Frontend | `components/booking/ReservationFlow.tsx` | "(mock)" QR display. | Real reservation lookup + QR. | **P1** | Use backend reservation data |
| 16 | Frontend | `components/booking/CheckinFlow.tsx` | "Stored only for this demo" ID document. | Real check-in API. | **P2** | Implement or remove feature |
| 17 | Frontend | `components/account/AccountFlow.tsx` | Demo email autofill, demo credentials displayed in UI. | Real auth flow. | **P0** | Remove demo UI, use real auth |
| 18 | Frontend | `lib/format.ts` | Hardcoded FX rates (MAD=1, EUR=0.091, USD=0.1, GBP=0.078). | Dynamic FX rates or config from backend. | **P2** | Acceptable if currency is stable |
| 19 | Backend | `PaymentServiceImpl` | `capture()` generates `"MOCK-" + UUID` provider reference. No real gateway. | Real payment gateway (Stripe, Adyen, etc.) | **P1** | Implement real gateway behind `PaymentProvider` interface |
| 20 | Backend | `MediaStorageServiceImpl` | Local filesystem storage (`./data/media/`). | S3/Cloudinary via `MediaStorageProvider` interface. | **P2** | Implement S3 provider for production |
| 21 | Frontend | `.env.example` | `NEXT_PUBLIC_USE_MOCK_SERVICES=false` documented but never read in code. | Should toggle mock vs real behavior. | **P2** | Either wire up or remove |
| 22 | Frontend | Homepage page.tsx | 3-level fallback chain: backend -> featured -> fixture `P.experiences/reviews`. | Backend-only data. | **P1** | Remove fixture fallbacks |
| 23 | Frontend | Hotel page.tsx | Falls back to `HotelLegacyPage` (entirely static) when no `hotelid` param. | Always require hotel ID. | **P1** | Remove legacy mode |

---

## D. Service/Module Inventory

### Backend Services (28 interfaces + 29 implementations)

| Service | Responsibility | Dependencies | Data Owned/Used | Status | Problems |
|---------|---------------|-------------|-----------------|--------|----------|
| **AuthService** | Register, login, me | UserRepository, GuestProvisioningService, JwtService | users, guests | Complete | No refresh token |
| **BookingService** | Create, cancel, lookup reservations | PricingService, InventoryService, GuestRepository, EventPublisher | reservations, reservation_rooms, reservation_guests, reservation_extras, reservation_charges, reservation_status_history | Complete | — |
| **PricingService** | Quote calculation, price lookup, cancellation evaluation | RoomTypeRatePlanRepository, RatePlanPriceRepository, PromotionRepository, TaxFeeTypeRepository | rate_plan_prices, promotions, tax_fee_types | Complete | — |
| **AvailabilityService** | Check availability, range queries | AvailabilityRepository, RoomTypeRatePlanRepository | availability | Complete | — |
| **InventoryService** | Lock-and-sell, release inventory | AvailabilityRepository | availability | Complete | — |
| **PaymentService** | Create, capture payments | PaymentRepository, ReservationRepository | payments, payment_transactions | **Mock capture** | No real gateway integration |
| **InvoiceService** | Generate invoices with line items | InvoiceRepository, InvoiceItemRepository, ReservationRepository | invoices, invoice_items | Complete | — |
| **ReviewService** | Create, moderate reviews | ReviewRepository, ReservationRepository | reviews | Complete | — |
| **CatalogQueryService** | Hotel/room type search, batch loaders | HotelRepository, RoomTypeRepository, MediaRepository, AmenityRepository, ExperienceRepository, RestaurantRepository, FaqRepository, ExtraRepository | hotels, room_types, amenities, media, experiences, restaurants, faqs, extras | Complete | — |
| **CatalogAdminService** | Hotel/room type/room CRUD, amenities, media | HotelRepository, RoomTypeRepository, RoomRepository, AmenityRepository, MediaRepository | hotels, room_types, rooms, amenities, media | Complete | — |
| **RateAdminService** | Rate plan CRUD, promotions, prices | RatePlanRepository, RoomTypeRatePlanRepository, RatePlanPriceRepository, PromotionRepository | rate_plans, room_type_rate_plans, rate_plan_prices, promotions | Complete | — |
| **RateQueryService** | Offers, rate plans, promotions, min prices | RoomTypeRatePlanRepository, RatePlanPriceRepository, PromotionRepository | room_type_rate_plans, rate_plan_prices, promotions | Complete | — |
| **AvailabilityAdminService** | Update availability inventory | AvailabilityRepository, RoomTypeRatePlanRepository | availability | Complete | — |
| **ReservationAdminService** | Guest search, arrival/departure counts | GuestRepository, ReservationRepository, RoomRepository | guests, reservations, rooms | Complete | — |
| **BillingAdminService** | Payment/invoice listing, revenue sums | PaymentRepository, InvoiceRepository | payments, invoices | Complete | — |
| **IdentityAdminService** | User CRUD, role assignment | UserRepository, RoleRepository, UserRoleRepository | users, roles, user_roles | Complete | — |
| **AdminDashboardService** | KPI aggregation, workspace data | Multiple repositories | Cross-aggregate | Complete | — |
| **MediaStorageService** | Upload/delete media files | MediaStorageProvider, MediaRepository | media | **Local FS only** | No cloud storage |
| **MediaQueryService** | Media batch loaders | MediaRepository | media | Complete | — |
| **MediaAdminService** | Replace hotel/room type media | MediaRepository | media | Complete | — |
| **PlatformService** | Platform content blocks | PlatformRepository, ContentBlockRepository | platforms, platform_content_blocks, hero_blocks | Complete | — |
| **HomepageService** | Featured sections | HotelRepository, RoomTypeRepository, ExperienceRepository, ReviewRepository | Cross-aggregate | Complete | — |
| **GuestProvisioningService** | Auto-provision guest on register | GuestRepository | guests | Complete | — |
| **NotificationQueryService** | Notification listing | NotificationRepository | notifications | **Read-only** | No send/dispatch logic |
| **AuditService** | Audit log write/read | AuditLogRepository | audit_logs | **Partial** | Not called by all services |
| **ReferenceQueryService** | Currency/tax fee type lookups | CurrencyRepository, TaxFeeTypeRepository | currencies, tax_fee_types | Complete | — |
| **EventPublisher** | Write events to outbox | EventOutboxRepository | event_outbox | Complete | — |
| **OutboxPublisher** | Publish outbox to Kafka | KafkaTemplate | event_outbox, Kafka topics | Complete | — |

### Frontend Services (22 files)

| Service | Responsibility | Status | Issues |
|---------|---------------|--------|--------|
| `graphqlClient.ts` | Core GraphQL HTTP client | **Real** | — |
| `catalog.ts` | Hotel search, availability, rates, room types | **Real** | — |
| `homepage.ts` | Featured sections | **Real** with empty fallback | Falls back to empty arrays on error |
| `platform.ts` | Platform identity/hero | **Real** with empty fallback | Falls back to nulls on error |
| `hotelList.ts` | Hotel listing | **Real** | — |
| `quote.ts` | Server-side pricing | **Real** | — |
| `extras.ts` | Extras listing | **Real** | — |
| `pricingHydration.ts` | Hydrate promo/extras catalogs | **Real** | — |
| `auth.ts` | Login, register, session | **MOCK** (localStorage) | **P0** |
| `reservations.ts` | Reservation CRUD | **MOCK** (localStorage) | **P0** |
| `payment.ts` | Card charge | **MOCK** (fake delay) | **P0** |
| `cancellation.ts` | Cancellation fee calc | **MOCK** (hardcoded prices) | **P1** |
| `siteSearch.ts` | Search hardcoded data | **MOCK** | **P1** |
| `pricing.ts` | Client-side pricing engine | **CLIENT-SIDE** | **P1** |
| `newsletter.ts` | Newsletter subscribers | **MOCK** (localStorage) | **P3** |
| `consent.ts` | GDPR consent | **CLIENT-ONLY** | **P3** |
| `activity.ts` | Browsing history | **CLIENT-ONLY** | **P3** |
| `availability.ts` | Filter/sort helpers only | **Cleaned** | — |

### Backoffice Services (16 files)

| Service | Responsibility | Status |
|---------|---------------|--------|
| `lib/api.ts` | GraphQL client (server + proxy) | **Real** |
| `lib/session.ts` | Cookie-based JWT session | **Real** |
| `lib/format.ts` | Number/date formatting | **Real** |
| All 16 GraphQL operation files | Queries + mutations | **Real** |
| All API routes (`/api/auth/*`, `/api/graphql`) | BFF proxy + auth | **Real** |

### Assessment of Service Boundaries

The **backend service architecture is well-structured** as a modular monolith. Modules are:
- `catalog` — hotel/room type/room CRUD + queries
- `rate` — rate plans, prices, promotions
- `availability` — inventory management
- `reservation` — booking lifecycle
- `billing` — payments, invoices
- `identity` — users, roles, auth
- `media` — file upload/delete
- `review` — reviews + moderation
- `platform` — content blocks
- `admin` — dashboard aggregation
- `notification` — templates + dispatch
- `audit` — audit logging
- `eventing` — outbox + Kafka

**Problems identified:**
- No service for `experiences`, `restaurants`, or `extras` management — these are handled by `CatalogAdminService` which is becoming a kitchen-sink
- `NotificationQueryService` is read-only; there's no `NotificationDispatchService` for sending
- The backoffice has no dedicated service layer — it's a thin GraphQL client directly calling the backend

---

## E. Domain/Data Model Assessment

### Entities Implemented (42 JPA entities mapped to 22 Flyway migrations)

| Domain | Entities | Completeness | Notes |
|--------|----------|-------------|-------|
| Hotels | Hotel, RoomType, Room, Amenity | Complete | Comprehensive fields, composite FK integrity (C1) |
| Catalog | Experience, Restaurant, Faq, Extra, Media | Complete | Typed media owners (C4), comprehensive |
| Pricing | RatePlan, RoomTypeRatePlan, RatePlanPrice, RateRestriction, Promotion | Complete | Overlap prevention (C2), currency pinning (C8) |
| Inventory | Availability | Complete | Sparse model (C9), optimistic locking |
| Booking | Reservation, ReservationRoom, ReservationGuest, ReservationExtra, ReservationCharge, ReservationCancellation, ReservationStatusHistory, CheckIn | Complete | Full lifecycle, totals identity (C16) |
| Billing | Payment, PaymentTransaction, Invoice, InvoiceItem | Complete | Provider idempotency (C17) |
| Identity | User, Role, Permission, UserRole | Complete | Hotel-scoped roles, partial unique index |
| Reference | Country, Currency, Language, CancellationReason, TaxFeeType | Complete | — |
| Platform | Platform, PlatformContentBlock, HeroBlock, FeaturedExperiencesBlock, FeaturedExperienceItem | Complete | Typed content blocks |
| Events | EventOutbox, EventConsumption | Complete | Transactional outbox pattern |
| System | Notification, NotificationTemplate, AuditLog, Review | Complete | Review moderation, audit logging |

### Missing Data/Relationships

| Domain | Problem | Missing Data | Recommended Change | Priority |
|--------|---------|-------------|-------------------|----------|
| Users | No password expiry or rotation tracking | `password_changed_at`, `failed_login_count`, `locked_until` | Add security fields to users table | P2 |
| Hotels | No timezone field | `timezone` | Add timezone for proper date handling across regions | P2 |
| Reservations | No `special_requests` field on reservation | Free-text special requests | Add `special_requests TEXT` to reservations | P2 |
| Rooms | `total_inventory` lives on room_type, not tracked per room type rate plan | No room-type-level inventory visibility for different rate plans | Acceptable — inventory is per room_type | — |
| Payments | No refund entity — refund is a status on Payment | Refund details (amount, reason, processed date) | Consider adding `refund_amount`, `refund_reason` or a refund sub-entity | P2 |
| Guests | No loyalty program integration | Loyalty tier, points, membership number | No evidence this is needed — omit | — |
| Reviews | No photos/media attachments | Review images | No evidence this is needed — omit | — |
| Notifications | No dispatch implementation | Email/SMS sending logic | Add `NotificationDispatchService` with provider abstraction | P1 |
| Experiences | No booking/reservation link | Cannot book experiences as part of a stay | No evidence this is needed for current scope | — |
| Currency | FX rates are hardcoded in frontend | Dynamic rates | Acceptable if rates are stable for the target market | P3 |

### Model Quality Issues

| Issue | Details | Severity |
|-------|---------|----------|
| `collection-schema-postgresql.sql` diverges from actual schema | The reference file still uses BIGINT PKs; V20 migration converted to UUID. The file is stale. | P2 |
| `hotels.config` is JSONB with no schema | Feature flags stored as unstructured JSON | P3 |
| `availability.total_inventory` is not on the Room entity | Inventory is per room_type, not per physical room. Physical rooms are operational only. | By design (C9) |
| No soft-delete pattern | All deletions are hard deletes (except status flags) | P3 |
| `tax_fee_types` calculation is per-stay, not per-night for percentage | Percentage taxes are applied to room subtotal, not per-night. This is correct for most tax regimes. | — |

---

## F. End-to-End Flow Matrix

| Flow | UI | API | Backend Service | Database | End-to-End? | Problems |
|------|----|----|----------------|----------|-------------|----------|
| Hotel listing | ✅ SearchBar + hotelList page | ✅ GraphQL HotelList | ✅ CatalogQueryService | ✅ hotels | **YES** | — |
| Hotel detail | ✅ HotelDetail page | ✅ GraphQL HotelById | ✅ CatalogQueryService | ✅ hotels, room_types, media | **YES** | Falls back to fixture when no hotelid |
| Search (dates/guests/destination) | ✅ SearchBar, DestinationPicker, Calendar, GuestsPanel | ✅ GraphQL StaySearch | ✅ StaySearchGraphQLController | ✅ hotels, availability, rate_plan_prices | **YES** | — |
| Availability check | ✅ SearchResults | ✅ GraphQL StayAvailability | ✅ AvailabilityService | ✅ availability | **YES** | — |
| Rate/price display | ✅ SearchResults, room cards | ✅ GraphQL StayRates + Quote | ✅ PricingService | ✅ rate_plan_prices | **YES** | — |
| Server-side quote | ✅ BookingFlow, QuoteTable | ✅ GraphQL Quote | ✅ PricingService.quote() | ✅ rate_plan_prices, promotions, tax_fee_types | **YES** | — |
| **Authentication** | ✅ AccountFlow | ❌ localStorage | ❌ Mock auth service | ❌ localStorage | **NO** | **P0: Must wire to backend JWT** |
| **Create reservation** | ✅ BookingFlow | ❌ localStorage | ❌ Mock reservation store | ❌ localStorage | **NO** | **P0: Must wire to backend BookingService** |
| **View reservations** | ✅ ReservationFlow | ❌ localStorage | ❌ Mock reservation store | ❌ localStorage | **NO** | **P0: Must wire to backend** |
| **Cancel reservation** | ✅ ReservationFlow | ❌ localStorage | ❌ Mock reservation store | ❌ localStorage | **NO** | **P0: Must wire to backend** |
| **Payment** | ✅ BookingFlow | ❌ fake delay | ❌ Mock charge function | ❌ nothing | **NO** | **P0: Must wire to backend PaymentService** |
| **Cancellation fee** | ✅ ReservationFlow | ❌ hardcoded | ❌ Mock pricing | ❌ hardcoded | **NO** | **P1: Use backend quote** |
| **Newsletter** | ✅ NewsletterForm | ❌ localStorage | N/A | N/A | **CLIENT-ONLY** | **P3** |
| Admin dashboard | ✅ dashboard page | ✅ GraphQL AdminDashboard | ✅ AdminDashboardService | ✅ cross-aggregate | **YES** | — |
| Admin hotel CRUD | ✅ hotels pages | ✅ GraphQL mutations | ✅ CatalogAdminService | ✅ hotels | **YES** | — |
| Admin room type CRUD | ✅ room-types-tab | ✅ GraphQL mutations | ✅ CatalogAdminService | ✅ room_types | **YES** | — |
| Admin room CRUD | ✅ rooms-tab | ✅ GraphQL mutations | ✅ CatalogAdminService | ✅ rooms | **YES** | — |
| Admin rate plan CRUD | ✅ rate-plans-tab | ✅ GraphQL mutations | ✅ RateAdminService | ✅ rate_plans | **YES** | — |
| Admin availability | ✅ availability-tab | ✅ GraphQL mutations | ✅ AvailabilityAdminService | ✅ availability | **YES** | — |
| Admin reservation cancel | ✅ reservations page | ✅ GraphQL mutation | ✅ BookingService | ✅ reservations | **YES** | — |
| Admin user/role mgmt | ✅ users page | ✅ GraphQL mutations | ✅ IdentityAdminService | ✅ users, roles | **YES** | — |
| Admin review moderation | ✅ reviews page | ✅ GraphQL mutation | ✅ ReviewService | ✅ reviews | **YES** | — |
| Admin promotions | ✅ promotions page | ✅ GraphQL mutations | ✅ RateAdminService | ✅ promotions | **YES** | — |
| Kafka event publishing | N/A | N/A | ✅ OutboxEventPublisher + KafkaOutboxPublisher | ✅ event_outbox → Kafka | **YES** | No consumers in this codebase |
| Invoice generation | N/A | ✅ REST | ✅ InvoiceService | ✅ invoices | **YES** | — |

---

## G. Critical Findings

### P0 — Blocking

**G1: Guest frontend authentication is entirely mocked (localStorage)**
- **Problem:** Login, register, session, password reset all use `localStorage`. No JWT token is ever sent to the backend. Users cannot authenticate with the real backend.
- **Evidence:** `frontend-hotel/src/services/auth.ts` — entire file is mock. `context/SessionContext.tsx` wraps the mock service.
- **Files:** `src/services/auth.ts`, `src/context/SessionContext.tsx`, `src/components/account/AccountFlow.tsx`
- **Impact:** No real user identity. Cannot create real reservations. Cannot access "My Reservations". Session is lost on browser clear.
- **Fix:** Replace localStorage auth with backend REST endpoints (`/api/v1/auth/login`, `/api/v1/auth/register`). Store JWT in httpOnly cookie or in-memory. Implement `me` query for session refresh.
- **Dependencies:** Backend auth endpoints already exist and are tested.

**G2: Guest frontend reservations are entirely mocked (localStorage)**
- **Problem:** Reservation creation, listing, lookup, cancellation all use `localStorage`. Demo reservations are seeded. No data is persisted to the backend.
- **Evidence:** `frontend-hotel/src/services/reservations.ts` — "port of mock.js". Seeds `DEMO_RESERVATIONS` from `data/index.ts`.
- **Files:** `src/services/reservations.ts`, `src/components/booking/BookingFlow.tsx`, `src/components/booking/ReservationFlow.tsx`
- **Impact:** No real bookings are ever created. The entire booking funnel is a simulation.
- **Fix:** Replace localStorage CRUD with GraphQL mutations (`createReservation`, `cancelReservation`) and queries (`myReservations`, `reservation`). Use server-side quote for pricing. Use backend inventory for availability.
- **Dependencies:** Requires G1 (auth) to be resolved first. Backend BookingService already exists and is integration-tested.

**G3: Guest frontend payment is entirely mocked (fake delay)**
- **Problem:** Payment charge is a 1.6s `setTimeout`. Cards ending in '1' decline. No backend call is made.
- **Evidence:** `frontend-hotel/src/services/payment.ts` — "Payment mock".
- **Files:** `src/services/payment.ts`, `src/components/booking/BookingFlow.tsx`
- **Impact:** No payment records are created in the database. No payment status tracking.
- **Fix:** Replace with REST call to `/api/v1/payments` (create + capture). Even the backend's mock capture will at least persist payment records.
- **Dependencies:** Requires G1 (auth) for JWT token.

**G4: Hardcoded fixture data used as fallback throughout frontend**
- **Problem:** `data/index.ts` (641 lines) contains hardcoded hotel, rooms, prices, offers, extras, reviews, FAQ, gallery. When no `hotelid` URL param is provided, the entire frontend renders from this static data. Even with a `hotelid`, the homepage falls back to fixture data for facilities, location, and reviews sections.
- **Evidence:** `data/index.ts`, `app/page.tsx` (3-level fallback chain), `app/hotel/page.tsx` (legacy mode).
- **Files:** `src/data/index.ts`, `src/app/page.tsx`, `src/app/hotel/page.tsx`, `src/services/homepage.ts`, `src/services/platform.ts`
- **Impact:** The app appears to work but shows stale/incorrect data. Pricing in the fixture may not match backend pricing.
- **Fix:** Remove fixture fallbacks. Require `hotelid` parameter. Use backend data exclusively.
- **Dependencies:** None — can be done independently.

### P1 — High

**G5: Client-side pricing engine duplicates backend pricing**
- **Problem:** `services/pricing.ts` implements a full client-side pricing engine (promo evaluation, tax/fee calculation, extras, cancellation fees). The backend `PricingService.quote()` does the same thing server-side. This creates a split-brain where frontend and backend can calculate different prices.
- **Evidence:** `services/pricing.ts` — "port of RC.pricing (mock.js)". Backend `PricingService.java` — fully implemented.
- **Files:** `src/services/pricing.ts`, `src/services/cancellation.ts`, backend `PricingService.java`
- **Impact:** Price manipulation possible client-side. Prices shown may differ from what backend computes.
- **Fix:** Remove client-side pricing engine. Use backend `quote` GraphQL query exclusively. Keep only display formatting logic in frontend.
- **Dependencies:** Requires backend quote endpoint (already exists).

**G6: Backend payment capture is mocked**
- **Problem:** `PaymentServiceImpl.capture()` generates `"MOCK-" + UUID` as provider reference. No real payment gateway is called. Payments move directly from `pending` to `captured`.
- **Evidence:** `PaymentServiceImpl.java` — documented as "mock provider".
- **Files:** `backend-hotel/src/main/java/.../service/impl/PaymentServiceImpl.java`
- **Impact:** No real payment processing. Financial data in database is synthetic.
- **Fix:** Implement `PaymentProvider` interface with real gateway (Stripe, Adyen). Keep mock for dev/test profiles.
- **Dependencies:** Payment gateway account and SDK integration.

**G7: Media storage is local filesystem only**
- **Problem:** `LocalFilesystemMediaStorageProvider` stores files under `./data/media/`. No cloud/S3 storage. Files are lost on container rebuild (mitigated by Docker volume, but not production-suitable).
- **Evidence:** `LocalFilesystemMediaStorageProvider.java`.
- **Files:** `backend-hotel/src/main/java/.../storage/LocalFilesystemMediaStorageProvider.java`
- **Impact:** Media not portable across instances. No CDN. Not production-suitable.
- **Fix:** Implement S3/Cloudinary provider behind `MediaStorageProvider` interface.
- **Dependencies:** Cloud storage account.

**G8: Homepage fallback chain uses fixture data**
- **Problem:** Homepage (`app/page.tsx`) has a 3-level fallback: backend homepage → featured flags → fixture `PROPERTY.experiences/reviews`. Even sections that could be backend-connected fall back to static data.
- **Evidence:** `app/page.tsx` lines 19-20 (HERO_FALLBACK_IMAGE), lines with `P.experiences`, `P.reviews`.
- **Files:** `src/app/page.tsx`
- **Impact:** Inconsistent data — some sections dynamic, some frozen.
- **Fix:** Remove all fixture fallbacks. Show empty/loading states when backend data unavailable.
- **Dependencies:** None.

**G9: Hotel legacy mode (no hotelid) renders entirely static page**
- **Problem:** When `/hotel` is accessed without `?hotelid=`, the `HotelLegacyPage` component renders — an entirely static page from the fixture data.
- **Evidence:** `app/hotel/page.tsx` — conditionally renders `HotelLegacyPage` when no `hotelid`.
- **Files:** `src/app/hotel/page.tsx`, `src/components/hotel/HotelDetail.tsx`
- **Impact:** Users can view a "hotel" that doesn't exist in the database.
- **Fix:** Require `hotelid` parameter. Show error/redirect when missing.
- **Dependencies:** None.

**G10: Notification dispatch is not implemented**
- **Problem:** `notifications` table and `NotificationQueryService` exist (read-only), but there's no `NotificationDispatchService` that actually sends emails/SMS. `notification_templates` table exists but is unused.
- **Evidence:** Backend has `Notification` entity, `NotificationRepository`, `NotificationQueryService`, but no send logic.
- **Files:** Backend `notification/` package (incomplete).
- **Impact:** No booking confirmations, cancellation notices, or any outbound communication.
- **Fix:** Implement `NotificationDispatchService` with email/SMS provider abstraction.
- **Dependencies:** Email provider (Resend, SendGrid, etc.).

**G11: NEXT_PUBLIC_USE_MOCK_SERVICES is not wired**
- **Problem:** The env variable is documented in `.env.example` and passed as a Docker build arg, but no source code reads it.
- **Evidence:** Grep for `NEXT_PUBLIC_USE_MOCK_SERVICES` in `src/` returns zero matches.
- **Files:** `.env.example`, `docker-compose.yml`, but not in any source file.
- **Impact:** Cannot toggle between mock and real behavior at build time.
- **Fix:** Either wire up the flag to switch between mock/real services, or remove it.
- **Dependencies:** G1-G3 resolution.

### P2 — Medium

**G12: No CI/CD pipeline**
- **Problem:** No GitHub Actions, GitLab CI, or any automated build/test/deploy configuration exists.
- **Impact:** All quality gates are manual. No automated regression detection.
- **Fix:** Add CI pipeline with lint, typecheck, test, build steps for all 3 projects.
- **Dependencies:** None.

**G13: Backoffice test coverage is minimal**
- **Problem:** Only 1 unit test file (`format.test.ts`) and 3 e2e specs. No tests for individual pages or GraphQL operations.
- **Impact:** Regressions in admin functionality won't be caught.
- **Fix:** Add tests for critical admin flows (hotel CRUD, rate plan management, reservation cancellation).
- **Dependencies:** None.

**G14: No @PreAuthorize annotations on backend**
- **Problem:** Authorization is purely programmatic in service methods. A missed check = IDOR vulnerability with no compile-time safety.
- **Evidence:** `@EnableMethodSecurity` is present but zero `@PreAuthorize` annotations found.
- **Impact:** Risk of missed authorization checks in new code.
- **Fix:** Consider adding declarative authorization as a safety net, or add comprehensive integration tests for every admin endpoint.
- **Dependencies:** None.

**G15: Frontend-side FX rates are hardcoded**
- **Problem:** Exchange rates (MAD=1, EUR=0.091, USD=0.1, GBP=0.078) are hardcoded in `lib/format.ts`.
- **Impact:** Rates may become stale.
- **Fix:** Fetch from backend or accept as configuration.
- **Dependencies:** None.

**G16: Backend entity schema reference file is stale**
- **Problem:** `database/collection-schema-postgresql.sql` still uses BIGINT PKs. V20 migration converted to UUIDs. The reference file is out of sync with the actual database.
- **Impact:** Developers may be confused by the discrepancy.
- **Fix:** Update the reference file or mark it as historical.
- **Dependencies:** None.

**G17: No refresh token mechanism**
- **Problem:** Backend issues single JWT access tokens with configurable TTL. No refresh token flow exists.
- **Impact:** Users must re-authenticate when token expires.
- **Fix:** Add refresh token issuance and rotation for production use.
- **Dependencies:** None.

**G18: Backoffice has no reservation creation UI**
- **Problem:** Staff cannot create reservations from the back-office. Only listing and cancellation are supported.
- **Impact:** Staff must use the guest frontend for bookings.
- **Fix:** Add reservation creation form in backoffice.
- **Dependencies:** None.

**G19: Backoffice missing management for experiences, restaurants, extras**
- **Problem:** These entities are fetched in `AdminHotelWorkspace` query but have no UI tabs.
- **Impact:** Content managers cannot manage these without database access.
- **Fix:** Add management tabs or pages.
- **Dependencies:** None.

### P3 — Low

**G20: 8 empty API route directories in frontend**
- **Problem:** `src/app/api/auth/`, `api/chat/`, `api/extras/`, etc. exist but contain no route handlers.
- **Impact:** Dead infrastructure from planned but unimplemented BFF routes.
- **Fix:** Remove empty directories or implement the routes.

**G21: Frontend newsletter is localStorage-only**
- **Problem:** Newsletter subscriber list stored in localStorage.
- **Impact:** No real newsletter system.
- **Fix:** Implement backend or third-party integration (Mailchimp, etc.).

**G22: QR code is deterministic fake (not scannable)**
- **Problem:** `lib/qr.ts` generates a visual pattern, not a real QR code.
- **Impact:** Mobile key/check-in QR won't scan.
- **Fix:** Use `qrcode` npm package for real QR generation.

**G23: No CORS runtime guardrail for production**
- **Problem:** Default `CORS_ALLOWED_ORIGINS=*` in `.env`. Only the prod overlay forces explicit origins.
- **Impact:** If prod overlay is forgotten, API is wide open.
- **Fix:** Add a startup check that rejects `*` in prod profile.

**G24: Debug files in backoffice**
- **Problem:** `debug2.mjs` through `debug6.mjs` files exist in backoffice root.
- **Impact:** Development artifacts cluttering the project.
- **Fix:** Add to `.gitignore` or remove.

---

## H. Recommended Implementation Plan

### Phase 1 — Critical Issues (P0)

**1.1 Wire frontend authentication to backend**
- Replace `services/auth.ts` with real JWT auth via backend REST endpoints
- Update `context/SessionContext.tsx` to use JWT token
- Store JWT in httpOnly cookie (like backoffice does) or in-memory
- Implement token refresh
- **Files:** `src/services/auth.ts`, `src/context/SessionContext.tsx`, `src/components/account/AccountFlow.tsx`
- **Dependencies:** Backend auth endpoints (already exist)
- **Priority:** P0

**1.2 Wire frontend reservations to backend**
- Replace `services/reservations.ts` with GraphQL mutations/queries
- Update `BookingFlow.tsx` to call `createReservation` mutation
- Update `ReservationFlow.tsx` to call `myReservations`/`reservation` queries
- Use server-side `quote` for pricing (remove client-side pricing)
- Update cancellation to use backend `cancelReservation`
- **Files:** `src/services/reservations.ts`, `src/components/booking/BookingFlow.tsx`, `src/components/booking/ReservationFlow.tsx`
- **Dependencies:** Phase 1.1 (auth)
- **Priority:** P0

**1.3 Wire frontend payment to backend**
- Replace `services/payment.ts` with REST calls to `/api/v1/payments`
- Create payment on booking, capture after confirmation
- **Files:** `src/services/payment.ts`, `src/components/booking/BookingFlow.tsx`
- **Dependencies:** Phase 1.1 (auth for JWT)
- **Priority:** P0

**1.4 Remove fixture data fallbacks**
- Remove `data/index.ts` dependency from backend-connected components
- Require `hotelid` parameter on all hotel-related pages
- Remove `HotelLegacyPage` static fallback
- Remove fixture fallbacks from homepage
- **Files:** `src/data/index.ts`, `src/app/page.tsx`, `src/app/hotel/page.tsx`
- **Dependencies:** None
- **Priority:** P0

### Phase 2 — Domain/Data Model (P1)

**2.1 Remove client-side pricing engine**
- Delete `services/pricing.ts`, `services/cancellation.ts`, `services/siteSearch.ts`
- Replace all client-side price calculations with backend `quote` query
- **Files:** Multiple service and component files
- **Dependencies:** Phase 1.2
- **Priority:** P1

**2.2 Implement notification dispatch**
- Create `NotificationDispatchService` with email/SMS provider abstraction
- Wire to booking confirmation, cancellation, and other events
- **Files:** New service in backend, Kafka consumer for events
- **Dependencies:** Email provider account
- **Priority:** P1

**2.3 Complete homepage with backend data only**
- Remove all fixture fallbacks from homepage
- Use only backend `homepage` query data
- **Files:** `src/app/page.tsx`, homepage components
- **Dependencies:** Phase 1.4
- **Priority:** P1

### Phase 3 — Payment & Media (P1-P2)

**3.1 Implement real payment gateway**
- Implement `PaymentProvider` interface with Stripe/Adyen
- Keep mock for dev profile, real for prod
- **Files:** New `PaymentProvider` implementation, `PaymentServiceImpl`
- **Dependencies:** Gateway account
- **Priority:** P1

**3.2 Implement S3/Cloudinary media storage**
- Implement `MediaStorageProvider` with S3
- **Files:** New provider implementation
- **Dependencies:** Cloud storage account
- **Priority:** P2

### Phase 4 — Backoffice Gaps (P2)

**4.1 Add reservation creation UI to backoffice**
**4.2 Add experiences/restaurants/extras management tabs**
**4.3 Add room type media management**
**4.4 Add pagination to all list views**
**4.5 Make sidebar responsive for mobile**
- **Priority:** P2

### Phase 5 — Testing (P2-P3)

**5.1 Add backend unit tests for individual services**
**5.2 Add backoffice integration tests for critical flows**
**5.3 Update frontend e2e tests to use real backend (not mock data)**
**5.4 Add CI/CD pipeline**
- **Priority:** P2-P3

### Phase 6 — Production Hardening (P2-P3)

**6.1 Add refresh token mechanism**
**6.2 Add CORS runtime guardrail for prod profile**
**6.3 Add comprehensive audit logging to all services**
**6.4 Remove debug files from backoffice**
**6.5 Remove empty API route directories from frontend**
**6.6 Update `database/collection-schema-postgresql.sql` to match current schema**
**6.7 Remove or wire up `NEXT_PUBLIC_USE_MOCK_SERVICES` flag**
- **Priority:** P2-P3

---

## Most Important Final Question

### If we remove all mock, demo, hardcoded, fake, and silent-fallback behavior today, exactly which application features would stop working?

**Features that would STOP working:**

1. **Guest authentication** — login, registration, session management, password reset, "My Account" page
2. **Booking creation** — the entire "Book Now" flow (room selection → plan selection → guest details → payment → confirmation)
3. **Reservation management** — viewing reservations, reservation lookup, modifying/canceling reservations
4. **Payment processing** — card charging during booking
5. **Cancellation fee evaluation** — computing penalty amounts for cancellation
6. **Site search (non-hotel)** — searching across rooms, offers, FAQ, restaurants, experiences within a single hotel
7. **Client-side pricing display** — price breakdowns, promo code evaluation, tax/fee calculation (if backend quote isn't used)
8. **Homepage fallback sections** — hero image fallback, featured experiences from fixture, reviews from fixture, facilities section, location section
9. **Hotel detail page without hotelid** — entire legacy page
10. **Newsletter subscription** — subscriber list
11. **QR code display** — check-in/room key QR visual
12. **Browsing activity** — recent searches, recently viewed rooms
13. **GDPR consent** — cookie consent state

**Features that would CONTINUE working:**

1. Hotel listing and search (backend-connected)
2. Hotel detail with hotelid (backend-connected)
3. Availability checking (backend-connected)
4. Rate/price display from backend
5. Server-side quote/pricing
6. All back-office admin features (100% backend-connected)
7. Kafka event publishing
8. Invoice generation (backend)
9. Review system (backend)
10. Platform content management

### What services, entities, fields, relationships, APIs, business logic, database changes, and integrations are required to make those features genuinely end-to-end?

**Required changes (no database changes needed — backend is complete):**

| Area | What's Needed | Files Affected |
|------|--------------|----------------|
| **Frontend auth service** | Replace `services/auth.ts` with real JWT client calling `/api/v1/auth/login`, `/api/v1/auth/register`, and GraphQL `me` query. Store JWT in httpOnly cookie. | `src/services/auth.ts`, `src/context/SessionContext.tsx`, `src/components/account/AccountFlow.tsx` |
| **Frontend reservation service** | Replace `services/reservations.ts` with GraphQL client calling `createReservation`, `myReservations`, `reservation`, `cancelReservation`. | `src/services/reservations.ts`, `src/components/booking/BookingFlow.tsx`, `src/components/booking/ReservationFlow.tsx` |
| **Frontend payment service** | Replace `services/payment.ts` with REST client calling `/api/v1/payments` (create + capture). | `src/services/payment.ts`, `src/components/booking/BookingFlow.tsx` |
| **Frontend pricing service** | Remove `services/pricing.ts` and `services/cancellation.ts`. Use backend `quote` query exclusively. | `src/services/pricing.ts`, `src/services/cancellation.ts`, multiple components |
| **Frontend site search** | Remove `services/siteSearch.ts`. Use backend `staySearch` query. | `src/services/siteSearch.ts` |
| **Frontend fixture data** | Remove `data/index.ts` dependency. Use backend data only. | `src/data/index.ts`, `src/app/page.tsx`, `src/app/hotel/page.tsx` |
| **Frontend session context** | Rewrite to use JWT token from cookie, call backend `me` query for session refresh. | `src/context/SessionContext.tsx` |
| **Frontend booking flow** | Rewrite to: search → select room/plan → get server quote → collect guest details → create reservation (backend) → process payment (backend) → show confirmation with real reference. | `src/components/booking/BookingFlow.tsx` |

**No new entities, fields, relationships, or database changes are required.** The backend data model is complete. The gap is entirely in the frontend-to-backend integration layer.

**No new backend APIs are required.** The backend exposes 99 API operations (34 queries, 33 mutations, 10+ REST endpoints). The frontend currently uses only ~10 of them. The remaining ~89 operations are ready to be consumed.

**The core work is replacing 9 localStorage-based mock services in `frontend-hotel/src/services/` with real GraphQL/REST clients that call the existing backend APIs.**
