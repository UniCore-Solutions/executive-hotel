# The GraphQL / REST Split

**Verified against `backend-hotel/src` on 2026-08-28.**

## The rule

**GraphQL is READ. REST is WRITE and ACTION.**

There is no GraphQL `Mutation` root type in this system. Every state change goes through a
REST endpoint under `/api/v1/**`. Every query goes through `POST /graphql`.

The controller layer reflects this cleanly — 22 controllers split by suffix:

- `*GraphQLController` — reads: `CatalogGraphQLController`, `AvailabilityGraphQLController`,
  `ReservationGraphQLController`, `RateGraphQLController`, `StaySearchGraphQLController`,
  `HomepageGraphQLController`, `ReviewGraphQLController`, `PlatformGraphQLController`,
  `AdminGraphQLController`, `AuthGraphQLController`
- `*RestController` — writes and actions: `ReservationRestController`, `PaymentRestController`,
  `InvoiceRestController`, `MediaRestController`, `AuthRestController`, `ReviewRestController`,
  and the `Admin*RestController` family

## Why it was split this way

GraphQL's strength is letting a client fetch exactly the shape it needs in one round trip,
which suits a booking funnel that renders room types, rates, availability, and amenities on a
single page. Its weakness is write semantics: mutations give up HTTP's idempotency
guarantees, status codes, and caching behaviour, and they make it awkward to express an
operation that is not simply "persist this object".

Payments make the argument concrete. `V23__payment_idempotency_and_pending_uniqueness.sql`
adds idempotency constraints at the database level — an operation that must not double-charge
belongs behind an HTTP endpoint where an idempotency key and a status code mean something
standard, not behind a GraphQL field resolver.

The cost of the split: two client stacks to maintain. The guest site uses Apollo Client for
GraphQL reads and Axios for REST writes through a Next.js BFF proxy at `/api/rest`. That is
accepted deliberately — see [[Decisions/0003-graphql-read-rest-write]].

## The schema is the contract

The schema is split per domain under `backend-hotel/src/main/resources/graphql/`:

```
admin/  audit/  availability/  billing/  catalog/ (catalog, homepage)
identity/  media/  notification/  platform/  rate/  reservation/  review/
shared/  schema.graphqls
```

These `.graphqls` files are **authoritative**. When frontend types and schema disagree, the
schema wins and the generated client types are stale — the back-office regenerates via
`npm run graphql:generate`.

## Verifying a field is real

The existence of a schema field does not mean it is implemented. Trace it:

```
frontend service → src/graphql/*.graphql → schema .graphqls → controller → service/impl
```

Stop at the implementation, not at the schema.

## Related notes

- [[Security/authorization-model]] — `/graphql` is `permitAll`; resolvers guard themselves
- [[Architecture/layering-and-boundaries]]
- [[Decisions/0003-graphql-read-rest-write]]
