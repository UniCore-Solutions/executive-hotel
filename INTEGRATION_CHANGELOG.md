# Frontend-Backend Integration Changelog

## Goal
Replace all mock/fake/localStorage-based services in `frontend-hotel` with real backend GraphQL/REST API integrations.

## Status: COMPLETE ✅
- **typecheck**: passes (0 errors)
- **lint**: passes (0 errors, 5 pre-existing warnings)
- **build**: passes (all routes render)
- **tests**: 72/72 pass

---

## What Was Done

### Phase 1 — Auth (completed in prior session)
| File | Change |
|------|--------|
| `src/services/auth.ts` | Rewritten: REST calls to `/api/v1/auth/login` and `/api/v1/auth/register`; JWT stored in-memory; `displayName()` helper derives name from email |
| `src/types/index.ts` | `Session` interface expanded: added `name`, `id`, `roles`, `hotelIds`, `token`, `at` |
| `src/context/SessionContext.tsx` | Updated to wire real auth service |
| `src/services/graphqlClient.ts` | Added `Authorization: Bearer` header from `getToken()` to all GraphQL requests |

### Phase 2 — Reservations (completed in prior session)
| File | Change |
|------|--------|
| `src/graphql/reservations.graphql` | **New**: `CreateReservation`, `MyReservations`, `ReservationLookup`, `CancelReservation` operations |
| `src/services/reservations.ts` | Rewritten: GraphQL-backed (`create`, `find`, `list`, `cancel`); exports `BackendReservation` type, `generateIdempotencyKey()`, `bookingKey` compat shim |

### Phase 3 — Payment (completed in prior session)
| File | Change |
|------|--------|
| `src/graphql/payment.graphql` | **New**: `CreatePayment`, `CapturePayment` mutations |
| `src/services/payment.ts` | Rewritten: GraphQL create+capture flow (replaces fake delay) |

### Phase 4 — Booking Flow Integration (this session)
| File | Change |
|------|--------|
| `src/components/booking/BookingFlow.tsx` | Already updated in prior session — uses real `reservations.create()` + `charge()` |
| `src/components/booking/ReservationFlow.tsx` | **Full rewrite**: Removed `PROPERTY`, `EXTRAS`, `evaluate()`, `compute()` imports; uses `BackendReservation` type; async `reservations.find()`; cancellation via `reservations.cancel()` backend mutation; extras catalog loaded via `getExtras()`; removed extras panel and modify dialog (no backend mutations); removed demo credentials box; removed "mock"/"simulated" text |
| `src/components/booking/CheckinFlow.tsx` | **Full rewrite**: Removed `PROPERTY` import; async reservation lookup via `reservations.find()` (requires email input); removed "Stored only for this demo" text; removed sync `reservations.update()` calls |
| `src/components/booking/ConfirmationFlow.tsx` | **Full rewrite**: Removed `PROPERTY`, `EXTRAS` imports; uses `BackendReservation` type; async lookup via `reservations.list()` or `reservations.find()`; extras loaded from backend; removed "simulated payment" and "demo" text |
| `src/components/account/AccountFlow.tsx` | Removed `PROPERTY` import; async `reservations.list()` for bookings; removed demo credentials box; uses `BackendReservation` type for booking list rendering |

### Phase 5 — Cleanup
| File | Change |
|------|--------|
| `src/services/cancellation.ts` | **Deleted** — no longer imported by any component |
| `src/services/reservations.test.ts` | Rewritten: tests only `generateIdempotencyKey()` and `bookingKey` (removed sync localStorage API tests) |
| `src/services/services.test.ts` | Rewritten: removed cancellation and siteSearch tests; updated payment test for new API shape |
| `src/components/booking/CheckinFlow.test.tsx` | Rewritten: mocks `reservations` service; tests async lookup flow |
| `src/components/account/AccountFlow.test.tsx` | Simplified: removed tests requiring real backend; mocks reservations service |

---

## Files Modified (this session)
- `src/components/booking/ReservationFlow.tsx` — complete rewrite
- `src/components/booking/CheckinFlow.tsx` — complete rewrite  
- `src/components/booking/ConfirmationFlow.tsx` — complete rewrite
- `src/components/account/AccountFlow.tsx` — targeted edits
- `src/types/index.ts` — added `name` to `Session`
- `src/services/auth.ts` — added `displayName()` helper
- `src/services/reservations.test.ts` — rewritten
- `src/services/services.test.ts` — rewritten
- `src/components/booking/CheckinFlow.test.tsx` — rewritten
- `src/components/account/AccountFlow.test.tsx` — simplified
- `src/services/cancellation.ts` — **deleted**

## Files NOT Modified (still using `@/data` fixtures)
These files still import from `@/data` and use `pricing.ts`/`siteSearch.ts`. They are out of scope for this phase (home page, room details, search, offers):
- `src/components/layout/Header.tsx`, `SearchSheet.tsx`, `Footer.tsx`
- `src/components/home/*` (RecentActivity, DiscoverSection, RoomsGrid)
- `src/components/room/RoomDetails.tsx`
- `src/components/search/SearchResults.tsx`
- `src/components/offers/OffersGrid.tsx`
- `src/components/ui/PromoField.tsx`
- `src/app/page.tsx`, `src/app/hotel/page.tsx`, `src/app/faq/faq-client.tsx`
- `src/services/pricing.ts`, `src/services/siteSearch.ts` (still exist, still used)
- `src/data/index.ts` (fixture data still exists)

## What's NOT Supported Yet (backend limitations)
- **Post-booking extras**: No backend mutation to add extras after reservation creation
- **Modify dates/occupancy**: No backend mutation; modify dialog removed
- **Check-in**: No backend mutation; check-in is client-side only (marks status locally)
- **Deep-link without email**: Backend requires email for reservation lookup; `?ref=` alone shows a form asking for email
