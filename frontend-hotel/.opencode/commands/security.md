---
description: Run the security audit (code review + npm audit).
agent: security
---

Run the security audit: inspect input handling, XSS risks, URL/image allowlists, validation rules, secrets, auth boundaries, localStorage keys, and run `npm audit`. Produce numbered findings with severity and required fixes, then verdict SECURE or REJECTED. $ARGUMENTS
