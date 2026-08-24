---
name: rest-api-openapi
description: REST API design and OpenAPI conventions for backend-hotel — resource modeling, HTTP semantics, DTOs, validation, pagination/filtering, the standard error envelope, and springdoc/OpenAPI documentation. Use when implementing or reviewing API endpoints.
---

# REST API + OpenAPI Conventions

The frontend consumes this API — the contract is the product. Keep it clean, stable, documented.

## Resources and verbs

- Nouns for resources (`/api/hotels/{hotelId}/rooms`), plural; verbs only for genuine actions (`/…/cancel`, `/…/release`)
- Correct status codes: `200` reads/updates, `201` + `Location` on creation, `204` on deletes, `400` validation, `401/403` auth, `404` missing, `409` conflicts (e.g. already-booked), `422` where semantics differ
- Idempotency: `PUT`/`DELETE` repeatable; `POST` creation is not silently retried (idempotency keys only where the client needs it)
- Query params for filtering/state; no business logic in query strings (no encoded JSON params)

## DTO discipline

- Request/response records; validation annotations matching business rules (`@NotNull`, `@Size`, `@Pattern`, `@Positive`, date-range checks)
- Never serialize JPA entities; never leak internal IDs or vendor fields
- Stable naming: camelCase JSON; no renames without a documented decision

## Pagination / filtering

- One convention: page-based (`?page=0&size=20`) or cursor-based for hot lists — decide per resource, document it
- Stable default ordering; total counts only where the client needs them; limits enforced server-side

## Error envelope

One envelope for all errors via `@RestControllerAdvice`:

```json
{ "status": 400, "code": "VALIDATION_FAILED", "message": "…", "fieldErrors": [ { "field": "checkIn", "message": "…" } ], "correlationId": "…" }
```

- Stable `code` strings per error type; no stack traces or internals; logging with correlation ids

## OpenAPI

- springdoc (OpenAPI 3) enabled; every endpoint annotated (`@Operation`, `@ApiResponse`, schemas via DTOs)
- Spec must validate without warnings; `docs/api/graphql.md` mirrors the real contract with examples
- Breaking changes require an ADR; additive changes preferred