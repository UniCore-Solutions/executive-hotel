# Delegation Round-Trip — Verified Working

**Date:** 2026-08-28 · **Purpose:** prove the delegation loop end to end, not just that the
code to invoke it exists.

## What was run

Delegate: **OpenCode running DeepSeek**, invoked non-interactively from Claude Code:

```bash
opencode run --auto -m deepseek/deepseek-v4-flash "$(cat <brief>)"
```

Access was smoke-tested first — `opencode run -m deepseek/deepseek-v4-flash "Reply with
exactly the word: PONG"` returned `PONG`, exit 0. **A binary on `PATH` is not proof of a
working subscription; check before relying on a delegate.**

## The brief

Deliberately minimal, per [[../Decisions/0001-agent-delegation-model]] — task, acceptance
criteria, relevant file paths, constraints. **File paths, not file contents; the whole
repository was never sent.**

Task chosen to match the delegate-appropriate profile: write unit tests for
`frontend-hotel/src/lib/links.ts`, five pure URL-building functions with no I/O, an
established test pattern to copy, and no architectural ambiguity.

## Result

The delegate created `frontend-hotel/src/lib/links.test.ts` (12 tests), hit a real
`URLSearchParams` comma-encoding mismatch, self-corrected it, ran the suite, and reported
12/12 passing.

## Review — what the gate caught

The delegate's report was **not** taken as evidence. Claude Code:

1. **Checked actual scope** with `git status` — exactly one new file, matching the claim.
2. **Read the real diff**, not the summary.
3. **Re-ran the tests independently** — 12/12 confirmed.
4. **Found a gap the delegate's green run could not surface.**

**Finding:** `stateToQuery` returns `''` when there are no params (`src/lib/dates.ts:205`),
so the `q ? \`&${q.slice(1)}\` : ''` fallback in `roomURL` and `hotelRoomURL` is reachable.
Every delegated test uses a fully-populated `fullState()`, so that branch is never exercised.

This is exactly the value of the review gate: **the tests were green, met every stated
acceptance criterion, and still left a real branch uncovered.** A passing report from a
delegate says nothing about what was not tested.

## Outcome

The generated file was **removed from the `chore/agent-infra` branch** — that branch carries
agent infrastructure only and must not mix in application code. The work is preserved at
`scratchpad/links.test.ts.delegated` and queued as a task below.

## Conclusion

The loop works: **invoke → parseable output → inspect real diff → independent test run →
review → accept or reject.** Delegation is verified functional, not assumed.

## Queued follow-up

| Field | Value |
|---|---|
| **ID** | LINKS-1 |
| **Status** | not-started |
| **Owner** | OpenCode (DeepSeek), reviewed by Claude Code |
| **Scope** | Add `frontend-hotel/src/lib/links.test.ts` covering all five URL builders |
| **Acceptance** | The 12 existing cases, **plus** coverage of the empty-query fallback branch in `roomURL` and `hotelRoomURL` |
| **Files** | `src/lib/links.ts`, `src/lib/dates.ts`, `src/lib/format.test.ts` |
| **Tests** | `npx vitest run src/lib/links.test.ts` |
| **Branch** | to be created with `gt create` on a feature stack, **not** on `chore/agent-infra` |
| **Starting point** | `scratchpad/links.test.ts.delegated` |

## Related notes

- [[../Decisions/0001-agent-delegation-model]]
- [[TASK-TEMPLATE]]
- [[../Testing/test-topology]]
