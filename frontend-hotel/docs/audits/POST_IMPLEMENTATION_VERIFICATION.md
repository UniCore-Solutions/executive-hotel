# Post-Implementation Verification Report

**Date:** 2026-08-26
**Scope:** Guest frontend (`frontend-hotel`) mock removal, availability/pricing backend integration
**Auditor:** opencode Post-Implementation Verification Engineer

---

## 1. Executive Summary

The implementation removes mock data fallbacks from the guest frontend's availability and pricing flows and wires them to the real backend. The core search → catalog → availability → pricing → booking flow is **functionally connected and verified end-to-end**. The backend quote engine is correctly called from the booking page, and search results come from the real `staySearch` GraphQL query.

However, the implementation is **not production-ready** due to:

- **Critical pricing display bugs**: the QuoteTable hardcodes "Taxes & fees (12%)" while the backend uses dynamic multi-rate tax/fee calculation (5% + 12% = 17% in seed data); the frontend `feeAmount` from the backend is silently dropped.
- **No error handling on availability/pricing API calls**: backend failures leave the user on an infinite loading skeleton with no error message or retry option.
- **Significant remaining mock infrastructure**: pricing.ts, cancellation.ts, siteSearch.ts, reservations.ts, auth.ts, and payment.ts still use fixture/localStorage data for non-search flows.
- **Two parallel pricing engines**: `compute()` (local, hardcoded 12% tax) and `getQuote()` (backend, dynamic tax) produce different results on different pages.

**Verdict: FAIL — requires fixes before production deployment.**

---

## 2. Scope

### Changes reviewed
- **30 modified files** across frontend-hotel, backend-hotel, and backoffice-hotel
- **18 new untracked files** (10 frontend, 3 backend, 5 backoffice)
- Net change: **+1,540 / -1,077 lines** modified + ~35.9 KB new files

### Key changes
| Area | Files | Purpose |
|------|-------|---------|
| Mock removal | `catalog.ts`, `availability.ts`, `extras.ts`, `graphqlClient.ts`, `pricingHydration.ts`, `homepage.ts`, `platform.ts` | Remove `useGraphql` toggle and mock fallbacks |
| Backend integration | `quote.ts`, `quote.graphql`, `staySearch.graphql`, `hotelList.graphql`, `hotelList.ts` | New GraphQL operations and services |
| Booking pricing | `BookingFlow.tsx` | Replace local `compute()` with backend `getQuote()` |
| Backend API | `StaySearchGraphQLController.java`, `StaySearchInput.java`, `StaySearchRoom.java`, `availability.graphqls` | New `staySearch` query |
| Test updates | `availability.test.ts`, `pricing.test.ts` | Update tests for removed mock functions |
| Error boundaries | `error.tsx`, `global-error.tsx`, `not-found.tsx` (frontend + backoffice) | Global error handling |
| UI improvements | `SearchBar.tsx`, `SearchResults.tsx`, `SearchSheet.tsx`, `DestinationPicker.tsx`, `MobileBottomBar.tsx` | Search UX enhancements |

---

## 3. Changes Reviewed

### What was changed and why

1. **`useGraphql` toggle removed** (`graphqlClient.ts`): The conditional `if (!useGraphql) return` pattern that switched between mock data and real API calls has been completely removed. All service functions now always call the backend.

2. **Mock fallbacks removed from catalog services** (`catalog.ts`): `getRoomTypes`, `getOffers`, `getReviews`, `getExperiences`, `searchStay`, `getStay`, `getStayRoom`, `getProperty`, `getHotelById` — all had `catch` blocks that returned fixture data. These have been removed; errors now propagate to callers.

3. **Availability utilities stripped** (`availability.ts`): All mock data functions (`availabilityFor`, `plansFor`, `searchRooms`, `getStay`, `getStayRoom`, `getProperty`, `getPlans`, `getRoom`, `getAvailability`, `getOffers`, `getExtras`, `getReviews`, `delay`) removed. Only pure utility functions remain (`demandFor`, `fitsGuests`, `filterEntries`, `makeRoomUrl`, `normDate`, `image`).

4. **Booking pricing moved to backend** (`BookingFlow.tsx`): Replaced local `compute()` with async `getQuote()` call via GraphQL. Added `quoteState` with request cancellation via `reqId` ref.

5. **New backend query** (`StaySearchGraphQLController.java`): Implements `staySearch` — accepts `StaySearchInput`, returns `StaySearchRoom[]` with availability status, capacity fit, and rate options per room type.

6. **New frontend quote service** (`quote.ts`): Maps backend `Quote` response to frontend `PriceBreakdown` type for the booking flow sidebar.

### Is the implementation consistent with the requirement?

**Partially.** The requirement was to remove mock fallbacks and wire to real backend. This is done for:
- ✅ Search results (`searchStay` → backend)
- ✅ Room detail availability (`getStayRoom` → backend)
- ✅ Booking pricing (`getQuote` → backend quote engine)
- ✅ Hotel list (`getHotelList` → backend)
- ✅ Homepage/platform content (`getHomepage`, `getPlatformContent` → backend)
- ❌ Cancellation pricing — still uses `DATA.PROPERTY.rooms` for `pricePerNight`
- ❌ Site search — entirely local fixture-based
- ❌ Reservation store — still localStorage-based
- ❌ Auth — still localStorage mock

---

## 4. Environment & Test Setup

| Item | Value |
|------|-------|
| Frontend | Next.js 16.3.0 (Turbopack), TypeScript strict |
| Backend | Spring Boot 4.1.0, Java 21, PostgreSQL 16 |
| Test runner | Vitest 4.1.10 |
| Linter | ESLint (next) |
| Build | `next build` (Turbopack) |

---

## 5. Build & Startup Results

### Frontend

| Check | Result |
|-------|--------|
| `npm run typecheck` | **PASS** — 0 errors |
| `npm run lint` | **PASS** — 0 errors, 4 pre-existing warnings |
| `npm test` | **PASS** — 99/99 tests pass |
| `npm run build` | **PASS** — 19 routes generated, no errors |

### Backend

| Check | Result |
|-------|--------|
| Schema alignment | **PASS** — all frontend queries match backend `.graphqls` types |
| Java DTO alignment | **PASS** — `StaySearchInput`/`StaySearchRoom` match GraphQL schema |
| Migration count | 20 migrations (V1–V20), no gaps, no pending |
| Seed data FK integrity | **PASS** — all foreign keys satisfied |

---

## 6. Functional Test Results

### Happy path — Search
- `SearchResults.tsx:99` → `searchStay()` → `gqlRequest(StaySearchDocument)` → backend `staySearch` resolver → `AvailabilityServiceImpl.check()` + `PricingServiceImpl.rates()` → response mapped to `SearchResultEntry[]`
- **VERIFIED** — complete chain traced, schema alignment confirmed

### Happy path — Room detail
- `RoomDetails.tsx:187` → `getStayRoom()` → 5 parallel `gqlRequest` calls → backend resolvers → response assembled
- **VERIFIED**

### Happy path — Booking pricing
- `BookingFlow.tsx:198-232` → `getQuote()` → `gqlRequest(QuoteDocument)` → backend `PricingServiceImpl.quote()` → response mapped to `PriceBreakdown`
- **VERIFIED** — but with mapping bugs (see findings)

### Failure cases — Backend unreachable
- `SearchResults.tsx:105` — `searchStay()` has NO `.catch()`. Unhandled rejection → skeleton shown forever.
- `RoomDetails.tsx:191` — `getStayRoom()` has NO `.catch()`. Unhandled rejection → pulse skeleton forever.
- **NOT VERIFIED** — no error UI exists for these cases

### Invalid inputs
- Backend validates: dates (checkOut > checkIn), positive rooms/adults, valid UUID combinations, rate plan links
- Frontend validates: email, phone, card number, expiry, CVC
- **VERIFIED** — backend validation is comprehensive

---

## 7. Availability Analysis

### How availability works

```
Frontend SearchResults.tsx
  → catalog.ts:searchStay()          [GraphQL: StaySearchDocument]
    → StaySearchGraphQLController.staySearch()
      → AvailabilityServiceImpl.check(input)
        → AvailabilityRepository.findByRoomTypeIdsAndRange(ids, checkIn, checkOut-1)
        → For each room type × night:
            free = totalInventory - roomsSold - outOfOrder - blocked
        → minFree across all nights
        → status: minFree < rooms → soldout | minFree ≤ 2 → few | else → available
      → PricingServiceImpl.rates(hotelId, roomTypeId, checkInDate)
    ← StaySearchRoom[] with status + capacityFits + rates
  ← map to SearchResultEntry[]
  ← UI renders cards
```

### Source of inventory
- **`room_types.total_inventory`** — integer per room type (default 10), set in `V12__sparse_availability.sql`
- **`availability` table** — sparse rows, only nights with activity (12 rows in seed data)

### Overbooking prevention (5 layers)
1. **DB trigger `trg_availability_capacity`** — prevents `rooms_sold + out_of_order + blocked > total_inventory`
2. **DB trigger `trg_room_types_inventory`** — prevents reducing `total_inventory` below current max sales
3. **Optimistic lock** — `@Version` on `Availability.version` field
4. **Pessimistic lock** — `PESSIMISTIC_WRITE` for booking mutations
5. **App-level guard** — `Availability.sell()` checks `free >= rooms`

### Which layer is authoritative?
**Backend database** — all availability checks go through `AvailabilityServiceImpl.check()` which reads from PostgreSQL. The frontend has no local availability calculation.

### Concurrent reservation handling
- Pessimistic write lock on availability rows during booking
- Optimistic lock with version field for concurrent updates
- DB triggers as final safety net
- **VERIFIED** at code level; not tested at runtime (requires concurrent load test)

---

## 8. Pricing Analysis

### How pricing works

**Search result prices:**
```
Backend PricingServiceImpl.rates(hotelId, roomTypeId, checkInDate)
  → RoomTypeRatePlanRepository.findActiveLinks(hotelId, roomTypeId)
  → RatePlanRepository.findByIdIn(...)
  → RatePlanPriceRepository.findCurrentPrice(linkId, checkInDate)
  → Return: code, name, price, currency, cancellationPolicy, isRefundable
```

**Booking page prices:**
```
Frontend BookingFlow.tsx → getQuote() → GraphQL QuoteDocument
  → Backend PricingServiceImpl.quote(input):
    1. Validate dates
    2. For each room: look up (roomTypeId, ratePlanId) → currentPrice → rate × nights
    3. Promo: DB lookup → validate → compute discount
    4. Tax/fee: query tax_fee_types per hotel → dynamic calculation per method
    5. Extras: DB lookup → compute per pricing model
    6. Total = (subtotal - discount) + tax + fee + extrasTotal
  → Frontend maps to PriceBreakdown
```

### Discrepancies found

| Issue | Severity | Details |
|-------|----------|---------|
| **`feeAmount` dropped** | HIGH | Backend returns `feeAmount` separately from `taxAmount`. Frontend `quote.ts:58` maps only `taxAmount` → `taxes`. Fees are invisible. `quote.ts:44-63` |
| **Hardcoded "12%" label** | HIGH | `QuoteTable.tsx:38` shows "Taxes & fees (12%)" but actual rates vary by hotel (5%+12%=17% for hotel 1, 8%+10%=18% for hotel 2) |
| **`perNight`/`nights` from `lines[0]` only** | MEDIUM | `quote.ts:46-47` — incorrect with multiple room types at different rates |
| **Hardcoded `currency: 'MAD'`** | MEDIUM | `BookingFlow.tsx:343` — reservation snapshot hardcodes MAD instead of using `quote.currency` |
| **Duplicate FX tables** | LOW | `lib/format.ts:4` and `services/catalog.ts:40-45` have separate FX rate definitions |
| **Two pricing engines** | INFO | `compute()` (local, 12% hardcoded) vs `getQuote()` (backend, dynamic) on different pages |

---

## 9. API Verification

### GraphQL queries used by frontend

| Query | Frontend file | Backend resolver | Status |
|-------|--------------|-----------------|--------|
| `StaySearch` | `staySearch.graphql` | `StaySearchGraphQLController.staySearch()` | ✅ Aligned |
| `Quote` | `quote.graphql` | `RateGraphQLController.quote()` | ✅ Aligned |
| `HotelList` | `hotelList.graphql` | `CatalogGraphQLController.hotels()` | ✅ Aligned |
| `RoomTypeById` | `catalog.ts` inline | `CatalogGraphQLController.roomType()` | ✅ Aligned |
| `HotelById` | `catalog.ts` inline | `CatalogGraphQLController.hotel()` | ✅ Aligned |
| `StayAvailability` | `catalog.ts` inline | `AvailabilityGraphQLController.availability()` | ✅ Aligned |
| `StayRates` | `catalog.ts` inline | `RateGraphQLController.rates()` | ✅ Aligned |
| `HotelRoomTypes` | `catalog.ts` inline | `CatalogGraphQLController.roomTypes()` | ✅ Aligned |

### Schema alignment
All frontend-generated types (`graphql/generated/graphql.ts`) match the backend `.graphqls` schemas. No field mismatches, no type mismatches, no missing fields.

### Authorization
- `quote` — public (no auth required) ✅ Intentional
- `staySearch` — public ✅ Intentional
- `rates` — public ✅ Intentional
- All admin mutations — require `super_admin` or `inHotel` ✅

---

## 10. Authentication & Authorization

### Current state
- Frontend auth is **fully localStorage-based mock** (`auth.ts`)
- No JWT token is sent with GraphQL requests (`graphqlClient.ts:30-37`)
- Backend accepts unauthenticated requests for catalog/pricing/quote endpoints
- Backend requires JWT for admin mutations, payment, identity

### Assessment
This is **intentional per AGENTS.md Rule 8**: "payment, auth, check-in ID upload are simulated." The prototype explicitly documents this limitation.

---

## 11. Security Audit

| Area | Finding | Severity |
|------|---------|----------|
| `.env` with real secrets on disk | `JWT_SECRET` and `POSTGRES_PASSWORD` in `/home/hotel-executive/.env:13,20` | CRITICAL |
| No general rate limiting | Only auth endpoints rate-limited; booking/payment/GraphQL unprotected | HIGH |
| No query complexity analysis | Depth limit (15) exists but no field-cost analysis | MEDIUM |
| CORS defaults to `*` | Base config allows any origin; prod overlay requires explicit origins | MEDIUM |
| No `@Valid` bean validation | All validation is manual in service layer | LOW |
| Authorization service-layer only | No controller-level safety net for forgotten `require()` calls | LOW |
| No SQL injection | All queries parameterized | GOOD |
| No XSS | React escaping, no `eval()`, `dangerouslySetInnerHTML` only for static JSON-LD | GOOD |
| Error handling | `GraphqlExceptionHandler` returns generic messages, logs server-side | GOOD |
| File upload security | Path traversal protection, magic-byte validation, size limits, extension whitelist | EXCELLENT |
| Password hashing | BCrypt strength 12, minimum 6 chars | GOOD |
| Introspection disabled in production | `application.yaml:78-79` | GOOD |
| Security headers | CSP, X-Frame-Options DENY, nosniff on both frontend and backend | GOOD |

---

## 12. Database Integrity

### Schema
- 20 Flyway migrations (V1–V20), no gaps, no pending
- All tables use UUID primary keys (post-V20)
- Foreign keys properly defined with cascading behavior

### Seed data
- 3 hotels, 9 room types, 6 rate plans, 18 prices, 12 availability rows, 12 extras, 3 promotions, 6 tax/fee types
- All FK relationships satisfied
- All availability rows pass capacity triggers (4 at exact limit)
- Atomic seed (wrapped in `BEGIN`/`COMMIT`)

### Availability invariants
- `trg_availability_capacity` — prevents overselling at row level
- `trg_room_types_inventory` — prevents reducing inventory below current sales
- Unique constraint on `(room_type_id, stay_date)`
- Optimistic locking via `version` column

---

## 13. Frontend Verification

### What's connected to backend (verified)
- ✅ Search results (`searchStay` → GraphQL)
- ✅ Room detail data (`getStayRoom` → 5 GraphQL queries)
- ✅ Booking pricing (`getQuote` → GraphQL)
- ✅ Hotel list (`getHotelList` → GraphQL)
- ✅ Homepage content (`getHomepage`, `getPlatformContent` → GraphQL)
- ✅ Extras catalog (`getExtras` → GraphQL)
- ✅ `useGraphql` toggle — zero occurrences remaining

### What's still mock/localStorage
- ❌ `pricing.ts` — `compute()` defaults to `DATA.OFFERS` / `DATA.EXTRAS` if hydration hasn't run
- ❌ `cancellation.ts` — reads `pricePerNight` and `cancellationPolicy` from `DATA.PROPERTY.rooms`
- ❌ `siteSearch.ts` — entire site search runs against fixture data
- ❌ `reservations.ts` — localStorage-backed, seeded with `DATA.DEMO_RESERVATIONS`
- ❌ `auth.ts` — localStorage mock with simulated delays
- ❌ `payment.ts` — simulated payment with `delay(1600)`
- ❌ `newsletter.ts` — localStorage mock

### Remaining `DATA.` imports affecting business logic
| File | Import | Impact |
|------|--------|--------|
| `pricing.ts:16-17` | `DATA.OFFERS`, `DATA.EXTRAS` | Pricing fallback to fixture data |
| `cancellation.ts:15` | `DATA.PROPERTY.rooms` | Cancellation uses fixture pricing |
| `siteSearch.ts:15-30` | `DATA.PROPERTY.rooms`, `DATA.OFFERS`, etc. | Entirely local |
| `reservations.ts:41` | `DATA.DEMO_RESERVATIONS` | Demo seed data |
| `RoomDetails.tsx:143` | `EXTRAS` | Fixture extras default |
| `ReservationFlow.tsx:70` | `EXTRAS` | Fixture extras for modify flow |
| `OffersGrid.tsx:38` | `PROPERTY.rooms[0]` | Probe room for promo feasibility |

---

## 14. UI/UX Audit

### Booking flow
- ✅ Two-step form (guest details → payment) with validation
- ✅ Live price summary in sidebar
- ✅ Promo code field
- ✅ Extras picker
- ✅ Loading state ("Calculating price…") while quote loads
- ✅ Error state for invalid quotes
- ⚠️ Hardcoded "Taxes & fees (12%)" label is misleading
- ⚠️ No backend error handling — infinite skeleton if backend down

### Search results
- ✅ Skeleton loading state
- ✅ Filter/sort functionality
- ✅ Promo code applied to search results
- ⚠️ No error state for backend failure

### Room detail
- ✅ Loading skeleton
- ✅ "Nothing to book yet" empty state
- ✅ Backend-first with fixture fallback for legacy deep-links
- ⚠️ No error state for backend failure

---

## 15. Responsive/Mobile Audit

- ✅ `MobileBottomBar.tsx` — new mobile navigation component
- ✅ `DestinationPicker.tsx` — mobile-optimized search destination
- ✅ CSS includes responsive utilities (`globals.css`)
- ✅ Tailwind responsive breakpoints used throughout components
- ⚠️ Visual testing not possible without running the app in a browser — **NOT VERIFIED**

---

## 16. Automated Tests

### Frontend tests
| Suite | Tests | Status |
|-------|-------|--------|
| `availability.test.ts` | 8 tests (fitsGuests, demandFor, filterEntries) | ✅ PASS |
| `pricing.test.ts` | 10 tests (validatePromo, compute, promoDiscount) | ✅ PASS |
| Other test files | 81 tests | ✅ PASS |
| **Total** | **99 tests** | **ALL PASS** |

### Test quality observations
- `availability.test.ts` — tests utility functions only; no integration tests for the full search flow
- `pricing.test.ts` — tests local `compute()` engine; no tests for `getQuote()` (backend quote service)
- No E2E tests for the search → book flow
- No tests for error handling paths

### Backend tests
- Backend test suite not run (requires Docker/Testcontainers infrastructure)
- **NOT VERIFIED**

---

## 17. Regression Tests

### Flows verified against regressions
| Flow | Previous state | Current state | Regression? |
|------|---------------|--------------|-------------|
| Search results display | Mock fallback on error | No fallback, error propagates | ⚠️ Behavior change — no error UI |
| Room detail loading | Mock fallback on error | No fallback, error propagates | ⚠️ Behavior change — no error UI |
| Booking pricing | Local `compute()` | Backend `getQuote()` | ⚠️ Different pricing engine |
| Hotel list | Mock fallback on error | No fallback, error propagates | ⚠️ Behavior change |
| Homepage content | Mock fallback on error | Empty arrays on error | ⚠️ Behavior change |

### No regressions in
- ✅ Test suite passes (99/99)
- ✅ Build succeeds
- ✅ Type checking passes
- ✅ Lint passes

---

## 18. Code Quality Review

### Positive findings
- Clean service boundary separation (catalog.ts → graphqlClient.ts → backend)
- Request cancellation via `reqId` ref in BookingFlow
- Consistent mapping functions (`mapRoomTypeToRoom`, `mapAvailabilityStatus`, `ratePlansForRoom`)
- No circular dependencies
- Single source of truth for types

### Issues
| Issue | Location | Severity |
|-------|----------|----------|
| `_rooms` unused variable warning | `catalog.ts:94` | LOW |
| `.catch(() => {})` silent swallow | `BookingFlow.tsx:159` (getExtras) | MEDIUM |
| Duplicate FX rate tables | `lib/format.ts:4` vs `catalog.ts:40-45` | LOW |
| `availability.ts:6` imports unused `toISODate` | Fixed in this session | LOW (was) |

---

## 19. Findings

| ID | Severity | Area | Finding | Evidence | Status |
|----|----------|------|---------|----------|--------|
| F01 | **CRITICAL** | Pricing display | `feeAmount` from backend Quote is silently dropped — fees invisible to users | `quote.ts:58` maps only `raw.taxAmount`, not `raw.feeAmount` | OPEN |
| F02 | **HIGH** | Pricing display | QuoteTable hardcodes "Taxes & fees (12%)" but actual rates vary by hotel (17-18% in seed data) | `QuoteTable.tsx:38` vs `seed.sql:263-268` | OPEN |
| F03 | **HIGH** | Error handling | `SearchResults.tsx:105` has no `.catch()` — backend failure shows infinite skeleton | `SearchResults.tsx:99-117` | OPEN |
| F04 | **HIGH** | Error handling | `RoomDetails.tsx:191` has no `.catch()` — backend failure shows infinite skeleton | `RoomDetails.tsx:185-216` | OPEN |
| F05 | **HIGH** | Security | `.env` file with real JWT_SECRET and POSTGRES_PASSWORD on disk | `/home/hotel-executive/.env:13,20` | OPEN |
| F06 | **HIGH** | Mock data | `pricing.ts:16-17` defaults to `DATA.OFFERS`/`DATA.EXTRAS` — pricing engine can silently use fixture data | `pricing.ts:16-17` | OPEN |
| F07 | **MEDIUM** | Pricing mapping | `perNight`/`nights` taken from `lines[0]` only — incorrect with multiple room types | `quote.ts:46-47` | OPEN |
| F08 | **MEDIUM** | Pricing mapping | BookingFlow hardcodes `currency: 'MAD'` in reservation snapshot | `BookingFlow.tsx:343` | OPEN |
| F09 | **MEDIUM** | Promo validation | Backend `applyPromo()` missing booking window and plan eligibility checks that frontend `validatePromo()` has | `PricingServiceImpl.java:273-296` vs `pricing.ts:55-78` | OPEN |
| F10 | **MEDIUM** | Mock data | `siteSearch.ts` runs entirely against fixture data — never hits backend | `siteSearch.ts:15-30` | OPEN |
| F11 | **MEDIUM** | Mock data | `cancellation.ts` reads `pricePerNight` from `DATA.PROPERTY.rooms` | `cancellation.ts:15` | OPEN |
| F12 | **MEDIUM** | Error handling | `BookingFlow.tsx:159` `.catch(() => {})` silently swallows extras fetch errors | `BookingFlow.tsx:159` | OPEN |
| F13 | **LOW** | Code quality | Duplicate FX rate tables in `lib/format.ts:4` and `services/catalog.ts:40-45` | Both files | OPEN |
| F14 | **LOW** | Code quality | `_rooms` unused variable warning in `catalog.ts:94` | `catalog.ts:94` | OPEN |
| F15 | **INFO** | Architecture | Two parallel pricing engines (`compute()` local vs `getQuote()` backend) — any rule change must be applied to both | `pricing.ts` vs `quote.ts` | OPEN |

---

## 20. Remaining Risks

1. **Pricing accuracy**: The `feeAmount` drop (F01) means the booking total shown to users may not include all fees. If a hotel configures fee-type charges (service fee, resort fee, etc.), they will be charged but not displayed.

2. **Misleading tax label**: The hardcoded "12%" (F02) gives users incorrect expectations about tax amounts.

3. **Poor error UX**: No error handling (F03/F04) means any backend outage leaves users on infinite loading screens with no way to recover.

4. **Dual pricing engines**: The local `compute()` on the room detail page uses hardcoded 12% tax while the backend uses dynamic rates — users may see different totals on different pages.

5. **Security**: The `.env` file (F05) must never be pushed to a remote repository.

6. **Remaining mock infrastructure**: While the core search/availability/pricing path is connected, cancellation, site search, reservations, and auth are still mock — these must be addressed in subsequent phases.

---

## 21. Recommended Fixes

### Must fix (before production)
1. **F01**: Map `feeAmount` in `quote.ts` — either add to `PriceBreakdown` or combine with `taxAmount`
2. **F02**: Replace hardcoded "12%" in `QuoteTable.tsx` with dynamic label (e.g., "Taxes & fees")
3. **F03/F04**: Add `.catch()` with error state to `SearchResults.tsx` and `RoomDetails.tsx`
4. **F05**: Rotate exposed secrets and ensure `.env` is gitignored and never committed

### Should fix (before next phase)
5. **F07**: Handle multi-room-type `perNight`/`nights` correctly in `quote.ts`
6. **F08**: Use `quote.currency` instead of hardcoded `'MAD'` in `BookingFlow.tsx:343`
7. **F09**: Add booking window and plan eligibility validation to backend `applyPromo()`
8. **F06**: Remove `DATA.OFFERS`/`DATA.EXTRAS` defaults from `pricing.ts` — make hydration mandatory
9. **F12**: Replace `.catch(() => {})` with user-facing error message

### Nice to have
10. **F13**: Consolidate FX rate tables
11. **F14**: Fix unused variable warning
12. **F15**: Document the two-engine strategy in DECISIONS.md

---

## 22. Final Verdict

**FAIL**

### Reasoning

The core objective — removing mock fallbacks and wiring to real backend — is **achieved for the primary search/availability/pricing flow**. The implementation is architecturally correct, the backend integration is clean, and all tests pass.

However, **three categories of issues prevent production readiness**:

1. **Pricing display bugs** (F01, F02): The `feeAmount` is silently dropped and the tax label is hardcoded to an incorrect percentage. These directly affect user-facing pricing accuracy — a business-critical concern for a booking system.

2. **No error handling** (F03, F04): Every backend API call in the availability/pricing path lacks error handling. Any backend outage results in infinite loading states with no user-facing error message or retry mechanism.

3. **Significant remaining mock infrastructure** (F06, F10, F11): While the search/booking path is connected, cancellation pricing, site search, and other flows still depend on fixture data, meaning the system cannot function as a standalone product.

These issues must be resolved before the implementation can be considered production-ready.
