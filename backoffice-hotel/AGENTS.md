# AGENTS.md — backoffice-hotel (admin)

Deltas only. Shared rules live in the root `AGENTS.md`.

- Runs on port **3101**, not 3000. Profile-gated off in Docker: start it with
  `docker compose --profile backoffice up -d backoffice`, or `npm run dev` in this package.
- GraphQL types are generated: `npm run graphql:generate` (`codegen.ts`). Re-run it after
  any schema change; never hand-edit generated output.
- Every admin GraphQL read hits a resolver that must authorise itself — see the
  `/graphql` `permitAll` rule in the root `AGENTS.md`. Assume nothing is guarded for you.
- Tests: Vitest (`vitest.config.ts`); Playwright specs in `e2e/`.
- The `debug*.mjs` scripts at the package root are ad-hoc scratch files, not a test suite.
