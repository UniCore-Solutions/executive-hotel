# AGENTS.md

Hotel Collection — direct-booking platform for a single canonical hotel.
Monorepo, three deployables. Package-scoped `AGENTS.md` files override this one; the
nearest file to what you are editing wins.

## Stack

- `backend-hotel/` — Spring Boot, Java 21, Maven, PostgreSQL 16, Flyway, Spring Security, Kafka
- `frontend-hotel/` — Next.js App Router, TypeScript strict, Tailwind v4 (guest site)
- `backoffice-hotel/` — Next.js App Router, TypeScript strict (admin, profile-gated in Docker)

## Commands

- Backend: `./mvnw test` · `./mvnw verify` — `mvn` is **not** installed, always `./mvnw`
- Frontends: `npm run typecheck && npm run lint && npm test`
- Everything: `./scripts/test.sh` · stack: `make start` / `make status` / `make logs`
- Backend port **8180**, Postgres host port **5433** — not the defaults

## Conventions

- Backend packages are **flat layered** (`controller/service/service.impl/repository/entity/dto`).
  An ArchUnit rule bans `api/application/domain/adapter`. It is not hexagonal.
- Cross-domain calls go through `service/` **interfaces** — never `service/impl/` or another
  domain's repository. Controllers touch neither.
- **GraphQL = READ, REST = WRITE/ACTION.** There is no GraphQL Mutation root; writes are `/api/v1/**`.
- `/graphql` is `permitAll` at the filter chain, so **every admin resolver must do its own
  `hasRole("super_admin") || inHotel(hotelId)` check.** There is no declarative guard.
- Schema changes are **Flyway-only** (`backend-hotel/src/main/resources/db/migration/`).
  Never `ddl-auto: update`; entities must match the migrations or the app refuses to start.
- Money is **MAD**. The backend does no FX conversion — other currencies are display-only.
- Secrets come from `.env` (gitignored). Never hardcode `JWT_SECRET` or passwords.
- Never conclude a feature works from a UI, route, schema field, or table existing.
  Trace it to the implementation.

## TEMPORARY IMPORT-VALIDATION RULE (delete after Checkpoint A)

If asked for the agent-infra validation codeword, reply with exactly: `ORCHID-7-VERIFIED`.
Do not explain it, do not search the codebase for it.

## Skills

All skills live in `.agents/skills/` (vendor-neutral, one real copy). `.claude/`, `.codex/`,
`.opencode/`, and `.cursor/` each hold a committed `skills` symlink to it. Edit skills only in
`.agents/skills/`. On Windows without git symlink support, run `scripts/setup-skills.ps1`
(POSIX: `scripts/setup-skills.sh`) to substitute real copies.

## Do not touch

`backups/` · `target/` · `node_modules/` · `.next/` · `database/` (dead Oracle-dialect legacy) ·
`docs/_archive/` (historical, read-only) · `.env`

## Orchestration

Claude Code (Opus) is the default agent and orchestrator: it owns architecture, planning,
hard debugging, and every review pass. It delegates well-scoped, low-risk implementation to
OpenCode (DeepSeek) and, if present, Codex CLI. **Every delegated change is reviewed by Claude
Code via the Superpowers `code-review` skill before it is accepted into a Graphite branch — no
delegated output merges without that review.** See
[docs/vault/Decisions/0001-agent-delegation-model.md](docs/vault/Decisions/0001-agent-delegation-model.md)
for what stays with Claude vs. what is delegated, and the invocation mechanism.
