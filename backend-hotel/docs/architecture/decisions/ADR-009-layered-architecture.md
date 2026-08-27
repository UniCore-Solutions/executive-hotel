# ADR-009: Layered (controller → service → repository) architecture

- Status: accepted · **supersedes ADR-008**
- Date: 2026-08-26
- Applies to: `backend-hotel`

## Context

ADR-008 specified a per-domain hexagonal layout (`<module>.api`, `application`,
`domain`, `adapter`) and a cross-module dependency gate enforced by ArchUnit.
That refactor was planned but the code today does not use it: the packages it
describes (`api`, `application`, `domain`, `adapter` under the root) **do not
exist** and the architecture test actively forbids them.

The repository currently uses a clean, layered layout under
`com.hotelcollection.hotel`:

```
controller/   thin GraphQL + REST controllers/resolvers → service interfaces
service/      use-case interfaces (Auth, Booking, Pricing, …)
service/impl/ implementation classes (domain + orchestration + persistence)
repository/   Spring Data JPA repositories (persistence only)
entity/       JPA entities (the domain model, mirroring the Flyway schema)
dto/          GraphQL/REST input & view records, split by domain (admin, rate,
              reservation, catalog, …)
mapper/       entity ↔ dto mapping
security/     JWT, filters, rate limiting, CurrentUser
config/       GraphQL config, scalars, media web config
exception/    shared exception taxonomy + GraphQL advice
util/, storage/  helpers and media storage provider
```

## Decision

1. Adopt the layered layout above as the architecture.
2. Cross-module access goes through **service interfaces** (`service/`) — never
   through `impl`, repositories, or each other's persistence. Enforced by
   `ModuleArchitectureTest` (ArchUnit) in
   `src/test/java/.../architecture/ModuleArchitectureTest.java`, which includes
   a rule **prohibiting** the hexagonal packages ADR-008 proposed
   (`NO_LEGACY_HEXAGONAL_PACKAGES`).
3. Controllers are thin; all business logic (totals identity, cancellation
   math, inventory locking, idempotency, promo validation, authorization) lives
   in `service/impl/`.
4. Persistence access is confined to the service layer (repositories reachable
   only from `service/..` and `repository/..`).
5. Services must stay cohesive: ≤ 11 constructor dependencies (ArchUnit gate).

## Consequences

- The ArchUnit gate reflects the actual layout, so the code `ModuleArchitectureTest`
  is green and meaningful. ADR-008 is superseded and must not be treated as the
  current design.
- The domain model (entities) mirrors the frozen Flyway schema
  (`spring.jpa.hibernate.ddl-auto: validate`), so tier-drift fails the build.
- This layout matches the code, the `ModuleArchitectureTest`, and the imports
  in controllers/services/repositories. New code should follow it: service
  interface + `service/impl`, repository in `repository/`, DTO in the relevant
  `dto/<domain>` package.