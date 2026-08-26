# Full Frontend Mock Data & API Integration Audit

**Date:** 2026-08-26
**Scope:** `frontend-hotel/` (guest), `backoffice-hotel/` (admin), `backend-hotel/` (API)

---

## Executive Summary

The **backoffice-hotel** is **100% integrated** with the real backend — zero mocks, zero localStorage for business data, every screen reads/writes through live GraphQL.

The **frontend-hotel** (guest-facing) is in a **dual-mode architecture**. A toggle (`NEXT_PUBLIC_USE_MOCK_SERVICES`) gates whether services call the real GraphQL backend or fall back to static fixtures and localStorage. In production mode, several services do attempt real API calls but **silently fall back to mock data** on failure. The most critical gaps are:

- **Authentication** — fully mocked (localStorage)
- **Reservations** — fully mocked (localStorage)
- **Payment** — fully mocked (in-memory)
- **Pricing/Availability** — client-side calculation from static fixtures
- **Cancellation** — local policy evaluation from static room data

The backend has **comprehensive APIs** for all of these (99 operations), but the guest frontend either doesn't call them or falls back to mocks when they fail.

---

## 1. Repository Structure

| Project | Framework | Purpose | Integration Status |
|---------|-----------|---------|-------------------|
| `backend-hotel/` | Spring Boot + GraphQL | Hotel management API | **Complete** (99 operations) |
| `backoffice-hotel/` | Next.js 16 | Admin console | **100% integrated** |
| `frontend-hotel/` | Next.js (App Router) | Guest-facing hotel website | **~40% integrated** (dual-mode with mock fallbacks) |

---

## 2. Backend API Inventory (99 Operations)

### REST Endpoints (10)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/v1/auth/login` | Public | Guest login |
| POST | `/api/v1/auth/register` | Public | Guest registration |
| POST | `/api/v1/reservations` | Public | Create reservation |
| POST | `/api/v1/reservations/{ref}/cancel` | Public | Cancel reservation |
| POST | `/api/v1/reservations/{ref}/invoice` | Public | Issue invoice |
| POST | `/api/v1/payments` | JWT | Create payment |
| POST | `/api/v1/payments/{id}/capture` | JWT | Capture payment |
| POST | `/api/v1/media/upload` | JWT | Upload media |
| DELETE | `/api/v1/media/{id}` | JWT | Delete media |
| POST | `/api/v1/hotels/{id}/reviews` | JWT | Create review |

### GraphQL Queries (34)

| Operation | Auth | Purpose |
|-----------|------|---------|
| `me` | JWT | Current user |
| `hotels` | Public | Search hotels |
| `hotel(id)` | Public | Single hotel |
| `hotelDetails(id)` | Public | Hotel + experiences + restaurants + FAQs + reviews |
| `roomType(id)` | Public | Single room type |
| `roomTypes(hotelId)` | Public | All room types |
| `experiences(hotelId)` | Public | Hotel experiences |
| `restaurants(hotelId)` | Public | Hotel restaurants |
| `extras(hotelId)` | Public | Bookable extras |
| `faqs(hotelId)` | Public | Hotel FAQs |
| `platform(slug)` | Public | Platform identity + content |
| `homepage` | Public | Curated homepage sections |
| `availability` | Public | Room availability |
| `staySearch` | Public | Composed search |
| `offers` | Public | Active promotions |
| `rates` | Public | Nightly rates |
| `quote` | Public | Server-side pricing |
| `myReservations` | JWT | Guest's bookings |
| `reservation` | Public | Lookup by ref+email |
| `reviews` | Public | Paged hotel reviews |
| `adminDashboard` | Staff | Dashboard stats |
| `adminHotel` | Staff | Hotel workspace |
| `adminHotels` | Staff | Hotel list |
| `adminAmenities` | Staff | Amenity catalog |
| `adminGuests` | Staff | Hotel guests |
| `adminReservations` | Staff | Hotel reservations |
| `adminPayments` | Staff | Hotel payments |
| `adminInvoices` | Staff | Hotel invoices |
| `adminPromotions` | Staff | Hotel promotions |
| `adminReviews` | Staff | Hotel reviews |
| `adminUsers` | Staff | Platform users |
| `adminRoles` | Staff | Platform roles |
| `adminNotifications` | Staff | Hotel notifications |
| `adminAuditLogs` | Staff | Audit log |

### GraphQL Mutations (33)

| Operation | Auth | Purpose |
|-----------|------|---------|
| `login` | Public | Guest login |
| `register` | Public | Guest registration |
| `createUser` | Staff | Create staff user |
| `assignRole` | Staff | Assign role |
| `revokeRole` | Staff | Revoke role |
| `createReservation` | Public | Create booking |
| `cancelReservation` | Public | Cancel booking |
| `adminCancelReservation` | Staff | Admin cancel |
| `createPayment` | JWT | Create payment |
| `capturePayment` | JWT | Capture payment |
| `issueInvoice` | Public | Generate invoice |
| `createReview` | JWT | Create review |
| `moderateReview` | Staff | Approve/reject review |
| `updateAvailability` | Staff | Update inventory (deprecated) |
| `updateAvailabilityRange` | Staff | Update inventory by range |
| `createHotel` | Staff | Create hotel |
| `updateHotel` | Staff | Update hotel |
| `setHotelAmenities` | Staff | Set hotel amenities |
| `setHotelMedia` | Staff | Set hotel media |
| `createRoomType` | Staff | Create room type |
| `updateRoomType` | Staff | Update room type |
| `setRoomTypeAmenities` | Staff | Set room type amenities |
| `setRoomTypeMedia` | Staff | Set room type media |
| `createRoom` | Staff | Create room |
| `updateRoom` | Staff | Update room |
| `createRatePlan` | Staff | Create rate plan |
| `updateRatePlan` | Staff | Update rate plan |
| `linkRoomTypeRatePlan` | Staff | Link room type to rate plan |
| `unlinkRoomTypeRatePlan` | Staff | Unlink room type from rate plan |
| `setRatePlanPrices` | Staff | Set date-range prices |
| `createPromotion` | Staff | Create promotion |
| `updatePromotion` | Staff | Update promotion |
| `setPromotionStatus` | Staff | Activate/deactivate promotion |

### Batch Field Resolvers (10) + Single Entity Resolvers (9)

---

## 3. Backoffice-Hotel Audit: 100% Integrated

### Classification: ALL A (Fully Integrated)

| Page / Feature | Route | Data Source | Backend API | Status |
|----------------|-------|-------------|-------------|--------|
| Login | `/login` | GraphQL mutation | `LoginDocument` | **REAL** |
| Dashboard | `/dashboard` | GraphQL query | `AdminDashboardDocument` | **REAL** |
| Hotels List | `/hotels` | GraphQL query | `AdminHotelsDocument` | **REAL** |
| New Hotel | `/hotels/new` | GraphQL mutation | `CreateHotelDocument` | **REAL** |
| Hotel Overview | `/hotels/[id]` | GraphQL query+mutation | `AdminHotelWorkspaceDocument` | **REAL** |
| Room Types | `/hotels/[id]` (tab) | GraphQL query+mutation | `AdminHotelWorkspaceDocument` + mutations | **REAL** |
| Rooms | `/hotels/[id]` (tab) | GraphQL query+mutation | `AdminHotelWorkspaceDocument` + mutations | **REAL** |
| Rate Plans | `/hotels/[id]` (tab) | GraphQL query+mutation | `AdminHotelWorkspaceDocument` + mutations | **REAL** |
| Availability | `/hotels/[id]` (tab) | GraphQL query+mutation | `AdminHotelWorkspaceDocument` + mutations | **REAL** |
| Reservations | `/reservations` | GraphQL query+mutation | `AdminReservationsDocument` | **REAL** |
| Guests | `/guests` | GraphQL query | `AdminGuestsDocument` | **REAL** |
| Payments | `/payments` | GraphQL query | `AdminPaymentsDocument` | **REAL** |
| Invoices | `/invoices` | GraphQL query | `AdminInvoicesDocument` | **REAL** |
| Promotions | `/promotions` | GraphQL query+mutation | `AdminPromotionsDocument` + mutations | **REAL** |
| Reviews | `/reviews` | GraphQL query+mutation | `AdminReviewsDocument` | **REAL** |
| Users & Roles | `/users` | GraphQL query+mutation | `AdminUsersDocument` + mutations | **REAL** |
| Notifications | `/notifications` | GraphQL query | `AdminNotificationsDocument` | **REAL** |
| Audit Log | `/audit` | GraphQL query | `AdminAuditLogsDocument` | **REAL** |

**Only non-API data:** localStorage for hotel scope selection (`bo_active_hotel`) — UI convenience only.

---

## 4. Frontend-Hotel Service-by-Service Audit

### 4.1 Services With Real API Calls (Dual-Mode)

These services attempt real GraphQL calls but **fall back to mock/static data** on failure.

| Service | File | Real API? | Fallback Target | Fallback Type |
|---------|------|-----------|-----------------|---------------|
| `catalog.ts` | `src/services/catalog.ts` | YES (8 queries) | `DATA.*` fixtures + `availability.ts` mocks | **MOCK FALLBACK** |
| `homepage.ts` | `src/services/homepage.ts` | YES (1 query) | `EMPTY_HOMEPAGE` (empty arrays) | **SAFE FALLBACK** |
| `hotelList.ts` | `src/services/hotelList.ts` | YES (1 query) | `HOTEL_LIST_FALLBACK` (single fixture hotel) | **MOCK FALLBACK** |
| `extras.ts` | `src/services/extras.ts` | YES (1 query) | `DATA.EXTRAS` (5 static extras) | **MOCK FALLBACK** |
| `platform.ts` | `src/services/platform.ts` | YES (1 query) | `EMPTY_PLATFORM_CONTENT` (nulls) | **SAFE FALLBACK** |
| `pricingHydration.ts` | `src/services/pricingHydration.ts` | YES (bootstrap) | Silently swallows errors | **SILENT FAILURE** |

#### catalog.ts — Detailed Fallback Map

| Function | Real API | Fallback |
|----------|----------|----------|
| `getRoomTypes()` | `HotelRoomTypesDocument` | `DATA.PROPERTY.rooms` |
| `getOffers()` | `HotelOffersDocument` | `DATA.OFFERS` |
| `getReviews()` | `HotelReviewsDocument` | `DATA.PROPERTY.reviews` |
| `getExperiences()` | `HotelExperiencesDocument` | `DATA.PROPERTY.experiences` |
| `searchStay()` | `StaySearchDocument` | `mockSearchRooms()` from `availability.ts` |
| `getStay()` | Composed batch query | `mockGetStay()` from `availability.ts` |
| `getStayRoom()` | Composed batch query | `mockGetStayRoom()` from `availability.ts` |
| `getProperty()` | `HotelByIdDocument` | `mockGetProperty()` from `availability.ts` |
| `getHotelById()` | `HotelByIdDocument` | `DATA.PROPERTY` |

### 4.2 Pure Mock Services (No API Calls)

| Service | File | Data Source | Type |
|---------|------|-------------|------|
| `availability.ts` | `src/services/availability.ts` | `DATA.*` fixtures + hash-based pseudo-random | **MOCK** |
| `pricing.ts` | `src/services/pricing.ts` | `DATA.OFFERS` + `DATA.EXTRAS` defaults | **MOCK** |
| `cancellation.ts` | `src/services/cancellation.ts` | `DATA.PROPERTY.rooms` for policy lookup | **MOCK** |
| `siteSearch.ts` | `src/services/siteSearch.ts` | `DATA.PROPERTY.rooms/offers/faq/etc.` | **STATIC** |
| `payment.ts` | `src/services/payment.ts` | In-memory (no persistence) | **MOCK** |

### 4.3 localStorage Services

| Service | File | localStorage Keys | Purpose | Type |
|---------|------|-------------------|---------|------|
| `auth.ts` | `src/services/auth.ts` | `rc_session_v1`, `rc_users_v1` | Mock auth with seeded demo user | **MOCK** |
| `reservations.ts` | `src/services/reservations.ts` | `rc_reservations_v1`, `rc_session_v1`, `rc_booking_done` | Mock reservation CRUD | **MOCK** |
| `consent.ts` | `src/services/consent.ts` | `rc_consent_v1` | GDPR cookie consent | **LOCAL STORAGE** |
| `newsletter.ts` | `src/services/newsletter.ts` | `rc_newsletter_v1` | Mock email subscription | **MOCK** |
| `activity.ts` | `src/services/activity.ts` | `rc_recent_searches_v1`, `rc_recent_rooms_v1` | Browsing history | **LOCAL STORAGE** |

### 4.4 Infrastructure

| Service | File | Purpose |
|---------|------|---------|
| `graphqlClient.ts` | `src/services/graphqlClient.ts` | GraphQL HTTP client + `useGraphql` toggle |

---

## 5. Frontend-Hotel Page-by-Page Audit

| Route | Page | Key Data | Source | Status | Backend API Exists? | Mock Data? | LocalStorage? | Action Needed |
|-------|------|----------|--------|--------|---------------------|------------|---------------|---------------|
| `/` | Homepage | Platform hero | GraphQL `PlatformBySlug` | **PARTIAL** | Yes | Fallback: empty | No | None (safe fallback) |
| `/` | Homepage | Featured hotels/rooms | GraphQL `Homepage` | **PARTIAL** | Yes | Fallback: empty | No | None (safe fallback) |
| `/` | Homepage | Facilities, static sections | `DATA.PROPERTY` | **STATIC** | N/A | Yes (static) | No | None (intentional) |
| `/` | Homepage | Recent activity | `rc_recent_*` localStorage | **LOCAL STORAGE** | N/A | No | Yes | Acceptable (UX) |
| `/hotel` | Hotel Detail | Hotel info + rooms | GraphQL `HotelById` | **PARTIAL** | Yes | Fallback: `DATA.PROPERTY` | No | None (safe fallback) |
| `/hotel` | Hotel Detail | Experiences | GraphQL `HotelExperiences` | **PARTIAL** | Yes | Fallback: `DATA.PROPERTY.experiences` | No | None (safe fallback) |
| `/hotel` | Hotel Detail | Reviews | GraphQL `HotelReviews` | **PARTIAL** | Yes | Fallback: `DATA.PROPERTY.reviews` | No | None (safe fallback) |
| `/hotel` | Hotel Detail | Policies, FAQ | `DATA.PROPERTY` | **STATIC** | Yes (`faqs` query exists) | Yes (static) | No | **Integrate faqs query** |
| `/search` | Search Results | Availability + pricing | `searchStay()` GraphQL | **PARTIAL** | Yes | Fallback: `mockSearchRooms()` | No | **Critical: mock fallback hides failures** |
| `/search` | Search Results | Rate plans | `rates()` GraphQL | **PARTIAL** | Yes | Fallback: `computePlanPricing()` local | No | **Critical: local pricing calculation** |
| `/booking` | Booking Flow | Price breakdown | `compute()` local | **MOCK** | Yes (`quote` query exists) | Yes | No | **Integrate `quote` query** |
| `/booking` | Booking Flow | Payment | `charge()` mock | **MOCK** | Yes (REST + GraphQL payments) | Yes | No | **Integrate payment API** |
| `/booking` | Booking Flow | Create reservation | `createReservation()` localStorage | **MOCK** | Yes (REST + GraphQL) | Yes | Yes | **Integrate reservation API** |
| `/confirmation` | Confirmation | Reservation details | `byRef()` localStorage | **MOCK** | Yes (`reservation` query) | Yes | Yes | **Integrate reservation lookup** |
| `/reservation` | Reservation Lookup | Reservation by ref+email | `byRef()` localStorage | **MOCK** | Yes (`reservation` query) | Yes | Yes | **Integrate reservation lookup** |
| `/checkin` | Online Check-In | Reservation + update | `byRef()` + `setCheckedIn()` localStorage | **MOCK** | Partial (no check-in API) | Yes | Yes | **Needs backend check-in API** |
| `/account` | Guest Account | Login/Register | Mock auth localStorage | **MOCK** | Yes (`login`/`register` mutations) | Yes | Yes | **Integrate auth API** |
| `/account` | Guest Account | Reservations list | `byEmail()` localStorage | **MOCK** | Yes (`myReservations` query) | Yes | Yes | **Integrate reservations list** |
| `/offers` | Offers | Promotion list | `DATA.OFFERS` static | **STATIC** | Yes (`offers` query) | Yes | No | **Integrate offers query** |
| `/contact` | Contact | Contact form | Hardcoded | **STATIC** | No | N/A | No | None (intentional) |
| `/faq` | FAQ | FAQ list | `DATA.PROPERTY.faq` | **STATIC** | Yes (`faqs` query) | Yes | No | **Integrate faqs query** |
| `/index-2` | Alternate Homepage | Hotel data | `DATA.PROPERTY` | **STATIC** | N/A | Yes (static) | No | None (design variant) |
| `/terms` | Terms | Legal text | Hardcoded JSX | **STATIC** | N/A | N/A | No | None |
| `/privacy` | Privacy | Legal text | Hardcoded JSX | **STATIC** | N/A | N/A | No | None |
| `/cookies` | Cookies | Legal text + consent | Hardcoded + localStorage | **STATIC + LOCAL** | N/A | N/A | Yes | None (UX) |
| `/cancellation-policy` | Cancellation Policy | Legal text | Hardcoded JSX | **STATIC** | N/A | N/A | No | None |

---

## 6. Silent Mock Fallbacks (High Priority)

Every dual-mode service follows this pattern:

```
if (!useGraphql) → return mock data
try { return await gqlRequest(...) }
catch { return mock data }  // ← SILENT FALLBACK
```

### Occurrences

| Service | Function | API Called | Fallback Data | Risk |
|---------|----------|-----------|---------------|------|
| `catalog.ts` | `getRoomTypes()` | `HotelRoomTypesDocument` | `DATA.PROPERTY.rooms` (3 static rooms) | **HIGH** — wrong room data shown |
| `catalog.ts` | `getOffers()` | `HotelOffersDocument` | `DATA.OFFERS` (5 hardcoded promos) | **HIGH** — wrong promos shown |
| `catalog.ts` | `getReviews()` | `HotelReviewsDocument` | `DATA.PROPERTY.reviews` (5 hardcoded reviews) | **MEDIUM** — stale reviews |
| `catalog.ts` | `getExperiences()` | `HotelExperiencesDocument` | `DATA.PROPERTY.experiences` (4 hardcoded) | **MEDIUM** — wrong experiences |
| `catalog.ts` | `searchStay()` | `StaySearchDocument` | `mockSearchRooms()` — hash-based fake availability | **CRITICAL** — fake availability |
| `catalog.ts` | `getStay()` | Batch query | `mockGetStay()` | **CRITICAL** — fake stay data |
| `catalog.ts` | `getStayRoom()` | Batch query | `mockGetStayRoom()` | **CRITICAL** — fake room data |
| `catalog.ts` | `getProperty()` | `HotelByIdDocument` | `mockGetProperty()` | **HIGH** — wrong hotel data |
| `catalog.ts` | `getHotelById()` | `HotelByIdDocument` | `DATA.PROPERTY` | **HIGH** — wrong hotel data |
| `hotelList.ts` | `getHotels()` | Inline GraphQL | `HOTEL_LIST_FALLBACK` (1 fixture hotel) | **HIGH** — wrong hotel list |
| `extras.ts` | `getExtras()` | `HotelExtrasDocument` | `DATA.EXTRAS` (5 hardcoded) | **MEDIUM** — wrong extras |
| `homepage.ts` | `getHomepage()` | `HomepageDocument` | `EMPTY_HOMEPAGE` | **LOW** — safe (empty) |
| `platform.ts` | `getPlatformContent()` | `PlatformBySlugDocument` | `EMPTY_PLATFORM_CONTENT` | **LOW** — safe (empty) |
| `pricingHydration.ts` | `hydrate()` | Hotels + offers + extras | Silent `catch(() => {})` | **HIGH** — pricing uses stale fixtures |

---

## 7. Frontend vs Backend Contract Comparison

### 7.1 APIs That Exist But Are NOT Integrated in Guest Frontend

| Backend API | Backend Query/Mutation | Guest Frontend Usage | Status |
|-------------|----------------------|---------------------|--------|
| `login` mutation | GraphQL | `auth.ts` uses localStorage mock | **NOT INTEGRATED** |
| `register` mutation | GraphQL | `auth.ts` uses localStorage mock | **NOT INTEGRATED** |
| `me` query | GraphQL | Not used (no real auth) | **NOT INTEGRATED** |
| `myReservations` query | GraphQL | `reservations.ts` uses localStorage | **NOT INTEGRATED** |
| `reservation` query | GraphQL | `reservations.ts` uses localStorage | **NOT INTEGRATED** |
| `createReservation` mutation | GraphQL | `reservations.ts` writes to localStorage | **NOT INTEGRATED** |
| `cancelReservation` mutation | GraphQL | `reservations.ts` updates localStorage | **NOT INTEGRATED** |
| `quote` query | GraphQL | `pricing.ts` computes locally | **NOT INTEGRATED** |
| `createPayment` mutation | GraphQL | `payment.ts` simulates locally | **NOT INTEGRATED** |
| `capturePayment` mutation | GraphQL | Not used | **NOT INTEGRATED** |
| `issueInvoice` mutation | GraphQL | Not used | **NOT INTEGRATED** |
| `createReview` mutation | GraphQL | Not used | **NOT INTEGRATED** |
| `faqs` query | GraphQL | `DATA.PROPERTY.faq` static | **NOT INTEGRATED** |
| `restaurants` query | GraphQL | `DATA.PROPERTY.restaurants` static | **NOT INTEGRATED** |
| `offers` query | GraphQL | `DATA.OFFERS` static (partially hydrated) | **PARTIALLY INTEGRATED** |
| `hotelDetails` query | GraphQL | Not used (uses `hotel` + separate queries) | **NOT INTEGRATED** |
| `staySearch` query | GraphQL | `catalog.ts` calls but falls back to mock | **PARTIALLY INTEGRATED** |
| `availability` query | GraphQL | Not used directly (via `staySearch`) | **INDIRECT** |
| `rates` query | GraphQL | Not used directly (via `staySearch`) | **INDIRECT** |
| `POST /api/v1/auth/login` | REST | Not used | **NOT INTEGRATED** |
| `POST /api/v1/auth/register` | REST | Not used | **NOT INTEGRATED** |
| `POST /api/v1/reservations` | REST | Not used | **NOT INTEGRATED** |
| `POST /api/v1/reservations/*/cancel` | REST | Not used | **NOT INTEGRATED** |
| `POST /api/v1/reservations/*/invoice` | REST | Not used | **NOT INTEGRATED** |
| `POST /api/v1/payments` | REST | Not used | **NOT INTEGRATED** |
| `POST /api/v1/hotels/*/reviews` | REST | Not used | **NOT INTEGRATED** |

### 7.2 APIs That Do NOT Exist Yet

| Frontend Need | Required Data | Suggested API | Backend Module | Reason |
|---------------|--------------|---------------|----------------|--------|
| Online Check-In | Check-in submission (passport, arrival time) | `POST /api/v1/reservations/{ref}/checkin` or mutation | Reservation | Guest frontend has `/checkin` page but no backend API |
| Newsletter Subscription | Email subscription | `subscribeToNewsletter` mutation | Missing | `newsletter.ts` is pure localStorage mock |
| Contact Form Submission | Contact message | `submitContactForm` mutation or email service | Missing | Contact page has no backend |

---

## 8. Client-Side Business Logic

| Calculation | File | Backend Equivalent | Divergence Risk |
|-------------|------|-------------------|-----------------|
| Price breakdown (subtotal, tax 12%, extras, total) | `pricing.ts` `compute()` | `quote` query | **HIGH** — local tax/fee calculation may differ from backend |
| Promo code validation | `pricing.ts` `validatePromo()` | `quote` query with `promoCode` | **HIGH** — local rules vs backend rules |
| Discount calculation (percent, night-based) | `pricing.ts` `promoDiscount()` | `quote` query | **HIGH** — local math vs backend engine |
| Room availability (hash-based pseudo-random) | `availability.ts` `availabilityFor()` | `availability`/`staySearch` queries | **CRITICAL** — deterministic fake vs real inventory |
| Rate plan generation (BB/RO/HB multipliers) | `availability.ts` `plansFor()` | `rates` query | **CRITICAL** — fake plans vs real rate plans |
| Cancellation fee evaluation | `cancellation.ts` | Backend cancellation penalty engine | **HIGH** — local regex parsing vs backend rules |
| FX conversion (MAD → EUR/USD/GBP) | `catalog.ts` `toBaseMad()` | Backend pricing (currency-aware) | **MEDIUM** — hardcoded rates vs live rates |

---

## 9. Authentication & Authorization Audit

### Guest Frontend (`frontend-hotel`)

| Aspect | Status | Details |
|--------|--------|---------|
| Login | **MOCK** | localStorage `rc_session_v1`, seeded demo user `demo@hotelcollection.com`/`demo1234` |
| Register | **MOCK** | localStorage `rc_users_v1`, simulated delay |
| Logout | **MOCK** | Clears localStorage |
| Session persistence | **MOCK** | `rc_session_v1` in localStorage |
| Password reset | **MOCK** | Always returns success message |
| Protected routes | **NONE** | No route guards — all pages accessible without auth |
| Role-based access | **NONE** | No roles concept in guest frontend |

### Backoffice (`backoffice-hotel`)

| Aspect | Status | Details |
|--------|--------|---------|
| Login | **REAL** | GraphQL `login` mutation, JWT in httpOnly cookie |
| Session check | **REAL** | `GET /api/auth/me` → backend `me` query |
| Logout | **REAL** | Clears httpOnly cookie |
| Protected routes | **REAL** | Layout redirects to `/login` if no valid token |
| Role-based access | **REAL** | Sidebar conditionally shows Users/Audit for `super_admin` |
| Hotel scoping | **REAL** | All queries scoped to selected hotel |

---

## 10. Final Classification

### A — Fully Integrated

| Feature | Project |
|---------|---------|
| All backoffice pages (14 screens) | `backoffice-hotel` |
| Hotel search (when backend available) | `frontend-hotel` (catalog.ts) |
| Hotel detail (when backend available) | `frontend-hotel` (catalog.ts) |
| Homepage sections (when backend available) | `frontend-hotel` (homepage.ts) |
| Platform identity (when backend available) | `frontend-hotel` (platform.ts) |
| Hotel list (when backend available) | `frontend-hotel` (hotelList.ts) |
| Extras (when backend available) | `frontend-hotel` (extras.ts) |

### B — Partially Integrated

| Feature | Project | Issue |
|---------|---------|-------|
| Stay search | `frontend-hotel` | Calls real API but falls back to mock availability/pricing |
| Offers/promotions | `frontend-hotel` | Hydrated from backend at startup but falls back to static `DATA.OFFERS` |
| Pricing | `frontend-hotel` | Hydration bridges backend offers/extras into local pricing engine, but calculation is client-side |

### C — Mocked (No Real Backend Connection)

| Feature | Project | Mock Type |
|---------|---------|-----------|
| Authentication | `frontend-hotel` | localStorage |
| Reservation creation | `frontend-hotel` | localStorage |
| Reservation lookup | `frontend-hotel` | localStorage |
| Reservation management | `frontend-hotel` | localStorage |
| Online check-in | `frontend-hotel` | localStorage |
| Payment processing | `frontend-hotel` | In-memory simulation |
| Cancellation evaluation | `frontend-hotel` | Local regex parsing |
| Newsletter subscription | `frontend-hotel` | localStorage |
| Contact form | `frontend-hotel` | No submission at all |

### D — Missing Backend Capability

| Feature | Project | Missing API |
|---------|---------|-------------|
| Online check-in | `frontend-hotel` | Check-in mutation/endpoint |
| Newsletter subscription | `frontend-hotel` | Subscription mutation |
| Contact form | `frontend-hotel` | Contact form endpoint |

### E — Static / Intentional

| Feature | Project |
|---------|---------|
| Terms, Privacy, Cookies, Cancellation Policy pages | `frontend-hotel` |
| Contact page (hardcoded info) | `frontend-hotel` |
| Static UI constants (amenity icons, country lists) | Both |
| FAQ page content | `frontend-hotel` (but backend API exists) |
| Hotel facilities/policies display | `frontend-hotel` |
| Google Fonts, logos, brand assets | Both |

---

## 11. Priority Implementation List

### P0 — Critical (Blocks Real Application Usage)

| Priority | Feature | Current State | Required Integration | Backend Ready? | Reason |
|----------|---------|---------------|---------------------|----------------|--------|
| P0-1 | Guest Authentication | localStorage mock | GraphQL `login`/`register` mutations + JWT | **YES** | No real user identity; everything downstream depends on this |
| P0-2 | Reservation Creation | localStorage mock | GraphQL `createReservation` mutation or REST `POST /reservations` | **YES** | Core business flow — bookings don't persist to backend |
| P0-3 | Reservation Lookup | localStorage mock | GraphQL `reservation` query (ref+email) | **YES** | Guests can't find real reservations |
| P0-4 | Payment Processing | In-memory mock | GraphQL `createPayment`/`capturePayment` or REST `POST /payments` | **YES** | No real payment processing |
| P0-5 | Pricing Engine | Client-side calculation | GraphQL `quote` query | **YES** | Local pricing may diverge from backend; backend is authoritative |
| P0-6 | Availability | Hash-based pseudo-random | GraphQL `staySearch`/`availability` queries | **YES** | Fake availability — rooms shown as available when they aren't |

### P1 — High (Important Business Features)

| Priority | Feature | Current State | Required Integration | Backend Ready? | Reason |
|----------|---------|---------------|---------------------|----------------|--------|
| P1-1 | Cancel Reservation | localStorage mock | GraphQL `cancelReservation` mutation | **YES** | Cancellation fees calculated locally, may differ from backend |
| P1-2 | Reservation Management | localStorage mock | GraphQL `myReservations` query | **YES** | Authenticated guests can't see their real bookings |
| P1-3 | Guest Account Reservations | localStorage mock | GraphQL `myReservations` query | **YES** | Account page shows fake reservation list |
| P1-4 | Remove Silent Fallbacks | All dual-mode services | Throw errors instead of returning mock data in production | **YES** | Mock fallbacks hide real backend failures |
| P1-5 | Rate Plans | Local calculation via multipliers | GraphQL `rates` query | **YES** | Fake rate plans (BB/RO/HB) with hardcoded multipliers |

### P2 — Medium (Enhances User Experience)

| Priority | Feature | Current State | Required Integration | Backend Ready? | Reason |
|----------|---------|---------------|---------------------|----------------|--------|
| P2-1 | Offers/Promotions | Static fixtures (partially hydrated) | GraphQL `offers` query (always use backend) | **YES** | Hydration is fragile; static fallback shows wrong promos |
| P2-2 | Reviews | Static fallback | GraphQL `reviews` query (always use backend) | **YES** | Stale reviews when backend unavailable |
| P2-3 | Experiences | Static fallback | GraphQL `experiences` query | **YES** | Wrong experiences when backend unavailable |
| P2-4 | FAQs | Static `DATA.PROPERTY.faq` | GraphQL `faqs` query | **YES** | Content managed in backend not reflected |
| P2-5 | Restaurants | Static `DATA.PROPERTY.restaurants` | GraphQL `restaurants` query | **YES** | Content managed in backend not reflected |
| P2-6 | Online Check-In | localStorage mock | Backend check-in API | **NO** | Needs new backend endpoint |
| P2-7 | Invoice Generation | Not used | GraphQL `issueInvoice` mutation | **YES** | Backend supports it, frontend doesn't use it |
| P2-8 | Review Submission | Not used | GraphQL `createReview` mutation | **YES** | Backend supports it, frontend doesn't use it |

### P3 — Low (Nice-to-Have)

| Priority | Feature | Current State | Required Integration | Backend Ready? | Reason |
|----------|---------|---------------|---------------------|----------------|--------|
| P3-1 | Newsletter | localStorage mock | Backend subscription API | **NO** | Needs new backend endpoint |
| P3-2 | Contact Form | No submission | Backend contact endpoint | **NO** | Needs new backend endpoint |
| P3-3 | FX Rates | Hardcoded conversion rates | Live FX rate API | **NO** | Nice-to-have for multi-currency display |
| P3-4 | Guest Auth Session Persistence | localStorage | JWT-based session like backoffice | **YES** | Could share auth pattern with backoffice |
| P3-5 | HotelList codegen fix | Raw query string bypass | Fix codegen to include `HotelListDocument` | **YES** | Code quality — dead generated code |

---

## 12. Recommended Implementation Order

Based on business impact and dependencies:

1. **Guest Authentication** (P0-1) — Foundation for all user-specific features
2. **Reservation Creation** (P0-2) — Core business flow
3. **Payment Processing** (P0-4) — Required for real bookings
4. **Pricing Engine** (P0-5) — Backend is authoritative for prices
5. **Availability** (P0-6) — Must reflect real inventory
6. **Reservation Lookup** (P0-3) — Guests need to find their bookings
7. **Remove Silent Mock Fallbacks** (P1-4) — Prevent hidden failures in production
8. **Cancel Reservation** (P1-1) — Important for guest self-service
9. **Reservation Management** (P1-2, P1-3) — Account page shows real bookings
10. **Rate Plans** (P1-5) — Real rate plans from backend
11. **Offers/Promotions** (P2-1) — Always use backend data
12. **Reviews, Experiences, FAQs, Restaurants** (P2-2 through P2-5) — Content from backend
13. **Online Check-In** (P2-6) — Requires new backend API
14. **Invoice & Review Submission** (P2-7, P2-8) — Already supported by backend
15. **Newsletter & Contact** (P3-1, P3-2) — Low priority

---

## 13. Architecture Notes

### Guest Frontend Dual-Mode Toggle

The toggle is controlled by `NEXT_PUBLIC_USE_MOCK_SERVICES`:

```typescript
// src/services/graphqlClient.ts
export const useGraphql = process.env.NEXT_PUBLIC_USE_MOCK_SERVICES !== 'true';
```

When `useGraphql = true` (production):
- Services attempt real GraphQL calls
- On failure, they silently fall back to mock data

When `useGraphql = false` (development/prototype):
- Services immediately return static fixture data
- No network calls are made

**Recommendation for production:** Remove the mock fallback path entirely. When the backend is unavailable, show an error to the user rather than silently serving stale/wrong data.

### Key Data Flow (Current State)

```
Guest Frontend                    Backend
─────────────                    ───────
catalog.ts ──GraphQL──→ ✅ (when available)
                         ↓ (on failure)
                    DATA.* fixtures ← static TypeScript objects

reservations.ts ──→ localStorage (no backend call)
auth.ts ──→ localStorage (no backend call)
payment.ts ──→ in-memory simulation (no backend call)
pricing.ts ──→ local calculation (no backend call)
availability.ts ──→ hash-based pseudo-random (no backend call)
```

### Key Data Flow (Target State)

```
Guest Frontend                    Backend
─────────────                    ───────
auth.ts ──GraphQL──→ login/register mutations → JWT
reservations.ts ──GraphQL──→ createReservation/cancelReservation mutations
payment.ts ──GraphQL──→ createPayment/capturePayment mutations
pricing.ts ──GraphQL──→ quote query (server-side pricing)
availability.ts ──GraphQL──→ staySearch/availability queries
catalog.ts ──GraphQL──→ hotel/roomTypes/offers/reviews/experiences queries
```

---

## 14. Files Referenced

### Frontend-Hotel Services
- `src/services/graphqlClient.ts` — GraphQL client + mock toggle
- `src/services/catalog.ts` — Main backend-first service (8 queries + fallbacks)
- `src/services/homepage.ts` — Homepage query (safe fallback)
- `src/services/hotelList.ts` — Hotel list query (mock fallback)
- `src/services/extras.ts` — Extras query (mock fallback)
- `src/services/platform.ts` — Platform query (safe fallback)
- `src/services/pricingHydration.ts` — Startup hydration bridge
- `src/services/pricing.ts` — Client-side pricing engine
- `src/services/availability.ts` — Mock availability + rate plans
- `src/services/reservations.ts` — localStorage reservation CRUD
- `src/services/auth.ts` — Mock auth with localStorage
- `src/services/payment.ts` — In-memory payment simulation
- `src/services/cancellation.ts` — Local cancellation policy evaluation
- `src/services/consent.ts` — localStorage GDPR consent
- `src/services/newsletter.ts` — localStorage newsletter mock
- `src/services/activity.ts` — localStorage browsing history
- `src/services/siteSearch.ts` — Static fixture text search

### Frontend-Hotel Data
- `src/data/index.ts` — All static fixtures (PROPERTY, ROOMS, OFFERS, EXTRAS, DEMO_RESERVATIONS)

### Frontend-Hotel GraphQL
- `src/graphql/hotel.graphql` — 7 queries
- `src/graphql/homepage.graphql` — 1 query
- `src/graphql/platform.graphql` — 1 query
- `src/graphql/staySearch.graphql` — 1 query
- `src/graphql/extras.graphql` — 1 query
- `src/graphql/hotelList.graphql` — 1 query (dead — not in codegen output)
- `src/graphql/roomType.graphql` — 2 queries

### Backend
- `backend-hotel/src/main/java/` — Spring Boot controllers (REST + GraphQL)
- 99 total operations documented in Section 2
