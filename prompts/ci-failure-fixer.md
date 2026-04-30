# CI Failure Fixer Prompt

These instructions are private and must not be copied into repository files.

Goal:
Fix the failing CI with the smallest safe change.

Rules:
- Do not weaken tests.
- Do not remove failing assertions unless they are clearly obsolete and the reason is documented.
- Do not modify release, publishing, security, or secret-handling workflows unless the failure is directly caused by them and the fix is minimal.
- Do not add dependencies unless unavoidable.
- Reproduce the failing command when possible.
- Add a regression test if the failure exposes a real bug.

Output:
- root cause
- files changed
- commands run
- remaining risks
