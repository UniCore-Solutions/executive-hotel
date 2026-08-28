# 0001 — Agent Delegation Model

**Date:** 2026-08-28 · **Status:** Accepted

## Context

Several coding agents can work on this repository: Claude Code (running Opus), OpenCode
(running DeepSeek), and Codex CLI. They differ sharply in cost and in reasoning depth.

Running every task through the most capable model is wasteful; routing everything to the
cheapest one produces work nobody has checked. We need a rule for which agent does what, and
a guarantee that cheap output cannot reach the main branch unreviewed.

## Options considered

1. **Single agent for everything.** Simple and predictable, but spends deep-reasoning capacity
   on boilerplate CRUD and repetitive test files.
2. **Free-for-all — any agent picks up any task.** Maximum throughput on paper. Rejected:
   no consistent architectural judgement, and no defined point where work gets reviewed.
3. **Orchestrator plus delegates, with a mandatory review gate.** Chosen.

## Decision

**Claude Code (Opus) is the default agent and orchestrator.** It owns architecture, planning,
hard debugging, and every review pass. It delegates well-scoped, low-risk implementation to
OpenCode (DeepSeek), or to Codex CLI where that fits better.

**Every delegated change is reviewed by Claude Code via the Superpowers `code-review` skill
before it is accepted into a Graphite branch. No delegated output merges without that review.**

### Keep with Claude Code (Opus)

- Architecture and schema decisions
- Cross-service or multi-file refactors
- Security-sensitive code — anything touching authentication, authorization, or payments
  (see [[Security/authorization-model]]: resolvers here fail *open*, so a missed check is
  invisible in normal testing)
- Debugging that spans more than one subsystem
- The planning and review phases themselves

### Delegate to OpenCode/DeepSeek or Codex

- Isolated CRUD endpoints or components with a clear spec
- Repetitive test generation, once the pattern is established
- Straightforward UI scaffolding from an approved design
- Mechanical refactors — renames, type fixes — with no architectural ambiguity

### Pull-back rule

**If a delegated task turns out to need architectural judgement mid-way — the delegate gets
stuck, or the fix is not isolated after all — Claude Code takes it back and finishes it
directly.** Do not push the delegate further with more context. A delegate that is confused
about the architecture produces plausible-looking code that is wrong in ways review may not
catch.

Also pull back immediately on: cross-system dependencies surfacing, security-sensitive code
appearing in scope, or unexpected complexity.

## Delegation mechanism

Claude Code delegates by invoking the other CLI **non-interactively** via a shell command,
passing only:

- the specific task description
- its acceptance criteria
- the relevant files
- the relevant vault notes and architectural decisions
- any required test information

**Never hand a delegated agent the whole repository** unless a task genuinely requires it.
Context is the scarce resource; a focused brief also produces better output than a vague one.

Capture the CLI's output, then **inspect the actual diff — not the delegate's summary of what
it did** — before running it through review.

## The delegated-work loop

```
Claude defines task → delegates → delegate implements and reports
  → Claude inspects the real diff → tests run → Claude reviews
  → fixes requested if needed → gt submit → PR → merge
  → vault + CURRENT.md updated
```

## Consequences

- Claude Code is a bottleneck on review by design. That is the price of the guarantee.
- The review gate is only as good as the diff inspection. Trusting a delegate's self-report
  would defeat the entire model.
- Adding a new delegate agent later means placing it on this same routing table, not inventing
  a parallel workflow.

## Related notes

- [[Implementation-Plans/CURRENT]]
- [[Security/authorization-model]]
