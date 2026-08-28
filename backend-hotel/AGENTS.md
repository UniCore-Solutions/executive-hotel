# AGENTS.md — backend-hotel

Deltas only. Shared rules live in the root `AGENTS.md`.

- Requires JDK 21. Default Spring profile is `dev` (GraphiQL on); deploy with
  `SPRING_PROFILES_ACTIVE=prod` (GraphiQL off, fail-fast JWT secret check).
- Local run: `JWT_SECRET=$(openssl rand -hex 32) ./mvnw spring-boot:run` — `JWT_SECRET` is
  required and has no default.
- GraphQL schema is split per domain: `src/main/resources/graphql/<domain>/*.graphqls`.
  That schema is the API contract.
- Architecture rules that actually run live in
  `src/test/java/**/ModuleArchitectureTest.java` — trust it over any prose.
- `./mvnw test` is currently red on 2 pre-existing ArchUnit rules. Those two predate you;
  any *other* failure is yours.
- `docs/architecture/architecture.md` and `ADR-008` describe a hexagonal design that was
  never built — ignore them. `ADR-009-layered-architecture.md` is correct.
