# Vendored: Superpowers

Upstream: https://github.com/obra/superpowers (MIT, see `LICENSE`)
Version: **6.3.0**
Pinned commit: `b36e0829c6d0140e93cfef2ca599b1b07d4a7797`
Vendored: 2026-08-28

## Why vendored instead of installed per-agent

Upstream's own install docs say "installation differs by harness — if you use more than
one, install Superpowers separately for each one." That is per-machine, per-agent global
state: exactly the duplication this repo's agent setup exists to remove, and it would
leave each teammate on a different Superpowers version.

Vendoring gives one pinned copy in the repo. A plain `git clone` gets every agent the
same skills at the same version, with no per-developer install step.

Trade-off: upstream updates are a deliberate action, not automatic. That is intended —
a workflow framework that silently changes under a team is worse than one that lags.

## What is included

`skills/` (14) · `hooks/` (SessionStart context injection) · `opencode-plugins/` ·
per-host manifests (`.claude-plugin/`, `.codex-plugin/`, `.cursor-plugin/`) · `LICENSE`.

Excluded as unnecessary here: upstream `docs/`, `tests/`, `assets/`.

## How each host reaches it

- **Skills (all hosts):** `.agents/skills/<skill>` symlinks into `skills/` here, and each
  host's `<host>/skills` symlinks to `.agents/skills/`. One file, four hosts.
- **Claude Code activation:** `.claude/settings.json` registers the `SessionStart` hook,
  which injects `using-superpowers` into every session. This is what makes the meta-skill
  a live dispatcher rather than a file nobody reads.
- **OpenCode:** `.opencode/plugins/superpowers.js`.

## Updating

```bash
git clone --depth 1 https://github.com/obra/superpowers /tmp/sp
cp -R /tmp/sp/{skills,hooks} .agents/vendor/superpowers/
# update the pin above, re-run scripts/setup-skills.sh, commit
```

Check for new or renamed skills afterwards: `.agents/skills/` needs a symlink per skill,
and a removed upstream skill leaves a dangling link.
