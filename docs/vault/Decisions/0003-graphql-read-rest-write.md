# 0003 — GraphQL for Reads, REST for Writes

**Date:** recorded 2026-08-28 (decision predates this note) · **Status:** Accepted

## Context

The guest booking funnel renders room types, rates, availability, amenities, and media on a
single page. Fetching that over conventional REST means either many round trips or bespoke
aggregate endpoints per screen.

Separately, the system takes payments and creates reservations — operations that must not be
executed twice and must report failure precisely.

## Options considered

1. **REST only.** Familiar, good write semantics, but the booking funnel needs either
   chatty fetches or a screen-shaped endpoint per view, which ages badly as the UI changes.
2. **GraphQL only, including mutations.** One contract, one client stack. But mutations give
   up HTTP status codes, standard idempotency-key handling, and caching semantics — all of
   which matter for payment.
3. **GraphQL for reads, REST for writes.** Chosen.

## Decision

**GraphQL is READ. REST is WRITE and ACTION.** There is no GraphQL `Mutation` root type. All
state changes go through `/api/v1/**`.

## Why

The read and write sides of this system have genuinely different requirements, and forcing
one protocol onto both compromises whichever side loses.

Reads are shape-driven: the client knows what it needs, the set of screens keeps changing, and
over-fetching costs page latency in a funnel where latency costs bookings. GraphQL is a good
fit.

Writes are correctness-driven. A double-charged guest is a serious failure. The database
carries explicit idempotency constraints for payments
(`V23__payment_idempotency_and_pending_uniqueness.sql`), and the transport should reinforce
that rather than obscure it — an idempotency key and a `409` mean something standard over
HTTP. Inside a GraphQL mutation they become bespoke conventions.

## Consequences

- **Two client stacks.** The guest site runs Apollo Client for reads and Axios for writes
  through a Next.js BFF proxy at `/api/rest`. This is the accepted cost.
- Contributors must know which side an operation belongs on. "Add a mutation" is always wrong
  here.
- `/graphql` being a single endpoint has a security consequence covered separately in
  [[Security/authorization-model]].

## Related notes

- [[APIs/graphql-rest-split]]
- [[Security/authorization-model]]
