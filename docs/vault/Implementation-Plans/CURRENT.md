# CURRENT — Session Resume Point

**The single file a new session reads first.** Read this, then the vault notes it links to,
then continue. **Do not re-run a full-project investigation because the session is new.**

**Last updated:** 2026-08-28, end of Checkpoint C of the agent-infrastructure restructure.

---

## Project / epic

Agent-infrastructure restructure — make instructions, skills, and workflow identical across
Claude Code, OpenCode, Codex CLI, and Cursor, with no duplicated or agent-specific config.

**This epic touches no application or feature code.** That separation is deliberate and has
been enforced: one delegated test file was produced during verification and deliberately
removed from this branch (see [[DELEGATION-PROOF]]).

## Current phase

Checkpoint C complete, awaiting user review. Checkpoints A and B approved.

## Current task

None in progress. Awaiting user go-ahead to open the pull request.

## Graphite branch

`chore/agent-infra`, stacked on `main`, tracked by Graphite. Created with `gt create`.

**Do not use raw `git checkout -b` for feature work** — route branch creation through
Graphite so the stack stays reviewable.

## Completed

| Step | Outcome |
|---|---|
| 0 | Graphite installed (1.8.6), `gt init --trunk main`, branch created. `docs/vault/.obsidian/` gitignored. Windows symlink fallback agreed and built. |
| 1 | Root `AGENTS.md` is the single source of truth; `CLAUDE.md` is just `@AGENTS.md`; three package-scoped `AGENTS.md` carry deltas only. **Import chain proven** — a fresh `claude -p` obeyed a rule existing only in `AGENTS.md`. |
| 2 | All skills in `.agents/skills/`; four host dirs hold committed symlinks. All verified resolving. `scripts/setup-skills.{sh,ps1}` fallback tested against a simulated symlink-less checkout. |
| 3 | Superpowers 6.3.0 vendored and pinned (`b36e082`). 21 skills visible to all four hosts. **`using-superpowers` proven active** — a fresh session's first action was `Skill(brainstorming)`, unprompted. |
| 4 | 71 legacy docs archived unedited to `docs/_archive/`. Vault built at `docs/vault/` from fresh investigation of the live system. |
| 5 | Graphite workflow rules in `AGENTS.md`: one stacked branch per plan task, own tests, own review. |
| 6 | [[TASK-TEMPLATE]] — task record format (ID, scope, acceptance, files, notes, deps, status, branch, tests, review, PR). |
| 7 | This file. |
| 8 | Context-discipline rules in `AGENTS.md`. |
| 9 | [[../Decisions/0005-caching-and-retrieval]] — evaluated what exists; **build nothing custom**. |
| 10 | PR lifecycle rules in `AGENTS.md`. Tooling checked — see Blockers. |
| 11 | `browser-automation` skill in `.agents/skills/`, using existing Playwright + Chrome MCP, with the permission gates. |
| 12 | Loop verified end to end, including a **real delegation round trip** — [[DELEGATION-PROOF]]. |

## Test baseline — all green (2026-08-28)

| Suite | Result |
|---|---|
| `backend-hotel` `./mvnw test` | 170 tests, 0 failures, BUILD SUCCESS |
| `frontend-hotel` `vitest run` | 15 files, 73 tests passed |
| `backoffice-hotel` `vitest run` | 1 file, 10 tests passed |

**No known-failing tests. Any red test is a real regression.** Playwright e2e not run —
state unverified. Details and the stale-`node_modules` gotcha: [[../Testing/test-topology]].

## Remaining

- Open the PR for this branch (needs the two blockers below resolved).
- **LINKS-1** — the queued follow-up task in [[DELEGATION-PROOF]]; belongs on a feature
  stack, not here.
- `Frontend/` and `Business-Flows/` vault folders hold scoped stubs; fill them in as those
  subsystems are actually worked on rather than through a speculative audit.

## Blockers

None blocking. Resolved: Graphite auth configured, branch pushed, PR #2 open.

Non-blocking notes:

- `gh` CLI is not installed. `gt submit` covers the PR path, so this only matters if you
  need scripted access to PR *comments* or review state.
- `gt submit --edit-title` reports "No-op" when no commits changed, so the PR title cannot
  be revised on its own. Change it in the GitHub UI, or bundle it with a real commit.
- `cursor` is not installed, so its symlink and manifests are wired but unverified.
- The Claude-in-Chrome browser extension is not currently connected, so the
  `browser-automation` skill's Chrome path is unverified. Playwright is unaffected.

## Remote topology — read before pushing

Two remotes. **They are not interchangeable.**

- `origin` → `git@github.com:UniCore-Solutions/executive-hotel.git` (**GitHub — the one
  Graphite works with; Graphite's PR support is GitHub-only**)
- `gitlab` → `https://gitlab.com/omar.azhari/executive-hotel.git`

## Key decisions

- [[../Decisions/0001-agent-delegation-model]] — orchestrator + delegates, mandatory review gate
- [[../Decisions/0002-flat-layered-over-hexagonal]]
- [[../Decisions/0003-graphql-read-rest-write]]
- [[../Decisions/0004-per-resolver-authorization]]
- [[../Decisions/0005-caching-and-retrieval]]

Superpowers was **vendored rather than installed per-agent** because upstream's install path
is per-machine and per-harness — the duplication this epic removes. See
`.agents/vendor/superpowers/VENDORED.md`.

## Review status

Checkpoints A and B approved by the user. Checkpoint C presented, pending.

## PR status

**PR #2 open and ready for review** —
https://app.graphite.com/github/pr/UniCore-Solutions/executive-hotel/2

Submitted with `gt submit` against `main` in `UniCore-Solutions/executive-hotel`.
Graphite auth is configured (`gt auth`, authenticated as AZOMARDEV); the Graphite GitHub App
is already installed on the org, so `gt submit` works without `gh`.

Awaiting team review. **After merge:** update this file and the affected vault notes.

## Findings worth carrying forward

Re-investigation contradicted the archived documentation three times — the reason those docs
were archived rather than merged:

1. **Migrations are `V1–V30`**, not V1–V27.
2. **The full backend suite passes (170 tests).** The old instructions said two ArchUnit
   rules were failing and to treat them as pre-existing; following that now would mask a real
   regression.
3. Frontend test files failing to *collect* were **stale `node_modules`**, not code defects —
   the error names an application source file and looks like one.

---

## Next action

**Ask the user whether to push `chore/agent-infra` to `origin` and open the PR**, since that
is the first outward-facing step of this epic and needs either a Graphite token or a manual
PR.

Do not push without that go-ahead.
