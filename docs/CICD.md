# CI/CD Routing

KiCad Studio keeps the personal GitHub repository as the primary source mirror and uses the
`oaslananka-lab` organization repository for automated GitHub Actions CI/CD.

## Repository Roles

- Personal source repository: `https://github.com/oaslananka/kicad-studio`
- CI/CD organization repository: `https://github.com/oaslananka-lab/kicad-studio`
- Azure DevOps: manual fallback only
- GitLab: manual fallback only

## Trigger Policy

- GitHub Actions in `oaslananka-lab` runs CI automatically for pushes, pull requests, and merge
  queue events. Repository guards keep those jobs scoped to the lab mirror.
- GitHub Actions in `oaslananka-lab` runs manual release packaging through the `Release` workflow,
  with the `release` environment and `APPROVE_RELEASE` confirmation acting as approval gates before
  Marketplace or Open VSX publishing.
- The canonical GitHub repository is the public source of truth. Lab workflows are guarded so the
  automation mirror owns primary CI/CD.
- Azure Pipelines are manual-only (`trigger: none`, `pr: none`).
- GitLab CI is manual-only and starts only from the GitLab web UI.

## Required GitHub Organization Secrets

Configure these in the `oaslananka-lab/kicad-studio` repository or organization:

- `DOPPLER_TOKEN`: Doppler service token with read access to the release config.
- `DOPPLER_PROJECT`: Doppler project name, for example `all`.
- `DOPPLER_CONFIG`: Doppler config name, for example `main`.

The release workflow reads publish credentials from Doppler at runtime. The Doppler config must
provide:

- `VSCE_PAT`: Visual Studio Marketplace publish token.
- `OVSX_PAT`: Open VSX publish token, only needed when Open VSX publishing is requested.

## Suggested Local Remotes

Use separate remotes so source can be pushed to both GitHub repositories without making Azure the
default source remote:

```bash
git remote set-url origin git@github.com:oaslananka/kicad-studio.git
git remote add github-org git@github.com:oaslananka-lab/kicad-studio.git
git remote add azure git@ssh.dev.azure.com:v3/oaslananka/open-source/kicad-studio
```

To publish source changes to both GitHub repositories:

```bash
git push origin main
git push github-org main
git push origin --tags
git push github-org --tags
```

Routine feature work should use a branch and PR instead of pushing directly to `main`.
