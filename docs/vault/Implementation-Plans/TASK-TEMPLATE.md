# Task Template

Copy this per task. **After planning, break any large piece of work into small,
independently executable tasks** and give each one its own file in this folder, named
`<epic-slug>-<id>.md`.

## Why tasks live in files

**Never assume the current chat session stays open until a task finishes.** Sessions hit
context limits, get interrupted, or are resumed days later by a different agent entirely.

Any state that matters must live in the repository. A task that exists only in conversation
history is lost the moment that conversation ends — and the next session will either redo the
work or, worse, half-redo it.

---

```markdown
# <ID> — <short title>

**Status:** not-started | in-progress | blocked | in-review | merged
**Owner:** Claude Code | OpenCode (DeepSeek) | Codex
**Epic:** <epic name>

## Scope

What this task changes. Be specific about boundaries — state what is explicitly *out* of
scope, because that is what stops a delegated task from sprawling.

## Acceptance criteria

- [ ] Concrete, checkable conditions. Not "works correctly".
- [ ] Include the observable behaviour, not just the code shape.

## Relevant files

- `path/to/file.java` — why it matters

## Relevant vault notes

- [[../Architecture/system-overview]]
- Decisions that constrain this task

## Dependencies

Task IDs that must land first, or "none".

## Tests

Which suite covers this, and the exact command to run it.

## Graphite branch

`<branch-name>` — one stacked branch per task, created with `gt create`.

## Review status

not-reviewed | changes-requested | approved
Delegated work **must** record who reviewed the actual diff.

## PR status

none | open <url> | merged
```

---

## Delegation notes

When a task's Owner is not Claude Code, the brief sent to the delegate is: **Scope +
Acceptance criteria + Relevant files + Relevant vault notes + Tests.** Nothing else. Do not
send the whole repository.

If a delegated task turns out to need architectural judgement mid-way, **pull it back** and
finish it directly rather than pushing the delegate further — see
[[../Decisions/0001-agent-delegation-model]].

## Related notes

- [[CURRENT]] — live state across all tasks
- [[../Decisions/0001-agent-delegation-model]]
