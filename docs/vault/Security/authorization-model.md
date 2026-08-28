# Authorization Model

**Verified against `backend-hotel/src` on 2026-08-28. Security-sensitive — re-verify before
relying on this note.**

## The critical fact

**`/graphql` is `permitAll` at the Spring Security filter chain.** The filter chain does not
authorize GraphQL requests. There is no declarative guard, no annotation applied by default,
and no gateway check.

**Therefore every admin resolver must perform its own authorization check**, of the form:

```
hasRole("super_admin") || inHotel(hotelId)
```

A resolver that omits this check is not "using the default policy" — it is publicly readable.
This is the single easiest way to introduce a serious vulnerability in this codebase.

## Why it is built this way

GraphQL presents one HTTP endpoint for every query in the system, so URL-pattern security —
which is what a servlet filter chain expresses — cannot distinguish "read the public room
list" from "read every guest's contact details". Both are `POST /graphql`.

The two ways out are (a) leave the endpoint open and authorize per resolver, or (b) authorize
per field declaratively via annotations or instrumentation. This system chose (a).

**The trade-off is real and unfavourable in one direction:** per-resolver checks are explicit
and flexible, but they fail *open*. Forgetting one line yields an unguarded resolver that
behaves normally in every test that does not specifically probe authorization. Option (b)
fails closed, which is the safer default.

Treat this as a known structural weakness rather than a settled design. Any new admin
resolver must be reviewed specifically for its authorization check.
See [[Decisions/0004-per-resolver-authorization]].

## Scope by hotel, even with one hotel

The deployment has a single hotel ([[Architecture/system-overview]]), so `inHotel(hotelId)` is
close to a no-op today. Keep it anyway. The data model is multi-hotel, and an authorization
check that is correct only because there happens to be one row is not an authorization check.

## Secrets

- All secrets come from `.env`, which is gitignored. `.env.example` documents the shape.
- `JWT_SECRET` has **no default** and is required to start the backend. This is intentional —
  a default signing secret in a booking system is a full authentication bypass.
- The `prod` Spring profile disables GraphiQL and fail-fasts on a missing JWT secret. The
  default `dev` profile leaves GraphiQL on. **Never deploy without
  `SPRING_PROFILES_ACTIVE=prod`.**
- Never hardcode a secret, including in tests.

## Related notes

- [[APIs/graphql-rest-split]]
- [[Decisions/0004-per-resolver-authorization]]
- [[Known-Issues/README]]
