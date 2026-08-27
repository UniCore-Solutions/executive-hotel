---
name: graphql-contract
description: How this platform's GraphQL contract is defined and consumed. Use when adding or changing a query, mutation or type, when regenerating typed client code in either frontend, or when deciding whether something belongs in GraphQL or the narrow REST surface.
---

# graphql-contract

GraphQL is the primary API. REST exists only for four approved exceptions.

## Where the schema lives

```
backend-hotel/src/main/resources/graphql/
├── schema.graphqls          ← SKELETON ONLY: schema{}, scalars, empty Query/Mutation
├── shared/shared.graphqls   ← PageInput and shared types
└── <domain>/<domain>.graphqls   ← the real contract, one file per domain
      admin audit availability billing catalog identity media
      notification platform rate reservation review
```

Every domain file uses `extend type Query { … }` / `extend type Mutation { … }`.
Custom scalars: `LocalDate`, `DateTime` (registered in `config/GraphqlScalarConfiguration`).

**Do not put types in `schema.graphqls`.** It is 401 bytes and must stay that way.

## Adding a query or mutation

1. Add the field to `graphql/<domain>/<domain>.graphqls` inside an `extend type` block,
   plus any input/output types in the same file.
2. Add the resolver to the matching `controller/<Domain>GraphQLController.java` with
   `@QueryMapping` / `@MutationMapping`, delegating to a `service/` interface.
3. Field-level resolvers (computed or lazily-loaded fields) use `@SchemaMapping` —
   see `CatalogGraphQLController.hotelCheckInTime`.
4. Admin fields: prefix `admin*` by convention **and** enforce the scope check inside the
   service (`hasRole("super_admin") || inHotel(hotelId)`). There is no declarative guard.
5. Pagination: take `page: PageInput` and return a `*Page` type with
   `total · page · size · items`. Services clamp size to `[1, 100]`, default 20.
6. Deprecate rather than delete: `@deprecated(reason: "...")`, as
   `updateAvailability` does.

## Client codegen

Both frontends use `@graphql-codegen` with the `client` preset. Operations are authored as
`.graphql` files and the generated `TypedDocumentNode`s are imported from
`src/graphql/generated/graphql`.

```bash
cd frontend-hotel   && npx graphql-codegen --config codegen.ts
cd backoffice-hotel && npm run graphql:generate
```

| | schema glob | status |
|---|---|---|
| `frontend-hotel/codegen.ts` | `../backend-hotel/src/main/resources/graphql/**/*.graphqls` | correct |
| `backoffice-hotel/codegen.ts` | `…/graphql/schema.graphqls` | **BROKEN** — points at the empty skeleton |

If you need to regenerate back-office types, fix that glob to match the frontend's first
(KNOWN_ISSUES §D1). Both map `DateTime` and `LocalDate` to `string`.

Workflow: edit `.graphqls` → edit/add the client `.graphql` operation → run codegen →
consume the generated document. Never hand-write a `TypedDocumentNode`.

The one sanctioned exception is `frontend-hotel/src/services/catalog.ts`
`stayBatchDocument(n)`, which builds an aliased N-hotel query (`a0/r0/t0, a1/r1/t1, …`)
at runtime with `parse()` because the shape depends on the hotel count. Keep the field
selections there in sync with the schema by hand.

## How each client reaches the API

- **guest** — `src/services/graphqlClient.ts`. Browser → same-origin `/graphql`, rewritten
  by `next.config.ts` to `API_INTERNAL_URL` (**baked at build time**). Server components →
  the backend directly. `cache: 'no-store'` always. Adds `Authorization: Bearer` from the
  in-memory token.
- **back-office** — never talks to the backend from the browser. `proxyRequest` →
  `/api/graphql` route handler → reads the httpOnly `bo_session` cookie → injects the
  bearer → forwards to `HOTEL_API_URL`. Server components use `serverRequest`.

## GraphQL vs REST

REST is used only where GraphQL is a poor fit, and this list is closed:

| Endpoint | Why |
|---|---|
| `POST /api/v1/auth/{login,register}` | token bootstrap, rate-limited, public |
| `POST /api/v1/reservations`, `…/{ref}/cancel`, `…/{ref}/invoice` | anonymous reference+email self-service |
| `POST /api/v1/media/upload`, `DELETE /api/v1/media/{id}` | multipart |
| `POST /api/v1/payments`, `…/{id}/capture` · `POST /api/v1/hotels/{id}/reviews` | existing splits |

Note `login`/`register` and payments/reviews exist in **both** surfaces. New capability
goes in GraphQL unless it is multipart or must be callable without a token.

## Errors

Resolvers surface `DomainException` through `GraphqlExceptionHandler`, producing
`errors[].extensions.code` ∈ `NOT_FOUND · FORBIDDEN · CONFLICT · VALIDATION ·
UNAUTHORIZED`. The back-office reads `extensions.code` (`lib/api.ts` `ApiError`); the
guest client currently joins `errors[].message` and throws `GraphqlClientError`.

## Introspection

Enabled in `dev` (GraphiQL at `/graphiql`), **disabled in `prod`**. Codegen therefore
reads the `.graphqls` files from disk, never a running server.
