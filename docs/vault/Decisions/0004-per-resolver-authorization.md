# 0004 — Per-Resolver Authorization on an Open `/graphql`

**Date:** recorded 2026-08-28 (decision predates this note) · **Status:** Accepted, with
reservations — see Consequences

## Context

All GraphQL traffic arrives as `POST /graphql`. Spring Security's filter chain authorizes by
URL pattern, so it cannot tell "list public room types" from "list every guest's contact
details" — both are the same URL and method.

The system serves both public guest reads and privileged admin reads over that one endpoint.

## Options considered

1. **Split admin GraphQL onto a separate secured path** (for example `/graphql/admin`) so the
   filter chain can guard it by URL. Would have worked with Spring Security's model directly,
   at the cost of two endpoints and a split client configuration.
2. **Declarative per-field authorization** via annotations or GraphQL instrumentation, so an
   unannotated field is denied by default. Fails closed.
3. **Leave `/graphql` open and authorize inside each resolver.** Chosen.

## Decision

`/graphql` is `permitAll` at the filter chain. **Every admin resolver performs its own check:**

```
hasRole("super_admin") || inHotel(hotelId)
```

## Why

Per-resolver checks are explicit and local — the authorization logic sits next to the data
access it protects, and it can express hotel-scoping that a URL pattern cannot. It required no
change to the client's single-endpoint assumption.

## Consequences

**This design fails open, and that is a genuine weakness.** A resolver missing its check is
not denied by default; it is publicly readable. It will behave normally in every test that
does not specifically probe authorization, so the defect is invisible until someone looks for
it.

Practical implications, which are binding:

- Every new admin resolver must be reviewed **specifically** for its authorization check.
  Reviewing it for correctness is not sufficient.
- Admin resolver work is classified as security-sensitive and is **never delegated** to a
  non-orchestrator agent — see [[Decisions/0001-agent-delegation-model]].
- Hotel scoping stays in the check even though there is only one hotel today. A check that
  passes because only one row exists is not a check.

This decision is recorded as accepted because it is what the code does, not because it is the
strongest available option. Option 2 (deny-by-default) remains the better long-term design,
and revisiting it would be justified if admin surface area grows.

## Related notes

- [[Security/authorization-model]]
- [[APIs/graphql-rest-split]]
- [[Decisions/0001-agent-delegation-model]]
