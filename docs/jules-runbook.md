# Jules / Autonomous Agent Runbook

Jules may be used as a coding worker only for issues that are explicitly labeled `agent:candidate` and classified as `risk:low` or `risk:medium`.

Jules must not be used for secrets, release publishing, workflow permission escalation, package ownership, marketplace account setup, OIDC/trusted publishing, or major dependency/runtime migrations. See [maintenance/automation-policy.md](maintenance/automation-policy.md) for the full policy.

## Setup

1. Add `JULES_API_KEY` to Doppler `all/main`.
2. Ensure `DOPPLER_TOKEN` is set as a GitHub Secret.
3. Keep Jules triggers manual or label-gated until the repository policy is enforced by workflow checks.

## Manual trigger via CLI

```bash
doppler run --project all --config main -- bash -c '
  curl -fsSL -X POST https://jules.googleapis.com/v1alpha/sessions \
    -H "x-goog-api-key: $JULES_API_KEY" \
    -H "Content-Type: application/json" \
    -d "$(jq -n \
      --arg prompt "Resolve issue #123" \
      --arg src    "sources/github/oaslananka/kicad-studio" \
      --arg title  "Fix issue #123" \
      "{prompt: \$prompt, sourceContext: {source: \$src, githubRepoContext: {startingBranch: \"main\"}}, automationMode: \"AUTO_CREATE_PR\", title: \$title}")"
'
```
