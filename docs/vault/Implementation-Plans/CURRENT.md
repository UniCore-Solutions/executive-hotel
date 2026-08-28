# CURRENT — Session Resume Point

**The single file a new session reads first.** Read this, then the vault notes it links to,
then continue. Do not re-run a full-project investigation because the session is new.

**Last updated:** 2026-08-28, during Checkpoint B of the agent-infrastructure restructure.

---

## Project / epic

Agent-infrastructure restructure — make instructions, skills, and workflow identical across
Claude Code, OpenCode, Codex CLI, and Cursor, with no duplicated or agent-specific config.

**This epic touches no application or feature code.** That separation is deliberate and must
hold.

## Current phase

Checkpoint B of three (A: instructions + skills · B: Superpowers + vault · C: Graphite,
delegation, PR lifecycle, browser skill).

## Current task

Awaiting user review of Checkpoint B.

## Graphite branch

`chore/agent-infra`, stacked on `main`. Created with `gt create`.
**Do not use raw `git checkout -b` for feature work** — route branch creation through Graphite.

## Completed

- **Step 0** — Graphite installed (v1.8.6), `gt init --trunk main`, branch created.
  `docs/vault/.obsidian/` gitignored ahead of the vault. Windows symlink fallback agreed.
- **Step 1** — Root `AGENTS.md` is the single source of truth. `CLAUDE.md` is now just
  `@AGENTS.md`. Package-scoped `AGENTS.md` in all three deployables carry deltas only.
  Import chain **proven**: a fresh `claude -p` obeyed a rule that existed only in `AGENTS.md`.
- **Step 2** — All skills moved to `.agents/skills/`; `.claude`, `.codex`, `.opencode`,
  `.cursor` each hold a committed `skills` symlink. All four verified resolving.
  `scripts/setup-skills.{sh,ps1}` provides the Windows no-symlink fallback, tested against a
  simulated symlink-less checkout.
- **Step 3** — Superpowers 6.3.0 vendored and pinned at `.agents/vendor/superpowers/`
  (commit `b36e082`). 14 skills symlinked into the shared home, so all four hosts see 21
  skills total. `using-superpowers` **proven active**: a fresh session's first action was
  `Skill(brainstorming)`, unprompted.
- **Step 4** — All 71 pre-existing docs archived unedited into `docs/_archive/`. Vault
  created at `docs/vault/` with 11 folders and notes written from fresh investigation of the
  live system.

## Remaining

| Step | Work |
|---|---|
| 5 | Graphite workflow rules into `AGENTS.md` (gt installed; `gt auth` **not** done) |
| 6 | Long-running task format — ID, scope, acceptance criteria, files, notes, deps, status, branch, tests, review, PR |
| 7 | Finish this file's steady-state format |
| 8 | Context-minimisation rules into `AGENTS.md` |
| 9 | Evaluate existing caching/retrieval before building anything custom |
| 10 | PR lifecycle |
| 11 | Browser automation as a shared, permission-aware skill |
| 12 | Final end-to-end verification |

## Blockers

- **`gt auth` not configured.** `gt submit` needs a Graphite API token from the user.
  Untested. Blocks step 10.
- **GitHub push/PR access untested.** Committing works locally; pushing has not been tried.
- **OpenCode/DeepSeek delegation unproven.** The `opencode` binary exists on PATH, but a
  working binary is not a working subscription or model access. Step 12 requires a real
  round-trip run before delegation may be considered functional.
- `cursor` is not installed. Its symlink and manifests are wired but unverifiable. Agreed as
  acceptable — install later if needed.

## Key decisions

- [[../Decisions/0001-agent-delegation-model]] — orchestrator + delegates, mandatory review gate
- [[../Decisions/0002-flat-layered-over-hexagonal]]
- [[../Decisions/0003-graphql-read-rest-write]]
- [[../Decisions/0004-per-resolver-authorization]]

Superpowers was **vendored rather than installed per-agent** because upstream's own install
path is per-machine and per-harness — the exact duplication this epic removes. Rationale in
`.agents/vendor/superpowers/VENDORED.md`.

## Review status

Checkpoints A and B presented to the user. A approved. B pending.

## PR status

None opened. Branch is local and unpushed.

## Findings worth carrying forward

Re-investigation contradicted the archived documentation in two places:

1. **Migrations are `V1–V30`**, not V1–V27 as the old agent instructions stated. Confirmed by
   30 rows in `flyway_schema_history`.
2. **The ArchUnit suite passes 6/6.** The old instructions said two rules were failing and to
   treat them as pre-existing. Following that guidance now would mask a real regression.
   Recorded in [[../Known-Issues/README]].

Both support the archive-don't-merge approach: the old docs were confidently wrong.

---

## Next action

**Wait for the user's go-ahead on Checkpoint B**, then begin step 5.

The first substantive act of Checkpoint C should be establishing a trustworthy full-test-suite
baseline (`./mvnw test` plus both frontend suites), since [[../Testing/test-topology]]
currently records the full-suite state as unverified.
