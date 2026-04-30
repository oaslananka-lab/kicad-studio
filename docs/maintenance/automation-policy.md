# Automation Policy

This repository uses automation to reduce maintenance load, not to bypass review.

## Repository roles

- `oaslananka/kicad-studio` is the public project identity for users, issues, documentation, and release metadata.
- `oaslananka-lab/kicad-studio` runs CI, security scans, packaging, release verification, label sync, release drafting, and mirror sync.
- Azure DevOps and GitLab pipelines are manual fallback paths.

## Agent and app boundaries

Coding agents and review apps may help with low and medium risk issue-to-PR work when the issue has enough context and an explicit automation label. They must not own release, credential, or repository-administration decisions.

Allowed automation candidates:

- documentation fixes
- test-only improvements
- small bug fixes with clear reproduction steps
- non-runtime refactors with local tests
- CI metadata hardening that does not weaken gates
- patch/minor dev dependency updates after CI passes

Human review is required for:

- secret handling, token rotation, Doppler project/config changes, or credential inventory changes
- VS Marketplace, Open VSX, GitHub Release, npm, or other publishing changes
- OIDC or trusted publishing changes
- workflow permission escalation
- package ownership, publisher, extension ID, or public API changes
- major dependency, Node, VS Code engine, TypeScript, ESLint, Jest, Playwright, webpack, `@vscode/vsce`, or `ovsx` upgrades
- KiCad CLI behavior changes, MCP protocol changes, or workspace trust behavior changes
- broad Mergify rules or auto-merge changes
- production deployment or infrastructure changes

## Tool-specific policy

- Jules can be used as a coding worker for label-gated issues marked `agent:candidate` with `risk:low` or `risk:medium`.
- GitHub Copilot coding agent can handle small, well-scoped maintenance tasks when the issue is actionable.
- Gemini Code Assist can review, summarize, or comment, but it is not a release owner.
- SonarQube Cloud is a quality and security signal. It is not the only merge decision.
- Mergify, if enabled, may merge only low-risk PRs with complete required checks and no security, release, marketplace, workspace-trust, or dependency-major impact.
- repo-steward is the audit and triage control plane for repository capability checks.

## Labels

Use these labels to make automation intent explicit:

- `needs:triage`: issue needs maintainer classification before work starts
- `needs:human`: issue or PR requires maintainer decision
- `agent:candidate`: a coding agent may take the task
- `agent:working`: an agent is actively working
- `agent:needs-human`: an agent found a blocker or risk that needs review
- `risk:low`, `risk:medium`, `risk:high`: expected change risk
- `area:ci`, `area:docs`, `area:tests`, `area:package`, `area:security`, `area:extension`, `area:marketplace`: affected surfaces

## Dependency updates

Dependabot is kept for GitHub Actions version updates and GitHub security alerts. Renovate handles npm and Dockerfile version updates with grouping and review labels.

Policy:

- Patch/minor dev dependency updates may be candidates for low-risk automation after CI passes.
- Runtime dependencies require maintainer review.
- Major updates require maintainer approval and, when needed, a migration issue.
- Node major upgrades, VS Code engine changes, TypeScript, ESLint, Jest, Playwright, webpack, `@vscode/vsce`, `ovsx`, KiCad/MCP-related packages, and Docker base image major updates require human review.
- Security updates stay enabled and should not be batched with unrelated feature work.

## Release and publishing

Publishing is never automatic from a pull request. Release workflows must run from the lab repository, use protected environments, verify the package, reference secret names only, and require explicit maintainer approval before publishing or creating public release outputs.
