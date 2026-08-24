---
name: java-spring-boot
description: Java 21 and Spring Boot conventions for backend-hotel — package layout, entity/JPA practices, DTO discipline, validation, exception handling, transactions. Use when implementing or reviewing Java/Spring code in this project.
---

# Java 21 / Spring Boot Conventions

## Package layout (target)

```
com.hotelcollection.hotel
  domain/         aggregates, entities, value objects, domain services
  application/    use cases, application services, DTOs, ports
  infrastructure/ JPA repositories, Kafka producers/consumers, provider clients
  web/            REST controllers, global exception handling, OpenAPI
  security/       Spring Security config, RBAC, hotel-scope authorization
```

## Java 21

- Records for immutable DTOs and value objects; `sealed` types where a closed hierarchy is real
- `Optional` at boundaries, not as a field type; pattern matching over instanceof chains
- Nullability: `@NotNull` on required inputs; no silent nulls across service boundaries

## Spring Boot / JPA

- Entities: annotated with Hibernate/Jakarta annotations only; no Lombok `@Data` on entities (identity-based equality); explicit `equals`/`hashCode` where needed
- Repositories: Spring Data JPA, derived/`@Query` JPQL queries; no raw SQL string concatenation; no repository calls inside loops (N+1)
- Transactions: `@Transactional` on application service boundaries (not controllers, not repositories); read-only transactions marked `readOnly = true`; no long transactions holding locks
- Lazy loading: never rely on open-session-in-view; fetch plans via `join fetch`/entity graphs
- DTOs: request/response records with Jakarta validation annotations; never expose entities over HTTP; map explicitly (MapStruct acceptable, manual mapping preferred while small)

## Validation

- Bean Validation on all request DTOs; cross-field rules as class-level validators; messages concise and stable
- Consistent 4xx mapping via a global `@RestControllerAdvice` — one error envelope, no ad-hoc error bodies

## Dependency rules

- No vendor SDK imports outside `infrastructure/…/provider` implementations
- Lombok: allowed for value objects/DTOs where it removes noise; not required — prefer records
- Never `System.out`; use SLF4J logging