# AGENTS.md — frontend-hotel (guest site)

Deltas only. Shared rules live in the root `AGENTS.md`.

- Single canonical hotel (Executive Hotel). The booking funnel is real and backend-driven.
- API split: **GraphQL reads via Apollo Client; REST writes via Axios through the
  `/api/rest` BFF proxy.** See `src/api/`.
- `src/data/` is unit-test fixture data only — never a runtime source of truth.
- Layout: `src/app/` routes · `src/components/` · `src/context/` (search, toast, modal, auth)
  · `src/services/` · `src/lib/` · `src/types/` (domain types, single source of truth).
- Tests: Vitest co-located as `src/**/*.test.ts(x)`; Playwright specs in `e2e/`.
