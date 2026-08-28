# ADR-008: Modular monolith — module-per-domain packages with API-first cross-module sync

- Status: **superseded by ADR-009** (the hexagonal module layout described here
  was never the running code; the repository follows the layered layout in
  ADR-009). Retained for history only.
- Date: 2026-08-19

## Context

The backend grew as a flat monolith: `service/`, `repository/`, `domain/`,
`graphql/` at the package root, `AdminService` as a God class, monolithic
`QueryResolver`/`MutationResolver`, and one `schema.graphqls`. Services
reached across module boundaries into other domains' repositories (e.g. the
booking flow touched rate and catalog repositories directly), making
dependencies implicit and evolution risky. The frontend and API contract were
stable; a full service split was out of scope.

## Decision

Organize the codebase into per-domain modules under
`com.hotelcollection.hotel.<module>`, each with the same internal layout:

| Package | Responsibility |
|---|---|
| `<module>.api` | Use-case interfaces, input/view records — **the only cross-module contract** |
| `<module>.application.service` | Use-case implementations; orchestrate own domain + other modules' APIs |
| `<module>.domain` | `model` (JPA entities/enums), `rule` (business rules), `event` (outbox events), `port.out` (repository/provider interfaces) |
| `<module>.adapter` | `graphql` (resolvers), `persistence` (Spring Data JPA impls of own ports), `rest` (same-module controllers), `storage`/`security` (infra) |

1. **Modules**: admin, audit, availability, billing, catalog, eventing,
   identity, media, notification, platform, rate, reference, reservation,
   review — plus `shared` (exception, validation, util, pagination, graphql,
   web) which depends on nothing.
2. **Cross-module dependency rule**: a class may touch another module only
   through that module's `api` (use cases, input/view records) or
   `domain.model` (entity types returned by those APIs — pragmatic ADR).
   Access to another module's `application`, `adapter`, `domain.port`,
   `domain.rule`, or `domain.event` is forbidden and enforced by ArchUnit.
3. **GraphQL adapters are thin**: resolvers delegate to services; they never
   touch persistence, JPA, or another module's internals.
4. **Authorization lives in the use cases** (scope guards resolved from
   `CurrentUserAccessor`), not in resolvers — resolvers stay thin.
5. **Circular bean dependencies** between modules are broken with `@Lazy` on
   the API parameter (rate↔catalog, review→catalog→…, audit↔identity).
6. **Schema split**: root `schema.graphqls` (schema block, scalars, empty
   root types) + one `graphql/<module>/*.graphqls` per module using
   `extend type Query/Mutation`; shared types in `graphql/shared/`.
7. **ArchUnit enforcement** (`ModuleArchitectureTest`, 7 rules): module gates
   (cross-module access via `api`/`domain.model` only), layer purity
   (domain/api never see application/adapters), acyclic module-API graph,
   thin graphql adapters, resolvers in `adapter.graphql`, services ≤ 11
   constructor dependencies.

## Consequences

- **Verification**: `./mvnw test` green — 98 tests (91 pre-existing + 7
  ArchUnit rules); behavioral parity preserved (no schema/API changes).
- **Found and fixed during the gate**: `PricingService` → catalog
  `ExtraRepository`, `BookingService` → rate `RatePlanRepository` (both now
  routed via module APIs); dead `identity.adapter.security.SecurityConfig`
  import in `MediaController`; `PlatformQueryResolver` with stale package.
- **Residual pragmatism**: JPA entities remain the inter-module contract
  (incl. `billing.domain.model.PaymentStatus` referenced by reservation);
  module-level dependency cycles therefore exist (catalog↔rate↔catalog etc.)
  but the API-level graph is acyclic; `admin` is a facade module without
  domain; `CatalogQueryService.hotelNamesByIds` still loads all hotels (perf
  nit, behavior parity).