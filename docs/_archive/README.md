# Archived Documentation

Everything here is **historical reference, not truth.** It was moved unedited from across the
repository on 2026-08-28, when `docs/vault/` became the live documentation home.

**Do not copy content from here into the vault without verifying it against current code
first.** Several claims were already wrong when archived:

- The agent instructions stated migrations ran `V1–V27`; `V1–V30` are applied.
- They stated two ArchUnit rules were failing and should be treated as pre-existing. The
  suite passes 6/6 — following that guidance would mask a real regression.
- `backend-hotel-docs/architecture/` and ADR-008 describe a hexagonal modular monolith that
  was never built. An ArchUnit rule bans its package names.

These files were kept rather than deleted because they record *intent* and history usefully,
even where they describe state inaccurately.

## Layout

| Folder | Origin |
|---|---|
| `agent-instructions/` | Pre-restructure `CLAUDE.md` and the two stale package `AGENTS.md` files |
| `root-docs/` | The former repo-root `docs/*.md` and `docs/investigations/` |
| `root-reports/` | Repo-root audit reports, changelog, and session handoff |
| `backend-hotel-docs/` | Former `backend-hotel/docs/` |
| `frontend-hotel-docs/` | Former `frontend-hotel/docs/` |
| `backoffice-hotel-docs/` | Former `backoffice-hotel/docs/` |

Current documentation: [`docs/vault/`](../vault/README.md).
