# Test Topology

**Partially verified 2026-08-28 — see the confidence markers below.**

## How to run things

| Scope | Command | Run from |
|---|---|---|
| Backend | `./mvnw test` (`./mvnw verify` for the full gate) | `backend-hotel/` |
| A single backend test | `./mvnw -Dtest=ClassName test` | `backend-hotel/` |
| Frontend / back-office | `npm run typecheck && npm run lint && npm test` | the package |
| End-to-end | `npm run test:e2e` (Playwright) | the package |
| Everything | `./scripts/test.sh` | repo root |

**`mvn` is not installed. Always `./mvnw`.** Requires JDK 21.

Backend integration tests use Testcontainers, so Docker must be running and the first run
pulls images. Expect it to be slow.

## Layout

- Backend: 17 test classes under `backend-hotel/src/test/`
- Guest site: Vitest co-located as `src/**/*.test.ts(x)`; Playwright specs in `e2e/`
- Back-office: Vitest via `vitest.config.ts`; Playwright specs in `e2e/`

## Architecture tests

`backend-hotel/src/test/java/com/hotelcollection/hotel/architecture/ModuleArchitectureTest.java`
enforces the layering rules described in [[Architecture/layering-and-boundaries]]. These are
the architectural constraints that actually run — trust them over prose.

**Verified green on 2026-08-28:**

```
$ ./mvnw -Dtest=ModuleArchitectureTest test
Tests run: 6, Failures: 0, Errors: 0, Skipped: 0
```

This **contradicts the archived documentation**, which stated that two ArchUnit rules were
failing and instructed contributors to treat those two failures as pre-existing. That guidance
is obsolete and following it would cause someone to ignore a real regression. See
[[Known-Issues/README]].

## Confidence and gaps

- ArchUnit suite: **verified green** in this session.
- **The full backend suite has not been run in this session** — only the architecture test.
  The overall red/green state of `./mvnw test` is therefore unverified.
- Frontend and back-office suites: not run in this session.

Establishing a trustworthy full-suite baseline is a queued task — see
[[Implementation-Plans/CURRENT]]. Until that is done, do not assume any particular test is
expected to fail. If something fails, investigate it rather than dismissing it as
pre-existing.

## Related notes

- [[Architecture/layering-and-boundaries]]
- [[Known-Issues/README]]
