# Backend Security Review

Implemented-state review of `backend-hotel` (this report is about what the
code actually does today, not the DRAFT proposal in
`docs/archive/architecture/security-design.md`, which predates the
implementation and is superseded by this document + the implemented
behavior).

## 1. Findings (review) → fixes (implemented)

| # | Finding | Severity | Fix |
|---|---------|----------|-----|
| S1 | **Payment IDOR**: `createPayment`/`capturePayment` never checked the caller — anyone with a reservation id could pay (and learn existence of) any booking; capture was reachable anonymously | Critical | `PaymentService` requires an authenticated actor: booking **owner** (`bookedByUserId == actor.userId()`) or staff (member of the hotel / `super_admin`); anonymous → `UNAUTHORIZED`, wrong user → `FORBIDDEN`; applied to create *and* capture (tested) |
| S2 | **Cancel owner binding**: account-backed bookings could be cancelled anonymously via reference+email | High | `BookingService.cancel` refuses anonymous/foreign cancellation of account-backed bookings (`FORBIDDEN`); accountless bookings keep the self-service flow |
| S3 | **Review ownership**: `createReview` accepted any hotel + rating without proof of a stay | High | `ReviewService.create` requires a **checked-out** reservation of the caller's guest at the same hotel (`reservationId` on the input); ratings validated 1–5 |
| S4 | **JWT type confusion**: `parse` accepted tokens without checking the `type` claim | Medium | `JwtService.parse` rejects tokens whose `type != "access"` |
| S5 | **Account enumeration on register**: duplicate email returned "email already in use" | Medium | Generic `VALIDATION` ("registration failed — please check your details"); login already generic |
| S6 | **Query depth**: no bound on hostile deep queries | Medium | `MaxQueryDepthInstrumentation(15)` in `config/GraphqlConfig` (tested) |
| S7 | **Outbox constraint bug**: `chk_event_outbox_status` allowed only `pending/published/failed` while the relay claimed rows as `publishing` — **no event was ever published**; also the relay could lose rows between claim and publish | Critical (reliability) | New `V9__outbox_publishing_status.sql` extends the CHECK with `publishing`; `OutboxRelay` claim/publish/outcome run in separate `REQUIRES_NEW` transactions |
| S8 | **Hotels search SQL**: `lower(bytea)` — PostgreSQL cannot infer the parameter type when one parameter feeds both `? is null` and `'%' || ? || '%'`; the `hotels` search query (the frontend's landing page) **never worked** | High (availability) | `HotelRepository.search` split: blank query → `findAllActive`, else the pattern query; param no longer duplicated across ambiguous contexts (tested) |
| S9 | **Media IDOR**: `MediaController` upload/delete never checked the actor — any authenticated user could upload media to (or delete media of) any hotel/platform | High | `MediaStorageService` enforces owner-scoped writes: platform media → `super_admin`; hotel media → member of that hotel or `super_admin` (guest / staff of another hotel → `FORBIDDEN`; tested in `MediaUploadIntegrationTest`) |
| S10 | **JWT secret default**: `application.yaml` shipped a hardcoded dev secret as the fallback — anyone who knew it could forge tokens for arbitrary users/roles | Critical | `JWT_SECRET` is now **required** (no default; the app fails to start without it) and `JwtService` rejects secrets `< 32 bytes` or equal to the historic default (tested via config) |
| S11 | **Auth rate-limit gap**: brute-force protection covered only the REST login/register paths; the GraphQL `login`/`register` mutations (the API's primary auth surface) were unthrottled | High | `AuthRateLimitFilter` now also inspects GraphQL POST bodies (cached via `ContentCachingRequestWrapper`) and applies the same per-IP 20/min window to the auth mutations; non-auth GraphQL traffic is never limited (tested in `AuthRateLimitIntegrationTest`) |
| S12 | **CORS `*` hardcoded** | Medium | `app.cors.allowed-origins` property (default `*`, comma-separated) — deployments pin real origins; GraphiQL is now dev-profile-only |

## 2. Authorization matrix (as implemented)

| Operation | Anonymous | Owner | Staff of hotel | super_admin | Other user |
|-----------|-----------|-------|----------------|-------------|------------|
| discovery / quote / rates / availability / reviews / offers | ✓ | ✓ | ✓ | ✓ | ✓ |
| createReservation | ✓ | ✓ | ✓ | ✓ | ✓ |
| cancelReservation (accountless booking) | ✓ (ref+email) | ✓ | ✓ | ✓ | ✓ (ref+email) |
| cancelReservation (account-backed) | ✗ `FORBIDDEN` | ✓ | ✓ | ✓ | ✗ `FORBIDDEN` |
| createPayment / capturePayment | ✗ `UNAUTHORIZED` | ✓ | ✓ | ✓ | ✗ `FORBIDDEN` |
| myReservations / me | ✗ `UNAUTHORIZED` | ✓ | ✓ | ✓ | ✓ (own only) |
| adminHotel / adminReservations | ✗ | ✗ | ✓ (own hotel) | ✓ | ✗ `FORBIDDEN` |
| createReview | ✓ (guest of a checked-out reservation) | ✓ | — | — | ✓ (own stay) |
| issueInvoice | ✓ (ref+email) | ✓ | ✓ | ✓ | ✓ (ref+email) |

Guests without accounts are modelled as `guests` rows linked to reservations
(`Reservation.guest`), not users — the reference+email pair is the secret for
accountless flows (8-char random reference, unambiguous alphabet).

## 3. What is deliberately NOT in scope (residual)

- **Rate limiting is per-process**: in-memory fixed window keyed by client IP
  (REST + GraphQL auth ops). A distributed limiter (Redis) and per-account
  limits are a future decision. Reference-lookup (`reservation` by
  reference+email) remains unthrottled.
- **Refresh tokens**: short-lived access tokens only (see ADR-007).
- **Capability tokens** for check-in/ID upload: not implemented (frontend
  simulates ID upload; no backend endpoint exists).
- **Webhooks**: mock payment provider only — no inbound webhooks to verify.
- Registration is open by design (guest accounts); staff provisioning is
  database-seeded (no admin UI).

## 4. Verification

- `GraphqlApiIntegrationTest` (real HTTP + real security): anonymous payment
  → `UNAUTHORIZED`; other user → `FORBIDDEN`; staff of another hotel on
  admin queries → `FORBIDDEN`; anonymous cancel of account-backed booking →
  `FORBIDDEN`; duplicate-email register → generic message, no leak.
- `MediaUploadIntegrationTest`: owner-scoped media writes (guest / wrong
  hotel → `FORBIDDEN`, staff of the hotel → OK, platform → super_admin only).
- `AuthRateLimitIntegrationTest`: 429 after 20 auth ops/min; ordinary
  GraphQL traffic passes 30 requests.
- `BookingFlowIntegrationTest`: full lifecycle with a staff actor paying and
  capturing.
- `GraphqlConfigTest`: depth > 15 rejected, shallow queries pass.
- `DatabaseIntegrityIntegrationTest`: 18 migrations applied; every entity
  validates against the schema.