# 0002 — Flat Layered Architecture, Not Hexagonal

**Date:** recorded 2026-08-28 (decision predates this note) · **Status:** Accepted and enforced

## Context

The backend originally had a documented plan to become a hexagonal modular monolith: each
domain owning `api/application/domain/adapter` packages, with cross-module calls restricted to
the `api` package. That design is described in `docs/_archive/backend-hotel-docs/architecture/`
and in ADR-008.

**It was never built.** The code is flat layered, and has been for some time. The gap between
the documented design and the real one caused repeated confusion — agents and developers read
the architecture docs, wrote hexagonal-shaped code, and hit build failures.

## Options considered

1. **Migrate the code to match the documented hexagonal design.** A large refactor across 56
   entities and 30 services, delivering structure rather than user-facing value, on a codebase
   with a live booking funnel.
2. **Leave the docs and code contradicting each other.** Zero effort, ongoing cost. This was
   the status quo and it was actively harmful.
3. **Accept the flat layered structure as the real architecture, document it, and enforce it
   mechanically.** Chosen.

## Decision

The architecture is **flat layered**:
`controller / service / service.impl / repository / entity / dto`.

An ArchUnit rule **bans** `api`, `application`, `domain`, and `adapter` package names, so the
abandoned design cannot creep back in half-applied. Boundary discipline is preserved by a
different rule instead: cross-domain calls go through `service/` interfaces, never through
another domain's `service/impl/` or repository.

ADR-009 records the layered decision and supersedes ADR-008.

## Why enforcement rather than documentation

Documentation had already failed at this exact job — the hexagonal docs sat in the repo for
months while the code did something else. A rule in
`ModuleArchitectureTest.java` fails the build; a paragraph does not. The lesson generalises:
**architectural constraints in this repo should be executable wherever possible.**

## Consequences

- Archived architecture docs are actively misleading. They were left in `docs/_archive/` for
  history, and the vault README warns against trusting them.
- Domain boundaries are a convention enforced by one ArchUnit test rather than by the package
  structure. If that test is weakened, the boundary is gone.
- Two ArchUnit rules currently fail — see [[Testing/test-topology]]. Pre-existing, not caused
  by recent work, but it means the enforcement mechanism is partially red.

## Related notes

- [[Architecture/layering-and-boundaries]]
- [[Testing/test-topology]]
