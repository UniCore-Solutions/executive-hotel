# Ensure every agent host can see the shared skills in .agents/skills.
#
# Windows entry point. If git symlink support is enabled (core.symlinks=true plus
# Developer Mode or an elevated shell) the committed symlinks already work and this
# is a no-op. Otherwise git checks each symlink out as a small text file containing
# the link target; this script detects that and substitutes a real directory copy.
#
# Re-run after editing any skill if you are on the copy fallback.
#   powershell -ExecutionPolicy Bypass -File scripts/setup-skills.ps1

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

$src = ".agents/skills"
$hosts = @(".claude", ".codex", ".opencode", ".cursor")

if (-not (Test-Path $src -PathType Container)) {
    Write-Error "FATAL: $src missing - wrong directory?"
}

foreach ($h in $hosts) {
    $target = Join-Path $h "skills"
    New-Item -ItemType Directory -Force -Path $h | Out-Null

    $item = Get-Item $target -ErrorAction SilentlyContinue
    $isLink = $item -and $item.LinkType -eq "SymbolicLink"
    $isRealDir = $item -and $item.PSIsContainer

    if ($isLink -and (Test-Path (Join-Path $target "backend-spring/SKILL.md"))) {
        Write-Host "ok       $target -> $($item.Target)"
        continue
    }
    if ($isRealDir -and -not $isLink -and (Test-Path (Join-Path $target "backend-spring/SKILL.md"))) {
        Write-Host "refresh  $target (existing copy)"
    } else {
        Write-Host "fallback $target (symlinks unavailable) - copying"
    }

    if ($item) { Remove-Item $target -Recurse -Force }
    # .agents/skills holds symlinks into vendor/superpowers. On a checkout without
    # symlink support those are text stubs, so copy from the vendor tree explicitly
    # after copying the project skills, ensuring real files either way.
    Copy-Item $src $target -Recurse -Force
    Get-ChildItem ".agents/vendor/superpowers/skills" -Directory | ForEach-Object {
        $dest = Join-Path $target $_.Name
        if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
        Copy-Item $_.FullName $dest -Recurse
    }
    # The symlink is tracked in git; a local copy would otherwise show as a dirty
    # working tree forever. Hide the substitution from git for this checkout only.
    git update-index --skip-worktree $target 2>$null
}

Write-Host ""
Write-Host "Skills available to: $($hosts -join ', ')"
Write-Host "Source of truth remains $src - edit skills there, never in a copy."
