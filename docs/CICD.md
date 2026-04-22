# CI/CD Routing

KiCad Studio keeps the personal GitHub repository as the primary source mirror and uses the
`oaslananka-lab` organization repository for automated GitHub Actions CI/CD.

## Repository Roles

- Personal source repository: `https://github.com/oaslananka/kicad-studio`
- CI/CD organization repository: `https://github.com/oaslananka-lab/kicad-studio`
- Azure DevOps: manual fallback only
- GitLab: manual fallback only

## Trigger Policy

- GitHub Actions in `oaslananka-lab` runs CI automatically for pushes and pull requests to `main`
  and `develop`.
- GitHub Actions in `oaslananka-lab` runs release packaging/publishing on `v*` tags, with the
  `marketplace` environment acting as the manual approval gate before Marketplace publishing.
- Personal GitHub workflows are manual fallback only. Workflow jobs are guarded so automatic push
  and pull-request events do not run primary CI/CD in the personal mirror.
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
