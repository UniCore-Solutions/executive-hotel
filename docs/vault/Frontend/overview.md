# Frontend Overview

**Partially verified 2026-08-28. Scoped deliberately — see Gaps.**

Two Next.js App Router applications, both TypeScript strict.

## `frontend-hotel/` — guest site

The public booking funnel. Port 3000.

- **API split:** GraphQL reads through Apollo Client; REST writes through Axios via the
  `/api/rest` BFF proxy. See [[APIs/graphql-rest-split]]. `src/api/` holds the wiring.
- **Layout:** `src/app/` routes · `src/components/` · `src/context/` (search, toast, modal,
  auth) · `src/services/` · `src/lib/` · `src/types/` (domain types, single source of truth)
- **`src/data/` is unit-test fixture data only** — never a runtime source of truth. Treating a
  fixture as live data is an easy and consequential mistake here.
- Tests: Vitest co-located as `src/**/*.test.ts(x)`; Playwright in `e2e/`.

## `backoffice-hotel/` — admin

Staff-facing management. Port **3101**, profile-gated off in Docker
(see [[Backend/local-development]]).

- GraphQL types are **generated**: `npm run graphql:generate` (`codegen.ts`). Re-run after any
  schema change; never hand-edit generated output.
- Every admin read hits a resolver that must authorize itself. **Assume nothing is guarded for
  you** — [[Security/authorization-model]].
- The `debug*.mjs` files at the package root are ad-hoc scratch scripts, not a test suite.

## Gaps — not yet investigated

This note covers structure and conventions only. **Not yet documented, and not to be assumed:**

- Which guest-facing features are backed by real APIs versus mocked or stubbed
- The component inventory and page-by-page behaviour
- Any specific defect list

Archived documentation in `docs/_archive/frontend-hotel-docs/` includes a detailed
feature-by-feature real-versus-mock matrix and a numbered defect list. **It is unverified
against current code and must not be trusted as-is.** Re-verify before relying on any of it,
then write the confirmed parts here.

## Related notes

- [[APIs/graphql-rest-split]]
- [[Business-Flows/README]]
