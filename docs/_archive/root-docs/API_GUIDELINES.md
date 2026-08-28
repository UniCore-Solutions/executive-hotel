# API_GUIDELINES — the one rule

> **GraphQL = READ · REST = WRITE / ACTION**

The backend exposes exactly one read protocol and exactly one write protocol.
Do not add a read over REST, a write over GraphQL, or a new transport.

## The rule

| Concern | Protocol | Backend entry | Frontend client | Cache |
|---|---|---|---|---|
| Read / query application state | **GraphQL** | `POST /graphql` — Query root only | **Apollo Client** | Apollo normalized cache |
| Any state change / action (incl. auth) | **REST** | `/api/v1/**` — POST/PUT/PATCH/DELETE | **Axios** | none (refetch Apollo after success) |
| Binary media upload / delete | REST | `/api/v1/media/upload`, `/api/v1/media/{id}` | Axios (FormData via the BFF `/api/rest` proxy) | none |
| Binary media bytes (reads) | static | `GET /media/**` | plain `<img>` | — |

There is **no GraphQL Mutation root** in the schema (enforced by the
`NO_GRAPHQL_MUTATIONS` ArchUnit rule) and **no GET read endpoint** under
`/api/v1`.

## Backend layout

- **Queries**: `controller/*GraphQLController` → `service/*QueryService` →
  repositories. Reads only; `@Transactional(readOnly = true)`.
- **Writes**: `controller/*RestController` under `/api/v1/**` → the same
  service command methods the GraphQL mutations used to call (all writes
  carry their own `@Transactional`). Authorization stays inside services
  (`hasRole("super_admin") || inHotel(hotelId)`) — `/graphql` and the
  whitelisted public paths are anonymous at the filter chain.
- Controllers are thin: no repository access, no `service/impl` access
  (ArchUnit). Error envelope is the uniform `ApiError` (code, message,
  path, traceId) on both protocols.

### Endpoint families

| Prefix | Auth | Owner |
|---|---|---|
| `/api/v1/auth/{login,register}` | public (rate-limited) | guests |
| `/api/v1/auth/me/profile` | authenticated | guests (self) |
| `/api/v1/reservations`, `.../{ref}/cancel`, `.../{ref}/invoice` | public | guests (idempotency-key / reference+email) |
| `/api/v1/payments`, `.../{id}/capture` | authenticated | guests (owner/email proof) + staff |
| `/api/v1/media/**` | authenticated | staff |
| `/api/v1/hotels/{hotelId}/reviews` | authenticated | guests |
| `/api/v1/admin/**` | authenticated | staff (super_admin where noted) |

Naming: resources are nested under their owner (`/api/v1/admin/hotels/{id}/media`,
`/api/v1/admin/hotels/{hotelId}/room-types`); replace-list writes use PUT with
the full list (amenities, media, policies, prices); actions are POST
sub-resources (`/cancel`, `/moderation`, `/status`).

## Frontend layout

```
src/api/
  apollo/client.ts      ApolloClient (link → BFF /api/graphql; InMemoryCache)
  apollo/provider.tsx   singleton provider + useApollo()
  graphql/hooks.ts      typed read hooks (guest) — components never touch Apollo directly
  rest/client.ts        Axios instance (baseURL /api/rest; ApiError interceptor)
  rest/endpoints.ts     typed REST operations — components never touch axios directly
  invalidation.ts       REST op → Apollo query names; invalidateGraphql()
```

- Browser → `/api/graphql` (BFF route handler) for reads and `/api/rest/...`
  (BFF proxy) for writes. The BFF injects the Bearer from the httpOnly
  session cookie; the browser never sees the token or the backend URL.
- Server components (RSC) read the backend directly with the shared typed
  documents (stateless; no cache) — `services/graphqlClient.ts`.
- **Cache rule**: one cache per datum. Apollo caches reads. TanStack Query
  (back-office) manages REST **mutation lifecycle only** and caches no read
  data. Axios caches nothing.
- **Invalidation**: every REST write declares the Apollo queries it affects
  in `src/api/invalidation.ts`; after success call
  `invalidateGraphql(client, REST_INVALIDATIONS['<op>'])` (back-office:
  `invalidateAfterWrite` also touches the legacy RQ keys).
- **No mock fallbacks.** If the backend cannot do something, the UI shows an
  honest unavailable state — never canned success, never localStorage as a
  backend.
- Money: API calls always send `MAD` (`TRANSACTION_CURRENCY`); display
  currency is a client-side conversion only.

## Verification

- Backend: `./mvnw test` (ArchUnit bans `@MutationMapping`; integration
  tests cover the REST surface and read-only GraphQL introspection).
- Frontends: `npm run typecheck && npm run lint && npm test`; the guest
  suite asserts the service boundary (no component-level HTTP).
