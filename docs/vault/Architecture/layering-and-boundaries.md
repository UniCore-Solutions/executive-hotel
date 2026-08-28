# Backend Layering and Boundaries

**Verified against `backend-hotel/src` on 2026-08-28.**

## The actual structure

The backend is a **flat layered** application. Top-level packages under
`backend-hotel/src/main/java/com/hotelcollection/hotel/`:

```
config/  controller/  dto/  entity/  exception/  mapper/
repository/  security/  service/  service/impl/  storage/  util/
```

Rough scale: 22 controllers, 30 service interfaces, 31 implementations, 56 entities,
38 repositories.

**It is not hexagonal, and it is not a modular monolith.** Older documents in
`docs/_archive/` describe a hexagonal design with per-domain `api/application/domain/adapter`
packages. That design was proposed and never built. An ArchUnit rule actively bans those
package names, so following the archived docs produces code that fails the build.

The rules that actually run live in
`backend-hotel/src/test/java/com/hotelcollection/hotel/architecture/ModuleArchitectureTest.java`.
**Trust that file over any prose, including this note.**

## The boundary rules

1. **Cross-domain calls go through `service/` interfaces.** Never call another domain's
   `service/impl/` class, and never reach into another domain's repository.
2. **Controllers touch neither `service/impl/` nor `repository/`.** A controller depends on
   service interfaces only.
3. **No `api`, `application`, `domain`, or `adapter` packages.** Banned by ArchUnit.

### Why the interface indirection exists

With 56 entities and 38 repositories in one flat package tree, there is no compiler-enforced
module boundary — any class can technically import any other. The interface rule is the only
thing preventing the codebase from collapsing into a fully-connected graph where changing one
domain breaks four others.

The trade-off accepted here: a layer of interfaces that are mostly one-implementation
indirection, in exchange for an enforceable seam. ArchUnit enforces it because the package
structure alone cannot. See [[Decisions/0002-flat-layered-over-hexagonal]].

## Where this bites

The flat structure means **domain ownership is a convention, not a compiler guarantee**. When
adding a service, the questions to ask are: which domain owns this behaviour, and does anything
outside that domain need it? If yes, it needs an interface in `service/`. If no, keep it
internal to the implementation.

## Related notes

- [[Architecture/system-overview]]
- [[Decisions/0002-flat-layered-over-hexagonal]]
- [[Testing/test-topology]] — including the two ArchUnit rules currently failing
