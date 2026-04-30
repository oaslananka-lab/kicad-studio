# Repository Operations

## Dual-owner mirror model

- `oaslananka/kicad-studio` is the canonical public repository.
- `oaslananka-lab/kicad-studio` is the CI/CD runner mirror.
- Public issue reporting, documentation, Marketplace metadata, and release notes point to the canonical repository.
- The lab mirror periodically pulls from canonical and replays branches/tags for CI, security scanning, release packaging, and release verification.
- Direct pushes to protected branches are avoided; routine work should happen on reviewable branches and PRs.
- Release and publishing workflows require the lab repository, protected environments, and explicit maintainer approval.

## Daily operations

### Local sync

```bash
bash scripts/sync-remotes.sh
```

PowerShell users can run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/sync-remotes.ps1
```

### Secret verification

```bash
task doppler:check
```

This command verifies that the expected Doppler secret names exist. It never prints secret values.

### Manual Sync Trigger

If you need immediate CI feedback without waiting for the 15-minute cron:

```bash
# Trigger sync from org side
gh workflow run "Sync from canonical" --repo oaslananka-lab/kicad-studio
```

## Repository hygiene

Native GitHub branch deletion is enabled on the lab mirror. The monthly branch hygiene workflow only reports stale branches and old PRs; it does not delete branches.

A local cleanup script is available for maintainers who want a dry-run report before manual cleanup:

```bash
bash scripts/repo-cleanup.sh           # dry-run
bash scripts/repo-cleanup.sh --apply   # execute deletions after review
```

## Local verification

```bash
task pre-push
task ci
```

Equivalent npm commands:

```bash
npm ci
npm run check:ci
npm run package
npm run package:ls
```

Run `npm run package` before `npm run check:bundle-size`; the bundle-size script verifies the generated VSIX as well as bundled JavaScript assets.

## Automation policy

See [maintenance/automation-policy.md](maintenance/automation-policy.md) for label gates, dependency update policy, and the boundaries for coding agents, review bots, and merge automation.

## Auto-delete head branches

It is recommended to keep "Automatically delete head branches" enabled on the lab mirror:

```bash
gh api -X PATCH /repos/oaslananka-lab/kicad-studio -f delete_branch_on_merge=true
```
