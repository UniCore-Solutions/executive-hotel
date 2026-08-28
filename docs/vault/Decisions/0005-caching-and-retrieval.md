# 0005 — Use Existing Caching and Retrieval, Build Nothing Custom

**Date:** 2026-08-28 · **Status:** Accepted

## Context

Agents working this repository need to find code fast and carry knowledge between sessions
without re-reading the world each time. The tempting move is to build something: a custom
index, an embedding store, a summary cache, a bespoke memory file format.

Before building any of that, we inventoried what already exists.

## What is already available

| Capability | Provided by | Status |
|---|---|---|
| Prompt / context caching | Anthropic API, automatic in Claude Code | Active, no configuration needed |
| Repository search | Native `Grep` / `Glob` / `Read` tools, ripgrep-backed | Active |
| Broad fan-out exploration | The `Explore` subagent — searches wide, returns conclusions | Active |
| Cross-session, cross-agent memory | **`docs/vault/`** — this repository | Active, the primary mechanism |
| Session resume state | `docs/vault/Implementation-Plans/CURRENT.md` | Active |
| Workflow skills | Superpowers, vendored at `.agents/vendor/superpowers/` | Active |
| Per-user agent memory | Claude Code's file memory directory | Available, currently empty |

MCP servers connected at the time of writing (Dice, Indeed, ZipRecruiter, Google Drive) are
unrelated to code retrieval. No code-indexing or semantic-search plugin is installed.

## Decision

**Build no custom caching, indexing, or memory infrastructure.** Use the vault as the
persistent knowledge layer, native search for code lookup, and the platform's automatic prompt
caching for context reuse.

**Add a plugin only if it materially improves context retrieval, memory, or token efficiency
— never merely because it exists.**

## Why

A custom index would need to be built, kept in sync with a changing codebase, and trusted.
The third part is the problem: a stale index is worse than no index, because it answers
confidently and wrongly. This repository has already been burned by exactly that failure mode
— the archived documentation confidently stated the wrong migration count and the wrong test
status, and following it would have caused real mistakes (see [[../Known-Issues/README]]).

Native search reads the code as it is right now. It cannot go stale. For a repository of this
size that is fast enough, and correctness beats cleverness here.

The vault is the deliberate exception: it *is* a cache, it *can* go stale, and it earns its
place by holding what code cannot express — reasoning, trade-offs, and why decisions were
made. That is why every note carries evidence and a verification date, and why the
source-of-truth order below exists.

## Source-of-truth order

Highest first. **Cached or previously-summarised information never overrides current
reality.**

1. Current source code
2. Current tests
3. Current database and API contracts
4. Current vault docs
5. Previous session summaries and cached context

If a cached or documented claim conflicts with the repository, **the cache is stale** —
verify against code, then fix the note. Do not reconcile in the other direction.

## Consequences

- Vault notes need active maintenance; a stale vault degrades into the archived docs.
  Verification dates and evidence links are the mitigation.
- Large-scale semantic search across the repo is not available. Accepted — targeted search
  plus the vault has covered the need so far. Revisit if that stops being true.

## Related notes

- [[../README]] — vault usage and writing standard
- [[0001-agent-delegation-model]] — delegated briefs must stay minimal for the same reason
