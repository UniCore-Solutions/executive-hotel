#!/usr/bin/env bash
# Ensure every agent host can see the shared skills in .agents/skills.
#
# On Linux/macOS (and Windows with git symlink support enabled) the committed
# symlinks already work and this script is a no-op verification.
#
# On Windows without symlink support, git checks the symlinks out as plain text
# files containing the link target. This script detects that and replaces them
# with real directory copies instead.
#
# Re-run after editing any skill if you are on the copy fallback.
set -euo pipefail

cd "$(dirname "$0")/.."
SRC=".agents/skills"
HOSTS=(".claude" ".codex" ".opencode" ".cursor")

[ -d "$SRC" ] || { echo "FATAL: $SRC missing — wrong directory?" >&2; exit 1; }

for host in "${HOSTS[@]}"; do
  target="$host/skills"
  mkdir -p "$host"

  if [ -L "$target" ] && [ -d "$target" ]; then
    echo "ok       $target -> $(readlink "$target")"
    continue
  fi

  # Broken symlink, checked-out-as-text symlink, or nothing at all.
  echo "fallback $target (symlinks unavailable) — copying"
  rm -rf "$target"
  # -L dereferences: .agents/skills contains symlinks into vendor/superpowers,
  # and a symlink-less checkout must end up with real files, not dangling links.
  cp -RL "$SRC" "$target"
  # The symlink is tracked in git; a local copy would otherwise show as a dirty
  # working tree forever. Hide the substitution from git for this checkout only.
  git update-index --skip-worktree "$target" 2>/dev/null || true
done

echo
echo "Skills available to: ${HOSTS[*]}"
echo "Source of truth remains $SRC — edit skills there, never in a copy."
