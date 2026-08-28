---
name: browser-automation
description: Use when verifying real browser behaviour — testing forms, auth and booking flows against dev or staging, capturing screenshot evidence, or reading rendered pages. Covers which tool to use and which actions require explicit human confirmation.
---

# Browser Automation

Use this when you need to know what the application **actually does in a browser**, rather
than what the source implies it does. Reading code tells you intent; only a real browser tells
you whether the booking flow completes.

## Use an existing tool — do not build one

Two capabilities already exist. Pick by task, and **never hard-code a new browser harness.**

| Tool | Available to | Use it for |
|---|---|---|
| **Playwright** — already configured in `frontend-hotel/` and `backoffice-hotel/` (`playwright.config.ts`, 14 specs in `e2e/`) | **Every agent** — it is just `npm run test:e2e` | Repeatable, committed end-to-end checks. Anything worth re-running in CI. |
| **Claude-in-Chrome** MCP (`mcp__claude-in-chrome__*`) | Claude Code only | Exploratory, one-off interactive work: reading a rendered page, probing a flow by hand, screenshot evidence, debugging via console and network. |

**Default to Playwright when the check should outlive this session.** A finding reproduced by
a committed spec is worth far more than one reproduced by an agent driving a browser once.
Reach for Chrome automation to *investigate*; write a Playwright spec to *keep* the result.

Agents without Chrome MCP (OpenCode, Codex) still have full Playwright access, so browser
verification is never blocked on a specific agent.

## Environments

Targets are the local stack (guest site `:3000`, back-office `:3101`, API `:8180`) and
staging. **Never point automation at production** without explicit human instruction.

Confirm what you are pointed at before acting. A destructive-looking action against a URL you
assumed was staging is the failure mode this section exists to prevent.

## Permission model

### Automate freely — safe and reversible

Within dev and staging only:

- Navigating, reading pages, taking screenshots
- Filling and submitting forms in test flows
- Creating **authorized test accounts** on dev/staging
- Logging into staging with test credentials
- Running QA passes and end-to-end flows, including a full test booking against staging

### Stop and get explicit human confirmation first

Never perform these autonomously, in any environment:

- **Anything against production**, including read-only account creation
- **Purchases, payments, or entering real card details**
- **Accepting legal agreements** — terms, contracts, consent on someone's behalf
- **Irreversible changes** — deleting data, cancelling a real reservation, revoking access
- **Sending external communications** — email, SMS, messages to real people
- Anything involving a real person's personal data

Ask, state plainly what you intend to do and what it will affect, and wait. **This is not
designed for unrestricted autonomy.** Approval for one action does not extend to the next.

## Practical notes

- **Never trigger `alert()`, `confirm()`, or `prompt()`.** A modal dialog blocks the
  automation channel entirely and needs manual dismissal. Avoid clicking elements that raise
  confirmation dialogs; if unavoidable, warn the user first.
- Prefer `console.log` plus reading console messages over dialogs for debugging.
- Capture screenshots as evidence for anything you report as a finding. "The form submits
  correctly" is worth much less than an image showing it did.
- Stop and ask after 2–3 failed attempts at the same action rather than retrying blindly.

## Record what you find

Write verified browser findings into the vault — a confirmed flow belongs in
`docs/vault/Business-Flows/`, a defect in `docs/vault/Known-Issues/`. Note the environment and
date; browser findings go stale faster than code findings.

## Related

- `docs/vault/Business-Flows/README.md` — flows awaiting an end-to-end trace
- `docs/vault/Backend/local-development.md` — bringing the stack up
