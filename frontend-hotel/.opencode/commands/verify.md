---
description: Run the full verification gate (typecheck, lint, unit tests, build, e2e).
agent: build
---

Run the complete verification gate for the hotel-nextjs project:

1. `npm run typecheck` — TypeScript strict, no errors
2. `npm run lint` — ESLint clean
3. `npm run format:check` — Prettier clean
4. `npm test` — Vitest unit/component suites pass
5. `npm run build` — production build succeeds
6. `npm run test:e2e` — Playwright e2e suite passes (dev server + browser)

Report each command's result explicitly. If any step fails, fix the issue and re-run that step before continuing. Only report SUCCESS when every gate has actually passed.
