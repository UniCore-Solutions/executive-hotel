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

## Baseline — all suites green (2026-08-28)

Every unit/integration suite was run in full and passes:

| Suite | Result |
|---|---|
| `backend-hotel` — `./mvnw test` | **170 tests, 0 failures, BUILD SUCCESS** |
| `frontend-hotel` — `vitest run` | **15 files, 73 tests passed** |
| `backoffice-hotel` — `vitest run` | **1 file, 10 tests passed** |

**There are no known-failing tests. Any red test is a real regression** — do not dismiss
anything as pre-existing.

Playwright end-to-end suites were **not** run (they need the full stack up); their state is
unverified.

### Gotcha: stale `node_modules` looks like broken code

On the first run, three `frontend-hotel` test files failed to collect:

```
Failed to resolve import "@apollo/client" from "src/api/apollo/client.ts"
Failed to resolve import "axios" from "src/api/rest/client.ts"
```

Both packages were correctly declared in `package.json` (`@apollo/client ^4.2.12`,
`axios ^1.20.0`) but absent from `node_modules`. `npm install` fixed it and the suite went to
73/73.

**If test files fail to *collect* rather than fail assertions, check the install before
reading any code.** The error names an application source file, which makes it look like a
code defect when it is an environment one.

## Related notes

- [[Architecture/layering-and-boundaries]]
- [[Known-Issues/README]]
