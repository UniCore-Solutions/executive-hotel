# ARCHIVED DOCUMENT — HISTORICAL CONTEXT ONLY

> This document is retained for historical context only. It describes a previous
> phase, proposal, or report of this project and must **not** be treated as
> current documentation or architecture.
> For the current state, see the [documentation index](../../README.md) —
> starting with `docs/architecture/architecture.md`.

---
# BACKEND ARCHITECTURE, SECURITY & QUALITY REVIEW REPORT

Date: 2026-08-18 · Scope: `backend-hotel` (whole codebase: structure, SOLID,
security, API correctness, reliability, tests, docs) · Platform: Spring Boot
4.1.0 / Java 21 / PostgreSQL 16 / Flyway / GraphQL / Spring Security / Kafka
/ Testcontainers.

Status: **APPROVED** — all findings fixed, full gate green
(`./mvnw clean package`: 41/41 tests, BUILD SUCCESS).

---

## 1. What was reviewed

Every finding of the architect/security/API review pass was verified against
source and fixed in place; the result was re-verified with new tests. No
schema redesign: the frozen Flyway-owned schema (V1–V9, 48 tables) is
unchanged except one additive CHECK-constraint migration (`V9`).

## 2. Critical & high findings (all fixed)

| # | Finding | Class | Fix | Proof |
|---|---------|-------|-----|-------|
| 1 | **Payment IDOR**: `createPayment`/`capturePayment` reachable by anyone (incl. anonymous) with a reservation id | Security | Owner-or-staff authz on create **and** capture; anonymous → `UNAUTHORIZED`, foreign user → `FORBIDDEN` | `GraphqlApiIntegrationTest.anonymousPaymentRejected`, `paymentRequiresOwnerOrStaff` |
| 2 | **Cancel owner binding**: account-backed bookings cancellable anonymously via reference+email | Security | `BookingService.cancel` → owner-only for account-backed bookings | `anonymousCancelOfAccountBackedBookingRejected` |
| 3 | **Outbox constraint bug**: `chk_event_outbox_status` lacked `publishing` — the relay's claim state was rejected, so **no event was ever published** | Reliability | `V9__outbox_publishing_status.sql`; relay claim/publish/outcome in separate `REQUIRES_NEW` transactions | `DatabaseIntegrityIntegrationTest` (9 migrations), `BookingFlowIntegrationTest` (outbox row asserted) |
| 4 | **Hotels search broken**: `lower(bytea)` — PostgreSQL cannot infer a parameter used in both `? is null` and `'%'||?||'%'`; the frontend's primary query never worked | Availability | `HotelRepository.search` split (blank → `findAllActive`, else pattern query) | `hotelsSortByRatingDesc`, `anonymousCanDiscoverHotels` |
| 5 | **Pricing duplicated**: booking recomputed prices in parallel to `PricingService` — client could pay ≠ quoted | SOLID | `quote()` is the single engine; booking persists exactly quote lines/extras/charges; shared `taxCharges()`/`extraLines()` | `PricingServiceIntegrationTest`, `BookingFlowIntegrationTest` totals |
| 6 | **DTO duplication**: per-service nested records for identical shapes (six `Quote` variants) | SOLID | Shared `dto/` records (33), resolvers bind them as `@Argument` types | compile + full suite |
| 7 | **Resolvers hit repositories / bypassed services & clamps** | SOLID | Thin resolvers delegate to services; admin paging clamped 1–100; admin reads moved into `CatalogQueryService` | suite |
| 8 | **Review without proof of stay**: any hotel + rating accepted | Security | `reservationId` required: caller's guest + same hotel + `checked_out`; rating 1–5 | `ReviewService` + suite |
| 9 | **JWT type claim ignored** | Security | `parse` rejects non-`access` type | suite |
| 10 | **Account enumeration on register** | Security | Generic `VALIDATION` message | `registerDuplicateEmailDoesNotEnumerate` |
| 11 | **No query-depth bound** | Security | `MaxQueryDepthInstrumentation(15)` | `GraphqlConfigTest` |
| 12 | **Sort ignored**, `checkInTime`/`checkOutTime` not serialized, availability `rooms` ignored, dead `invoice(id:)` query | API | `RATING_DESC`/`PRICE_ASC`/`NAME_ASC` implemented (bounded in-memory); `@SchemaMapping` → `HH:mm` Strings; rooms honored; `invoice` → mutation `issueInvoice(input: ReservationLookupInput!)` | `hotelsSortByRatingDesc`, `hotelTimesSerializeAsPlainStrings`, `availabilityHonorsRequestedRooms`, `issueInvoiceMutationIsIdempotent` |
| 13 | **N+1 catalog reads** | Performance | `@BatchMapping` + one SQL per field set (media/amenities/prices/review aggregates by hotel & room type) | suite |

## 3. Structure delivered

`config/ security/ service/ repository/ domain/ (flat) dto/ exception/
validation/ graphql/ event/` — plus intentionally empty `controller/` and
`mapper/` (no REST controllers; entities map 1:1 to schema — documented in
`backend-code-quality-review.md`). Layering enforced by convention:
`graphql/` never touches repositories; `service/` owns transactions, locks,
and authorization.

## 4. Verification

- `./mvnw clean package` → **41/41 tests, BUILD SUCCESS** (jar produced).
- Test pyramid: unit (`CancellationPolicyTest`, `GraphqlConfigTest`),
  Testcontainers integration against real PostgreSQL + Kafka
  (`DatabaseIntegrity`, `PricingService`, `BookingFlow`), real-HTTP GraphQL
  + real security (`GraphqlApiIntegrationTest`, 15 scenarios incl. IDOR,
  owner binding, enumeration, depth, sort, invoice).
- Frontend math pinned: quote math == `pricing.ts` (12% tax on discounted
  base, totals identity) — see `PricingServiceIntegrationTest`.

## 5. Deliverables

- Docs: `backend-architecture.md`, `graphql-api.md`, `api-testing.md`,
  `backend-security-review.md`, `backend-code-quality-review.md`,
  `frontend-contract-matrix.md`; `security.md`/`testing.md` marked
  superseded/implemented; AGENTS.md structure updated.
- Postman: `postman/Hotel-Collection-API.postman_collection.json` (+ local
  environment) covering catalog, stay/pricing, auth, booking, billing,
  reviews, admin — with token capture scripts.
- Schema: `V9__outbox_publishing_status.sql` (additive).

## 6. Known residual items (non-blocking, documented)

- No rate limiting on auth/reference endpoints (next hardening step).
- No password reset, check-in mutation, or newsletter endpoint (schema
  tables exist; frontend contract matrix lists them as ❌ future work).
- In-memory sort bound (500 candidates); revisit with a real search index.
- ArchUnit/Spotless gates not wired into the build yet.

**Verdict: APPROVED** — the backend now matches the layered architecture,
closes the security findings (no IDOR, owner binding, no enumeration, depth
limit), and is verified end-to-end by 41 green tests including real-HTTP
security scenarios.