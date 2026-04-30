# Webhook and Event Automation Roadmap

This repository steward currently uses GitHub CLI polling and GitHub Actions events as the primary automation model.

Webhooks should be introduced only when there is a stable external receiver such as:

- a private dashboard
- a VPS-hosted repo-steward API
- a Telegram/Discord/Slack notification bridge
- a controlled local/remote worker queue
- a release verification service

## Current preferred model

Use these before custom webhooks:

1. GitHub Actions native events
2. `workflow_dispatch`
3. `repository_dispatch`
4. scheduled repo-steward audits
5. GitHub Apps with limited, reviewed permissions
6. organization rulesets and repository custom properties

## Future webhook receiver design

A future webhook receiver should:

- verify `X-Hub-Signature-256`
- use a strong per-org webhook secret
- accept only required event types
- store event IDs to avoid duplicate processing
- rate-limit processing
- never expose raw secrets in logs
- enqueue long-running jobs instead of blocking webhook responses
- write back to GitHub through a least-privilege GitHub App or fine-grained token
- treat release, deployment, workflow, and secret-related events as high risk

## Suggested event classes

Low risk:

- `pull_request`
- `check_suite`
- `workflow_run`
- `issues`
- `issue_comment`

Medium risk:

- `repository_dispatch`
- `release`
- `deployment_status`

High risk:

- `deployment`
- `repository`
- `workflow_job`
- changes under `.github/workflows/**`
- events involving secrets, releases, or publishing

## Do not use webhooks for

- replacing required GitHub checks
- bypassing branch protection
- publishing packages without review
- secret rotation
- billing or payment operations
- high-risk automatic merges

The webhook layer should be a notification and orchestration layer, not the source of truth. The source of truth remains GitHub checks, branch protection/rulesets, and repo-steward audit reports.
