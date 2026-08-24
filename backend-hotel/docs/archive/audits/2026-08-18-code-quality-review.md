# ARCHIVED DOCUMENT — HISTORICAL CONTEXT ONLY

> This document is retained for historical context only. It describes a previous
> phase, proposal, or report of this project and must **not** be treated as
> current documentation or architecture.
> For the current state, see the [documentation index](../../README.md) —
> starting with `docs/architecture/architecture.md`.

---
# Backend Code Quality Review

Implemented-state review of `backend-hotel`: structure, SOLID, duplication,
and N+1 findings with their fixes. Companion to `backend-architecture.md`
(target structure) and `backend-security-review.md`.

## 1. Findings → fixes

| # | Finding | Severity | Fix |
|---|---------|----------|-----|
| Q1 | **Package soup / no layers**: `application.*`/`infrastructure.*`/`web.*`/`domain.<sub>` packages mixed concerns; there was no `validation/`, `exception/`, `dto/`, `config/` or `event/` | High | Restructure to `config/ security/ controller/ service/ repository/ domain/ (flat) dto/ mapper/ exception/ validation/ graphql/ event/` (see architecture doc) |
| Q2 | **DTO duplication**: every service defined its own nested records for the same shapes (six `Quote` variants, per-service `LoginInput`/`CreatePaymentInput`, …) — contract drift between resolver and service | High | Shared records in `dto/` (33 files); services and resolvers use them; GraphQL `@Argument` types bind directly |
| Q3 | **Pricing duplicated**: booking recomputed prices with its own loops (rate plan lookup, tax, extras, promo), diverging from `PricingService` — client could pay a different total than quoted | Critical | `PricingService.quote()` is the single engine; `BookingService.create` persists exactly the quote's lines/extras/charges; `taxCharges()`/`extraLines()` shared with `InvoiceService` |
| Q4 | **Resolvers did repository work**: `QueryResolver`/`MutationResolver` hit repositories directly, bypassed services and clamps (e.g. admin pages) | High | Resolvers delegate to services; page/size clamped in `BookingService.adminReservations` (1..100); `CatalogQueryService` exposes admin reads (`ratePlans`, `availability`) |
| Q5 | **Sort ignored**: `hotels` accepted `sort` but never applied it | Medium | `CatalogQueryService.search` implements `NAME_ASC` / `PRICE_ASC` / `RATING_DESC` (bounded in-memory, `MAX_SORT_CANDIDATES = 500`, documented trade-off) |
| Q6 | **N+1 on catalog fields**: per-hotel media/amenities/prices/reviews queries | Medium | `@BatchMapping` + one batched SQL per field (`mediaByHotelIds`, `mediaByRoomTypeIds`, `minPriceByHotelIds/RoomTypeIds`, `amenitiesByHotelIds`, `avgRatingByHotelIds`) |
| Q7 | **checkInTime/checkOutTime serialization**: `LocalTime` mapped to `String` in schema but not serialized as `HH:mm` | Medium | `@SchemaMapping` to `String` (tested) |
| Q8 | **Validation ad hoc**: scattered hand-rolled checks with inconsistent messages | Medium | `validation/Validation` helpers (`requireNotBlank`, `requirePositive`, `requireEmail`), applied in Auth/Booking/Payment/Availability/Review |
| Q9 | **Global exception handling / error taxonomy** | Low | `exception/DomainException` with code taxonomy (`NOT_FOUND`, `FORBIDDEN`, `CONFLICT`, `VALIDATION`, `UNAUTHORIZED`) mapped by `GraphqlExceptionAdvice` |
| Q10 | **`controller/`, `mapper/` layers absent**: no REST controllers; entities map 1:1 to schema so a mapper layer would be ceremony | — | Deliberately empty, documented here; if a REST API or DTO views are added later, these packages are the home |
| Q11 | **`avgRatingByHotelIds` batch query added** to `ReviewRepository` (single query for a hotel set) | — | Implemented with `coalesce(avg(r.rating), 0)` |

## 2. Layer rules enforced today

- `graphql/` imports only `service/`, `dto/`, `security/`, `exception/` and
  `domain/` types — no repositories.
- `service/` owns transactions (`@Transactional` on public methods), locks,
  and authorization; repositories contain queries only.
- Entities carry no business logic except value-safe helpers (`sell()`,
  `release()`, `MoneyUtil`); pure domain rules (`CancellationPolicy`) are
  plain classes unit-tested without Spring.
- Batch mappings collapse catalog N+1s into one SQL each; `open-in-view:
  false` forces explicit fetching for graph edges the API exposes.

## 3. Remaining known smells (documented, accepted)

- `BookingService` still holds a few direct repository lookups (rate plans,
  taxes) that could be extracted; acceptable at current size.
- `CatalogQueryService` in-memory sort bound (500) — revisit when the catalog
  grows (real search index).
- Eager SUBSELECT loads on `Reservation` children cost +4 queries per load.
- No ArchUnit/Spotless gates wired into the build yet (docs/testing.md
  describes the intended gates; wiring them is follow-up work).