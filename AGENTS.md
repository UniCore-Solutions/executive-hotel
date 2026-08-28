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

## Skills and workflow

All skills live in `.agents/skills/` (vendor-neutral, one real copy). `.claude/`, `.codex/`,
`.opencode/`, and `.cursor/` each hold a committed `skills` symlink to it. Edit skills only in
`.agents/skills/`. On Windows without git symlink support, run `scripts/setup-skills.ps1`
(POSIX: `scripts/setup-skills.sh`) to substitute real copies.

**Superpowers governs the default workflow: investigate → plan → implement (TDD) → review →
finish.** It is vendored and pinned at `.agents/vendor/superpowers/`; the workflow itself lives
in those skills, not here. Invoke them rather than improvising a process.

## Knowledge vault

`docs/vault/` is the shared persistent memory across sessions and across agents.

- **Before investigating a subsystem, read the matching `docs/vault/` folder first.** Only
  investigate what is missing or stale.
- **After any investigation or planning phase, write the findings into the matching vault
  folder** — do not leave them in session history.
- To resume work, read `docs/vault/Implementation-Plans/CURRENT.md` first.
- Source-of-truth order, highest first: current source code → current tests → current DB/API
  contracts → current vault docs → previous session summaries. **Cached or summarised
  information never overrides current reality**; if it conflicts with the repo, refresh it.
- `docs/_archive/` is historical reference only. It is known to contain confident errors —
  never treat it as correct without re-verifying against current code.

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

Delegate non-interactively, e.g.
`opencode run -m deepseek/deepseek-v4-flash "<task + acceptance criteria + relevant files>"`.
Send only the task, its acceptance criteria, the relevant files and vault notes, and any
needed test info — **never the whole repository.** Then inspect the real diff, not the
delegate's summary.

## Implementation workflow

Once a Superpowers plan exists and is approved, implement it as **small stacked Graphite
branches — one per task from the plan, not one large branch.**

- `gt create` per task. **Do not use `git branch` or `git checkout -b` for feature work**;
  route branch creation through Graphite so the stack stays reviewable.
- Each stacked branch carries its own tests and its own review pass before merge:
  `gt submit`, then merge only after the Superpowers code-review skill signs off and tests pass.
- Task state lives in `docs/vault/Implementation-Plans/`, not in chat. Never assume the
  current session stays open until a task finishes — see `TASK-TEMPLATE.md` there.
- Full lifecycle is owned end to end: commit → `gt create`/`gt sync` → `gt submit` → open or
  update the PR → monitor review feedback → fix → re-run tests → update the PR → merge.
  **After merge, update the affected vault notes and `CURRENT.md`.**

## Context discipline

- Read only what is relevant. Search before opening large files; reuse vault notes and prior
  investigation instead of re-deriving them. Do not re-explain architecture the vault covers.
- Before building any custom caching, indexing, or memory system, check what already exists
  (prompt caching, repo indexing, semantic retrieval, installed plugins/skills). Prefer a
  mature existing capability. Add a plugin only if it materially improves retrieval, memory,
  or token efficiency — see
  [docs/vault/Decisions/0005-caching-and-retrieval.md](docs/vault/Decisions/0005-caching-and-retrieval.md).
- Approaching a context or usage limit: stop and checkpoint. Update `CURRENT.md` and the
  relevant vault notes, then end cleanly rather than being cut off mid-task.
