# Coding Agent Task Prompt

These instructions are private and must not be copied into repository files.

Mission:
Implement the requested improvements with small, safe, reviewable changes.

Rules:
- Keep changes focused.
- Add or update tests for behavior changes.
- Update documentation only when it reflects actual behavior.
- Do not weaken tests to make CI pass.
- Do not modify release, security, CI/CD, package publishing, or secret-handling logic unless explicitly required.
- Do not touch secrets or add real credentials.
- Do not introduce unnecessary dependencies.
- Do not add owner-only notes, prompt text, or AI meta-language to the repository.

Before claiming completion:
- run setup/install or explain why not
- run lint/format checks
- run typecheck when applicable
- run tests
- run build/package checks
- run docs build if docs changed
- summarize verification results

If incomplete:
- state what was completed
- state what remains
- include failed commands
- include exact next action
