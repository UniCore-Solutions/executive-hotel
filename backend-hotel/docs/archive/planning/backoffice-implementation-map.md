# ARCHIVED DOCUMENT — HISTORICAL CONTEXT ONLY

> This document is retained for historical context only. It describes a previous
> phase, proposal, or report of this project and must **not** be treated as
> current documentation or architecture.
> For the current state, see the [documentation index](../../README.md) —
> starting with `docs/architecture/architecture.md`.

---
# Back Office Implementation Map

Status: DRAFT v1 — locked decisions + backend extension scope. Final deliverable: `BACK-OFFICE-IMPLEMENTATION-REPORT.md`.

## 1. Locked decisions

| Decision | Choice | Rationale |
|---|---|---|
| App location | New sibling app `/home/hotel-executive/backoffice-hotel/` | Brief's preferred structure fits a clean Next.js app; guest app (`frontend-hotel`) keeps its "prototype/simulated" mock rules. Design system is reused by copying ui atoms + tokens. |
| Design system | Copy `frontend-hotel/src/components/ui/*` (Badge, button, dialog, dropdown-menu, input, label, skeleton, tabs) + `globals.css` tokens (navy/gold/clay/paper/ink, shadcn semantic tokens) | Same brand; no cross-app import complexity. |
| Missing ui primitives | Scaffold shadcn-style `select.tsx` (radix `@radix-ui/react-select`), `table.tsx`, `textarea.tsx`, `card.tsx` with existing tokens | Not present in guest app. |
| GraphQL client | `graphql-request` + `@tanstack/react-query` + `@graphql-codegen` (dev) if npm registry reachable; fallback: hand-rolled typed `fetch` client | Real GraphQL integration required; client is thin either way. npm reachability to be probed in Phase 6. |
| Auth | Reuse backend `login` mutation → JWT; session in `httpOnly` cookie via Next route handler; `me` on app load; hotel scoping from `me.hotelIds`; route guards client+server | Backend is authoritative (existing security review). |
| Backend authority | All writes go through new AdminService/resolvers; every admin op re-checks `super_admin` or hotel membership server-side | Rule 6 (multi-hotel isolation) — no frontend-only gates. |
| No new DB tables | New entity `Notification` maps existing `notifications` (V8). All other admin ops reuse existing tables (rooms, rate_plans, rate_plan_prices, room_type_rate_plans, rate_restrictions, availability, promotions, reviews, users, roles, user_roles, audit_logs) | `ddl-auto: validate`, no schema churn. |

## 2. Backend gap inventory (what the back office needs vs. current API)

Current API has only: `adminReservations`, `adminHotel` (name/status/roomTypes/ratePlans/availability), `login/register`, guest booking/payment/invoice/review flow. Missing for back office:

- Hotel management: create/update hotel, amenities, media — **absent**
- Room types: create/update, amenities, media — **absent**
- Rooms (physical): CRUD — **absent** (`Room` entity exists, no repository)
- Rate plans + pricing: create/update, link room-type↔rate-plan, set prices (range, EXCLUDE constraint), restrictions — **absent** (queries exist)
- Availability: update `total_inventory/out_of_order/blocked` — **absent** (read-only, 30-day window)
- Operations reads: guests, payments, invoices, promotions (all statuses), review moderation queue, notifications, audit logs, dashboard stats — **absent**
- Users & roles: list users/roles, create staff user, assign/revoke role — **absent**
- Staff cancel: `BookingService.cancel` is owner-bound — needs staff path — **absent**
- Review moderation: `moderateReview` — **absent**

## 3. Backend extension spec (Phase 3–5)

### New repositories
`RoomRepository`, `RateRestrictionRepository`, `AuditLogRepository`, `NotificationRepository` (+ `CurrencyRepository` if missing).

### New entity
`Notification` (table `notifications`, V8 — no migration needed).

### New queries (all staff-scoped; super_admin sees everything)
```
adminHotels(page) -> AdminHotelPage                    # all statuses, scoped to actor
adminHotel(hotelId) -> AdminHotel (extended)           # + hotel{...}, amenities, media, extras,
                                                        #   experiences, restaurants, faqs,
                                                        #   roomTypes incl. rooms, ratePlans incl. links+prices
adminGuests(hotelId, query, page) -> AdminGuestPage    # guests of hotel's reservations
adminPayments(hotelId, page) -> PaymentPage
adminInvoices(hotelId, page) -> InvoicePage
adminPromotions(hotelId) -> [AdminPromotion!]!
adminReviews(hotelId, status, page) -> ReviewPage      # any moderation status
adminUsers -> [AdminUser!]!                            # super_admin
adminRoles -> [AdminRole!]!
adminNotifications(hotelId, page) -> NotificationPage
adminAuditLogs(page) -> AuditLogPage                   # super_admin
adminDashboard(hotelId) -> AdminDashboard
```

### New mutations
```
createHotel(input), updateHotel(id, input)
setHotelAmenities(hotelId, amenityIds), setHotelMedia(hotelId, media)
createRoomType(hotelId, input), updateRoomType(id, input)
setRoomTypeAmenities(roomTypeId, amenityIds), setRoomTypeMedia(roomTypeId, media)
createRoom(hotelId, input), updateRoom(id, input)
createRatePlan(hotelId, input), updateRatePlan(id, input)
linkRoomTypeRatePlan(roomTypeId, ratePlanId), unlinkRoomTypeRatePlan(linkId)
setRatePlanPrices(linkId, prices)                      # replace-all; EXCLUDE overlap -> CONFLICT
updateAvailability(hotelId, rows)                      # null field = unchanged; capacity guard
createPromotion(hotelId, input), updatePromotion(id, input), setPromotionStatus(id, status)
moderateReview(id, status, response)
adminCancelReservation(reservationId, reasonCode, reasonNote)
createUser(input), assignRole(userId, roleName, hotelId), revokeRole(userRoleId)
```

### Authz rules
- `super_admin`: everything, all hotels.
- Hotel-scoped roles (`hotel_admin`, `revenue_manager`, `reservation_agent`, `reception_staff`, `content_manager`, `finance_staff`): their hotels only. IDOR → `FORBIDDEN`.
- `createUser/assignRole/revokeRole/adminUsers/adminRoles/adminAuditLogs`: super_admin only.
- `setPromotionStatus/createPromotion(platform)/updatePromotion(platform)`: super_admin only (hotel-level promotions: hotel staff).
- `adminCancelReservation`: staff of the reservation's hotel (or super_admin); bypasses owner check; keeps status guards (already-cancelled/checked-in/checked-out).
- Role assignment rules: platform roles `super_admin`/`guest` → `hotelId` must be null; hotel-scoped roles → `hotelId` required and hotel must exist.

## 4. Frontend structure (backoffice-hotel/)

```
src/app/             (auth)/login · (backoffice)/layout (persistent sidebar+topnav+breadcrumbs)
                     · dashboard · hotels/[id]? · room-types · rooms · rate-plans · pricing
                     · availability · reservations · guests · payments · invoices · promotions
                     · reviews · users (super_admin) · notifications · audit (super_admin)
src/components/      ui/ (copied + select/table/textarea/card) · layout/ · navigation/
                     tables/ · forms/ · dialogs/ · filters/ · charts/ · feedback/
src/graphql/         client.ts · queries/ · mutations/ · fragments/ · generated/ (codegen)
src/services/        auth.ts · admin.ts (typed wrappers) · errors.ts
src/hooks/           useAdminQuery/useAdminMutation (react-query), useSession
src/lib/             format.ts · dates.ts · utils.ts · validators.ts
src/types/           generated + domain
src/test/            setup.ts · helpers
e2e/                 critical workflows (Phase 11)
docs/                backoffice-architecture.md · backoffice-implementation.md
                     · backoffice-testing.md · BACK-OFFICE-IMPLEMENTATION-REPORT.md
```

## 5. Critical E2E workflows (from brief Phase 17)

1. Login (staff) → dashboard loads real stats
2. Dashboard: arrivals/departures/in-house/occupancy/revenue
3. Create hotel → appears in Hotels list
4. Create room type (with amenities/media)
5. Create room under room type
6. Create rate plan + link to room type + set prices
7. Availability screen: update inventory → persists (verified via read-back)
8. View reservation detail (from recent list)
9. Cancel reservation (staff path)
10. Users & Roles: create staff user, assign hotel-scoped role (super_admin)

## 6. Honest not-supported states

Any screen/data not backed by the API shows an explicit "Not supported by the platform" state (no fabricated data).

## 7. Final report

`docs/BACK-OFFICE-IMPLEMENTATION-REPORT.md` with the required summary line + PASS/FAIL matrix covering: layered structure, design system reuse, login, dashboard, hotels, room types, rooms, rate plans & pricing, availability, reservations, guests, payments, invoices, promotions, reviews, users/roles, notifications, audit, security review, tests, build, e2e, documentation.
