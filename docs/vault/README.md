# Project Knowledge Vault

This is the shared, persistent memory for everyone working on this repository — human or
agent. Claude Code, OpenCode, and Codex all read from and write to these same notes, so no
one re-discovers the same architecture twice.

Open it as an Obsidian vault (point Obsidian at `docs/vault/`) or read it as plain Markdown.
Personal Obsidian workspace state lives in `docs/vault/.obsidian/` and is gitignored.

## How to use it

**Before investigating any subsystem, read the matching folder here first.** Only investigate
what is missing or stale. After any investigation or planning phase, write what you learned
back into the matching folder — a session that ends without updating the vault has thrown its
work away.

**Start here to resume work:** [[Implementation-Plans/CURRENT]] is the single file a brand-new
session reads to pick up where the last one stopped.

## Folders

| Folder | Holds |
|---|---|
| `Architecture/` | How the system is put together and why; layering, boundaries, cross-cutting shape |
| `Backend/` | `backend-hotel` internals — services, entities, config |
| `Frontend/` | `frontend-hotel` (guest) and `backoffice-hotel` (admin) |
| `Database/` | Schema, migrations, seed data, data invariants |
| `APIs/` | The GraphQL and REST contracts and the rules governing them |
| `Business-Flows/` | End-to-end traces: search, quote, booking, payment, auth |
| `Testing/` | Test topology, how to run suites, known-red tests |
| `Security/` | Authn/authz model, secrets handling, boundaries |
| `Known-Issues/` | Catalogued defects with evidence. Delete an entry when it is fixed |
| `Decisions/` | One note per decision: context, options, choice, reasoning |
| `Implementation-Plans/` | Plans and live task state, including `CURRENT.md` |

## Writing standard

Notes must be readable cold, by someone with no history on this project:

- Plain language. No tribal shorthand, no unexplained acronyms.
- Record the **why**, not only the what — the reasoning and the trade-offs considered.
  A note that says what the code does is worth little; the code already says that.
- Back claims with evidence: a `file:line`, a command, a query result.
- Link related notes with `[[wiki-links]]`.
- State a note's confidence when it is not verified. Say "unverified" rather than implying
  certainty you do not have.

## Source-of-truth order

When sources disagree, trust in this order, highest first:

1. Current source code
2. Current tests
3. Current database and API contracts (Flyway migrations, `*.graphqls`)
4. Current vault documentation (these notes)
5. Previous session summaries and cached context

**Cached or previously-summarised information never overrides current reality.** If a note
conflicts with the repository, the note is stale — verify against code, then fix the note.

## About `docs/_archive/`

All pre-existing project documentation was moved there unedited. **It is historical
reference, not truth.** Much of it was already self-declared stale, and spot-checks found
concrete errors — the previous agent instructions stated "migrations run V1–V27" when
`V1–V30` are in fact applied. Never copy archived content into this vault without
re-verifying it against the current code first.
