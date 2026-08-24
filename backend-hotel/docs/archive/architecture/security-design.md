# ARCHIVED DOCUMENT — HISTORICAL CONTEXT ONLY

> This document is retained for historical context only. It describes a previous
> phase, proposal, or report of this project and must **not** be treated as
> current documentation or architecture.
> For the current state, see the [documentation index](../../README.md) —
> starting with `docs/architecture/architecture.md`.

---
# Security Architecture

> STATUS: SUPERSEDED — this document is the original DRAFT proposal (pre-
> implementation). The implemented behavior is described in
> `backend-security-review.md` and enforced in code (JWT, RBAC + hotel
> scoping, GraphQL error codes). Differences that matter: the API is GraphQL
> only (no `/api/v1/auth/refresh`), and authorization is checked in
> services/resolvers rather than `@PreAuthorize`.

## 1. Threat model summary

Multi-hotel platform; the top risks are **cross-hotel access (IDOR)**, credential handling, guest-data exposure (PII), and webhook/API abuse. Mitigations are enforced at three layers: database (see database.md §5), application (authorization), and API (validation + error discipline).

## 2. Identity model (reuses existing tables)

- `users` — staff and (optionally) guests with accounts; `password_hash` BCrypt (strength 12) or Argon2id; email normalized lowercase, unique.
- `guests` — booking profiles; may exist without a user account (`user_id` nullable).
- `roles` / `permissions` / `role_permissions` — RBAC matrix (e.g. `hotel_admin`, `revenue_manager`, `reservation_agent`, `reception_staff`, `finance_staff`, `super_admin`).
- `user_roles` — assignment scoped by `hotel_id` (NULL = platform-level role). A principal's effective permissions = union of platform roles + roles for the hotels they manage.

## 3. Authentication

Two modes:

1. **Account login (staff + guests with accounts)** — stateless JWT:
   - Access token: JWT (HS256/RS256), ~15 min TTL, claims: `sub`, `name`, `roles`, `hotels` (set of hotel ids with roles), `type=access`.
   - Refresh token: opaque, stored hashed server-side (30-day rotation), issued via `/api/v1/auth/refresh`. (Alternative: pure short-lived tokens without refresh for MVP — decision A-7 in ADR-007.)
   - Login rate-limited; failed attempts logged; account lockout after N failures (mirrors `users.status='locked'`).
2. **Reference flows (guest without account)** — reservation lookup/cancel/check-in via `reference + email` or a **capability token**: short-lived signed token (HMAC over `reference|email|hotelId|expiry`, secret from env) returned to the client after successful reference+email match. No password, no stored secret — the reservation id is never exposed.

Passwords: never stored in plaintext; never logged; `password_hash` only. Reset flow via email (Resend) with expiring tokens.

## 4. Authorization (RBAC + hotel isolation)

- **Authorization model**: permission codes (e.g. `reservations.cancel`, `pricing.update`, `reviews.moderate`) mapped to roles; method-level `@PreAuthorize("hasPermission(...)")` or a permission service.
- **Hotel scoping is the hard rule**: every hotel-scoped use case receives `hotelId` and checks the principal's membership (`principal.hotels` contains hotelId with a role granting the permission). No trust in client-supplied ids alone.
- IDOR test: user of Hotel A requesting Hotel B resources → 403; missing resources → 404 to unauthenticated callers.
- Platform roles (super_admin) bypass hotel checks only where explicitly designed.

## 5. API security

- Stateless JWT ⇒ no CSRF token needed for the API (CSRF protection disabled for bearer-auth routes; login form endpoints protected if any).
- Headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Cache-Control` for private data; TLS assumed at the edge.
- CORS: allowlist configured (frontend origin), credentials not required (bearer).
- Rate limiting: auth endpoints and reference-lookup endpoints (brute-force protection) — MVP: in-app rate limiter or gateway later.
- Payload limits and bean validation on every input; JSON only.

## 6. Secrets and configuration

- All secrets (JWT secret, DB password, Cloudinary, Resend, provider webhook secrets) via environment variables only.
- `application.yaml`: placeholders `${DB_PASSWORD}` etc.; no committed `.env*`; `.gitignore` enforced.
- Spring profiles: `dev`, `test`, `prod`; prod profile disables devtools, restricts actuator endpoints, enforces HTTPS cookies if any.

## 7. Data protection

- PII (guest names, emails, ID document references) never in logs; audit logs store non-sensitive metadata only (see database.md §4.11).
- `id_document_reference` stored as tokenized/hashed reference, not the document itself.
- Payment data: no raw card data anywhere — the payment provider handles storage; we store provider references and status only.

## 8. Webhooks

- Provider webhooks (payment, Resend events) verified by signature (shared secret from env) and handled idempotently (dedupe by provider event id). See integrations.md.

## 9. Known app-level enforcements (documented)

- `reservations.promotion_id` hotel-or-global consistency (database.md D-5).
- `reservation_charges.tax_fee_type_id` hotel-or-global consistency.
- Hold-expiry release, cancellation invariants, review-once-per-reservation guard (DB partial unique + app flow).

