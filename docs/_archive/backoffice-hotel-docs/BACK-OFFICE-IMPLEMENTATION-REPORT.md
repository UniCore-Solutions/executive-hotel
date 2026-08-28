# Back Office Implementation Report

**Summary:** The real Next.js back office (`backoffice-hotel/`) is fully implemented and integrated with the
real Spring Boot + GraphQL backend — every screen reads and writes through the live API (no mocks), and the
complete verification suite is green: backend 57/57 tests, frontend typecheck/lint/build, 10/10 unit tests,
and 11/11 Playwright end-to-end tests against a running backend.

## PASS / FAIL matrix

| Area | Status | Evidence |
| --- | --- | --- |
| Layered structure | PASS | `backoffice-hotel/`: `src/app` (routes), `src/components` (layout/admin/hotels/ui), `src/context`, `src/lib` (api/session/format), `src/graphql` (operations + codegen output), `e2e/`, `scripts/seed-demo.mjs`, `docs/` |
| Design system reuse | PASS | UI atoms and tokens copied from `frontend-hotel` (Badge, button, dialog, dropdown-menu, input, label, skeleton, tabs) + scaffolded select/table/textarea/card on the same tokens (navy/gold/paper/clay, Inter, `font-display`); globals.css carries the shared theme |
| Login | PASS | `/login` → `POST /api/auth/login` → JWT in httpOnly `bo_session` cookie; server guard in `(backoffice)/layout.tsx` redirects to `/login`; E2E: `auth.spec.ts` |
| Dashboard | PASS | Real `adminDashboard` stats (arrivals/departures/in-house/occupancy/revenue) + recent reservations; E2E asserts seeded `BO-DEMO-0001` and `Maria Silva` |
| Hotels | PASS | List with pagination + create hotel (`/hotels/new`) + workspace `/hotels/[id]`; E2E creates "Coral Cliff Inn" through the UI |
| Room types | PASS | CRUD + amenity assignment (`adminAmenities` catalog); E2E creates "Garden View" |
| Rooms | PASS | CRUD with status/housekeeping/maintenance; seeded room 101 visible |
| Rate plans & pricing | PASS | CRUD + link/unlink room types + `setRatePlanPrices` price periods; E2E asserts Standard Rate + €189.00 pricing |
| Availability | PASS | Inventory editor over the next 90 days (`updateAvailability`); seeded 90-day availability rendered |
| Reservations | PASS | Hotel-scoped list + status filters + full detail dialog (room lines, extras, charges) + staff cancel with reason codes; E2E opens the seeded reservation and verifies charges/totals |
| Guests | PASS | `adminGuests` deferred search; seeded Maria Silva findable |
| Payments | PASS | `adminPayments` list; seeded captured payment visible |
| Invoices | PASS | `adminInvoices` list; seeded invoice visible |
| Promotions | PASS | List + create/edit dialog + activate/deactivate; seeded "Summer Escape" visible; E2E asserts it |
| Reviews | PASS | Moderation filters + approve/reject + response |
| Users / roles | PASS | `adminUsers` + `adminRoles` + create user + assign/revoke role (super_admin only); E2E asserts the seeded admin and role |
| Notifications | PASS | `adminNotifications` list for the active hotel |
| Audit | PASS | `adminAuditLogs` page (super_admin only); E2E renders it |
| Security review | PASS | Backend remains authoritative (hotel-scoped RBAC, IDOR → FORBIDDEN); frontend adds server-side cookie guard, role-aware sidebar, and hotel-scope context; no secrets in code (JWT handled server-side in route handlers) |
| Tests | PASS | Backend `./mvnw test`: **57/57** (16 admin); frontend `vitest`: **10/10** (`format.test.ts`) |
| Build | PASS | `npx tsc --noEmit` clean; `npm run lint` 0 errors; `npm run build` succeeds (all routes) |
| E2E | PASS | Playwright (chrome, port 3101) against running backend + Postgres/Kafka: **11/11** (`auth.spec.ts`, `hotels.spec.ts`, `operations.spec.ts`) |
| Documentation | PASS | This report + `scripts/seed-demo.mjs` + Postman collection folder "8 · Back Office Admin" (21 requests) |

## Backend extensions delivered (no faking)

1. **`V11__seed_amenity_catalog.sql`** — 28 standard amenities (`ON CONFLICT (name) DO NOTHING`).
2. **`adminAmenities: [Amenity!]!`** — schema + `AdminService.amenityCatalog()` + `AmenityRepository` +
   `AdminQueryResolver.adminAmenities()` (any authenticated admin), covered by
   `adminAmenitiesReturnsSeededCatalogForAnyStaff`.
3. **DateTime scalar fix** — `GraphqlScalarConfiguration` now serializes both `Instant` (JPA entities) and
   `OffsetDateTime` (DTOs); surfaced by E2E when `adminReservations.createdAt` failed to serialize.
4. Flyway migration-count test updated to `flywayAppliedAllElevenMigrations` (11).

## Bugs found and fixed during E2E

| Bug | Fix |
| --- | --- |
| `HotelScopeProvider` never mounted (only defined) | Wrapped `(backoffice)/layout.tsx` tree; also moved to cover Sidebar/Topbar (HotelSwitcher) |
| Session state never refreshed after login (provider lives in root layout) | Login page now calls `refresh()` before navigating |
| Query-key collision `['adminHotels']` between scope context and hotels page (different queryFn shapes) | Distinct key `['hotelScope']` |
| SSR crash: `window.localStorage` in `useState` initializer | Guarded with `typeof window === 'undefined'` |
| Backend `DateTime` scalar rejected `Instant` | Custom coercing accepting Instant + OffsetDateTime |
| Rate-plan `code` stored lowercased; reservation seed used uppercase | Seed joins on `LOWER(code)` |

## How to run

```bash
# backend
cd backend-hotel && docker compose up -d && export JAVA_HOME="$HOME/.local/share/jdk/jdk-21.0.12+8"
./mvnw package -DskipTests && java -jar target/hotel-platform-0.0.1-SNAPSHOT.jar

# seed demo data (super-admin: admin@hotelcollection.test / admin123, hotel + reservation)
cd backoffice-hotel && node scripts/seed-demo.mjs

# frontend
cd backoffice-hotel && npm run build && npm run start -- -p 3101   # open http://localhost:3101

# tests
cd backoffice-hotel && npm test && npm run lint && npx playwright test
```