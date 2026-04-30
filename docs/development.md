# Development

## One-time setup

```bash
# Install Task: https://taskfile.dev/installation/
task install     # npm ci from package-lock.json
task hooks       # install git hooks
```

KiCad Studio development is pinned to Node.js 24.x and npm 11 or newer.
Use `.node-version` or `.nvmrc` with your version manager before installing
dependencies.

## Daily workflow

```bash
task format:fix          # auto-format
task lint                # check formatting and linting
task typecheck           # static types
task test:unit           # run fast unit tests
task package             # build the VSIX
task package:ls          # inspect packaged files
task security:ci         # run CI-safe npm audit
task security:local      # run npm audit, gitleaks, and bundle-size checks
task ci                  # run the full CI pipeline locally
```

## Before push

`pre-push` hook automatically runs `task pre-push`.
If you want to be sure CI will pass:

```bash
task pre-push            # fast pre-push gate
task ci                  # full local parity with CI
```

## Troubleshooting

- `task: command not found` → install Task: `brew install go-task` or download from https://taskfile.dev/installation/
- `npm ci` rejects your runtime → switch to Node.js 24.x and npm 11 or newer.
- pre-commit hook is too slow → run `pre-commit run --all-files` once to warm caches
- `task ci` fails but CI passes (or vice versa) → likely Doppler secrets differ; run `task doppler:check`
