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

**Initial finding (later withdrawn):** that `stateToQuery` can return `''`
(`src/lib/dates.ts:205`), leaving the `q ? … : ''` fallback in `roomURL` and `hotelRoomURL`
uncovered by tests that all use a fully-populated `fullState()`.

### The reviewer was wrong — and checking caught it

Before delegating a follow-up task to add that coverage, the branch's reachability was
verified rather than assumed. It is **not reachable**.

`stateToParams` unconditionally sets `adults`, `children`, and `rooms`
(`src/lib/dates.ts:187,188,192`), so the `URLSearchParams` is never empty, so `stateToQuery`
never returns `''`. The fallback is **unreachable defensive code**, not an untested branch.

The review error was inferring reachability from `stateToQuery`'s own ternary without reading
its caller. **The delegate's 12 tests were complete as written.**

## What this actually demonstrates

The intended lesson was "review catches what a delegate's green run hides". The real lesson is
better: **the review step is itself fallible, and the same verify-before-asserting discipline
applies to the reviewer.** A confident review finding sent onward as a task would have had a
delegate chasing an impossible test case.

Both directions of the gate matter — verify the delegate's work, and verify your own critique
of it.

## Outcome

The file was initially removed from `chore/agent-infra`, which carries agent infrastructure
only. It was then added properly on its own stacked branch `feat/links-url-tests`, where it
belongs.

Verified there: 12/12 new tests pass; full guest-site suite 16 files / 85 tests green;
`tsc --noEmit` clean in `src/`; ESLint clean.

## Open follow-up (not a task yet)

`roomURL` and `hotelRoomURL` carry a dead `q ? … : ''` branch. Harmless, but it invites
exactly the misreading recorded above. Removing it is a small cleanup, deliberately **not**
bundled into this task to keep scope tight.

## Conclusion

The loop works end to end: **invoke → parseable output → inspect real diff → independent test
run → review → verify the review → accept → stacked branch → PR.** Delegation is verified
functional, not assumed.

## Task record

| Field | Value |
|---|---|
| **ID** | LINKS-1 |
| **Status** | in-review |
| **Owner** | OpenCode (DeepSeek), reviewed by Claude Code |
| **Scope** | Add `frontend-hotel/src/lib/links.test.ts` covering all five URL builders |
| **Acceptance** | All five functions, both optional-parameter branches, exact string assertions, suite green — **met** |
| **Files** | `src/lib/links.ts`, `src/lib/dates.ts`, `src/lib/format.test.ts` |
| **Tests** | `npx vitest run src/lib/links.test.ts` — 12/12 |
| **Branch** | `feat/links-url-tests`, stacked on `chore/agent-infra` |
| **Review** | approved — after the reviewer's own finding was checked and withdrawn |

## Related notes

- [[../Decisions/0001-agent-delegation-model]]
- [[TASK-TEMPLATE]]
- [[../Testing/test-topology]]
