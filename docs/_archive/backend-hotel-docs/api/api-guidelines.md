# API Guidelines

> STATUS: BASE CONTRACT SHIPPED — the REST surface described in §10 is live at `/api/v1`. The remaining sections remain conventions for future endpoint work.

## 1. Base path and versioning

- Base path: `/api/v1` (URL-versioned). Breaking changes → new version (`/api/v2`), additive changes preferred within a version.
- OpenAPI at `/v3/api-docs`, Swagger UI at `/swagger-ui.html` (disabled in production unless explicitly enabled).

## 2. Resource conventions

- Plural nouns: `/api/v1/hotels`, `/api/v1/hotels/{hotelId}/room-types`.
- Hotel-scoped resources are nested under the hotel when the hotel is the access boundary; top-level booking resources (quote, reservation) are reached via their own paths.
- Actions are verbs only for genuine operations: `POST /api/v1/reservations/{ref}/cancel`, `POST /api/v1/reservations/{ref}/check-in`.
- Hyphenated kebab-case path segments; no mixed case.

## 3. HTTP methods and status codes

| Method | Semantics | Success | Errors |
|---|---|---|---|
| GET | read (safe, cacheable) | 200 | 400, 401, 403, 404 |
| POST | create / action | 201 (+ `Location`) | 400, 401, 403, 404, 409, 422 |
| PUT | full replace (idempotent) | 200 | 400, 401, 403, 404, 409 |
| PATCH | partial update | 200 | 400, 401, 403, 404, 409, 422 |
| DELETE | remove | 204 | 400, 401, 403, 404, 409 |

- 400 malformed/validation failure · 401 unauthenticated · 403 authenticated but not authorized · 404 missing · 409 conflict (already booked, state conflict) · 422 state-transition violation (e.g. cancelling a checked-out reservation).
- Auth failures never leak whether a resource exists (404 for both missing and unauthorized-to-see when the caller is unauthenticated; 403 when authenticated but lacking permission).

## 4. Pagination, sorting, filtering

- Page-based pagination as the default: `?page=0&size=20` (0-based, size ≤ 100, default 20). Response envelope carries `page`, `size`, `totalElements`, `totalPages`, `items` — stable shape.
- Cursor pagination only for high-volume/live lists if needed later (documented per endpoint).
- Sorting: `?sort=field,asc` (repeatable), whitelisted fields per resource — no sort on arbitrary input.
- Filtering: query params for scalar filters; documented per resource. Range filters: `?priceFrom=&priceTo=`, `?checkIn=&checkOut=`.

## 5. Validation

- Jakarta Bean Validation on all request DTOs (records): `@NotNull`, `@Size`, `@Pattern`, `@Positive`, `@Future`, cross-field rules as class-level validators.
- Error details carry the field name and a stable error code per rule.
- Server-side validation is authoritative — client validation is UX only.

## 6. Error envelope (standard)

```json
{
  "code": "RESERVATION_CONFLICT",
  "message": "The room type is not available for the requested dates.",
  "details": [
    { "field": "checkIn", "code": "DATE_RANGE_INVALID", "message": "Check-in must be before check-out." }
  ],
  "timestamp": "2026-08-18T12:00:00Z",
  "traceId": "a1b2c3d4-…"
}
```

- `code`: stable machine-readable code per error class (e.g. `VALIDATION_FAILED`, `RESERVATION_CONFLICT`, `HOTEL_NOT_FOUND`).
- `details`: optional field-level list; `traceId` also returned in the `X-Trace-Id` response header.
- One global `@RestControllerAdvice`; no ad-hoc error bodies.

## 7. Idempotency

- `POST /api/v1/bookings` (reservation creation): client sends `Idempotency-Key` header (UUID); server stores it in `reservations.idempotency_key`; duplicates return the existing reservation with 200 instead of creating again.
- Provider webhooks (payment, email status): idempotent by provider event id (deduped against `payment_transactions.provider_transaction_id` / notification records).
- `PUT`/`DELETE` are naturally idempotent.

## 8. Correlation / request IDs

- `X-Trace-Id`: accepted from caller or generated; propagated to MDC, logs, Kafka headers, and the error envelope. Provider calls and outbox messages carry it too.

## 9. OpenAPI

- Every endpoint annotated (`@Operation`, `@ApiResponse`, `@Parameter`); request/response records become schemas automatically.
- Spec must validate without warnings; examples for every error code the endpoint can return.
- `docs/api.md` (created when endpoints exist) mirrors the contract with real examples; the frontend integration notes live there.

## 10. Implemented base contract (live)

Hybrid transport per `docs/archive/planning/api-split-recommendation.md`
(historical record): reads and back-office stay GraphQL; the guest
write/action flows are REST. Same services, same JWT, same error taxonomy —
the frontend picks the transport per flow.

### Endpoints

| Endpoint | Auth | Semantics |
|---|---|---|
| `POST /api/v1/auth/login` | anonymous (rate-limited) | `LoginInput` → `AuthPayload` |
| `POST /api/v1/auth/register` | anonymous (rate-limited) | `RegisterInput` → `AuthPayload` (201) |
| `POST /api/v1/reservations` | anonymous | `CreateReservationInput` + `Idempotency-Key` → reservation (201; 200 on replay) |
| `POST /api/v1/reservations/{reference}/cancel` | anonymous | `{email, reasonCode, reasonNote}` → reservation |
| `POST /api/v1/payments` | JWT | `CreatePaymentInput` → payment (201) |
| `POST /api/v1/payments/{id}/capture` | JWT | `{gatewayReference}` → payment |
| `POST /api/v1/reservations/{reference}/invoice` | anonymous | `{email}` → invoice (idempotent, one per reservation) |
| `POST /api/v1/hotels/{hotelId}/reviews` | JWT | `{reservationId, rating, title, comment}` → review (201) |

Request bodies reuse the shared `dto/` records; only transport-shaped bodies (reference/email split across path+body) use local records in the controllers.

### Error envelope (live)

```json
{
  "timestamp": "2026-08-20T17:12:33.123Z",
  "status": 403,
  "code": "FORBIDDEN",
  "message": "access denied",
  "path": "/api/v1/...",
  "traceId": "9f2c1b..."
}
```

`code` is the stable taxonomy (`NOT_FOUND`→404, `FORBIDDEN`→403, `CONFLICT`→409,
`VALIDATION`→400, `UNAUTHORIZED`→401, `RATE_LIMITED`→429, `INTERNAL_ERROR`→500).
One taxonomy, two transports: the REST envelope above and GraphQL's
`extensions.code`. The envelope is produced by one `@RestControllerAdvice` and
one `ErrorResponseWriter` shared by the security filters, so every error —
controller, filter, rate limiter, unknown route — has the same shape.

- `timestamp`: ISO-8601 instant; `status`: the HTTP status returned (may differ
  from the code's default, e.g. oversized uploads → 413 + `VALIDATION`).
- `path`/`traceId`: correlation — the `traceId` echoes the request's
  `X-Request-Id` header (or a generated UUID) and matches the server-side log
  entry via MDC.
- Framework client errors (malformed JSON, unparsable path variables, unknown
  routes, validation failures) map to 400/404; constraint conflicts (duplicates,
  dangling references) → 409; uploads over the limit → 413; unexpected
  exceptions → 500 with the generic message `internal error` (the cause stays
  in the logs). GraphQL argument conversion failures (e.g. a non-UUID passed to
  a `UUID` argument) surface as `VALIDATION`, not `INTERNAL_ERROR`.

### Security

- `/api/v1/auth/*` anonymous; reservations/invoice anonymous (email+reference flows, same as GraphQL); payments and reviews require a JWT; anything else under `/api/v1` is denied unless explicitly permitted.
- `AuthRateLimitFilter`: 20 requests/minute/IP on login+register (in-memory fixed window; 429 + `RATE_LIMITED` envelope). Distributed limiting is a future decision.
- Logout: no backend endpoint — stateless JWT, the client discards the token.
- GraphiQL and GraphQL introspection are disabled under the `prod` profile; the `prod` profile also emits a Content-Security-Policy header (dev keeps GraphiQL working).
- Security headers: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` on all responses.

### Deviations from the draft above

- Envelope is `{timestamp, status, code, message, path, traceId}` — no `details` array yet; `X-Trace-Id`/`Location` response headers not yet emitted (the traceId travels inside the envelope and in logs).
- Guest write flows are anonymous where the GraphQL counterpart was anonymous — the §3 "404 for unauthorized-to-see" guidance applies to authenticated read resources (not yet implemented in REST).
- OpenAPI annotations deferred (pending springdoc vs Boot-native decision).

See the [documentation index](../README.md).