# Archived documents — historical, not authoritative

These five files were written as point-in-time snapshots during earlier sessions and sat
in the repository root, where they read like current documentation and were picked up by
search. Several of their findings are already fixed; several describe an architecture that
was never built.

They are kept for **intent and history only**. Do not use them to answer "how does this
work today" or "what is broken".

| File | What it actually is |
|---|---|
| `AUDIT_REPORT.md` | Snapshot audit from an earlier commit |
| `CURRENT_STATE_AUDIT.md` | Superseded by [`../CURRENT_STATE.md`](../CURRENT_STATE.md) |
| `FULL_AUDIT_REPORT.md` | Snapshot audit from an earlier commit |
| `INTEGRATION_CHANGELOG.md` | Changelog of one integration session |
| `SESSION_HANDOFF.md` | Handoff notes from one session |

**For current state, read the authoritative set instead:**

- [`../PROJECT_CONTEXT.md`](../PROJECT_CONTEXT.md) — what the system is
- [`../CURRENT_STATE.md`](../CURRENT_STATE.md) — what works and what is mocked
- [`../ARCHITECTURE.md`](../ARCHITECTURE.md) — layers, API surface, security boundaries
- [`../KNOWN_ISSUES.md`](../KNOWN_ISSUES.md) — catalogued defects
- [`../investigations/PROJECT_CLEANUP_AUDIT_2026-08-31.md`](../investigations/PROJECT_CLEANUP_AUDIT_2026-08-31.md)
  — the most recent full audit, with a verified test baseline

Above all: **the source code, the Flyway migrations and the running system are
authoritative.** Any document that disagrees with them is wrong.
