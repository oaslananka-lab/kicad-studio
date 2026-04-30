# Repository Autonomy

This repository uses guarded automation for CI, security checks, release packaging, and maintenance triage.

## Key Principles

- **Dual-owner mirror:** CI and releases run in a dedicated lab mirror (`oaslananka-lab`) while public project metadata stays in the canonical repository.
- **Org-pulls synchronization:** The org mirror periodically fetches from the canonical repository.
- **Doppler-first secrets:** Secrets are managed centrally in Doppler. No secrets are stored in GitHub except for the bootstrap `DOPPLER_TOKEN`.
- **Local-first quality gates:** Every check that runs in CI can be run locally via `task ci`.
- **Conventional Commits:** Enforced via `commitlint` to ensure a clean changelog.
- **Auto-drafted releases:** Release notes are automatically generated from merged PRs.
- **Guarded agents:** Agent or app automation is label-gated and cannot own secrets, publishing, workflow permission escalation, or major migrations.

## Workflow

1. Human pushes to `oaslananka/kicad-studio`.
2. `Sync from canonical` workflow in `oaslananka-lab/kicad-studio` pulls changes every 15 minutes (or on demand).
3. `KiCad Studio CI` runs in the lab mirror.
4. Security scans (CodeQL, Gitleaks, Scorecard) run in the lab mirror.
5. Releases are manually triggered in the lab mirror and mirrored back to the canonical repo.

See [maintenance/automation-policy.md](maintenance/automation-policy.md) for agent, dependency, and merge-automation boundaries.
