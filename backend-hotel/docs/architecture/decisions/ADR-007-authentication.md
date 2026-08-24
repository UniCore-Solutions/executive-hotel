# ADR-007: Authentication — stateless JWT + reference capability tokens

- Status: proposed (pending approval)
- Date: 2026-08-18

## Context

Two distinct auth audiences: staff (back office, hotel-scoped) and guests. Guests frequently book without an account; "my reservation" flows use reference + email lookup. One mechanism cannot serve both without friction.

## Decision

1. **Staff + account-holding guests**: stateless JWT access token (~15 min) + rotating refresh token (hashed, server-side). Claims carry `sub`, roles, and the set of (hotelId, role) memberships.
2. **Accountless guest flows**: reference + email match issues a short-lived **capability token** (HMAC-signed over `reference|email|hotelId|expiry`; secret from env). No password, no stored secret, reservation id never exposed.
3. RBAC from the existing `roles`/`permissions`/`user_roles` tables; `user_roles.hotel_id` NULL = platform-level role.
4. **Hotel isolation is a code-level invariant**: every hotel-scoped use case checks the principal's membership for the requested hotel before acting — IDOR across hotels returns 403.
5. Secrets (JWT secret, webhook secrets) via env vars only; login/reference-lookup endpoints rate-limited; failed-login lockout.

## Consequences

- Security module owns filter chain, token issuance, permission service.
- No session store for access tokens; refresh tokens require a small server-side store (or deferred to pure short-lived tokens for MVP — flagged in development review).
- Guest flows without accounts remain secure without storing passwords for every guest.