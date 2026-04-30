# Contributing To KiCad Studio

## Development Setup

1. Install Node.js `24.14.1`, npm `11.13.x`, and VS Code 1.99+.
2. Run `task install` or `npm ci`.
3. Press `F5` to launch the Extension Development Host.
4. Let the Git hooks handle fast staged checks on commit and run `task pre-push` before push.
5. Run `task ci` or `npm run check:ci` when you want the closest local equivalent of the primary CI package gate.
6. Run `npm test` before sending substantial changes when the VS Code integration host is available.
7. Run `npm run test:e2e` for the desktop smoke suite when a desktop session is available.

KiCad and `kicad-cli` are optional for most unit tests. Install KiCad 10 when validating DRC/ERC, exports, variants, 3D PDF, or end-to-end extension behavior.

## Project Areas

- `src/extension.ts`: activation and command wiring
- `src/cli/`: KiCad CLI integration
- `src/providers/`: viewers and webview helpers
- `src/mcp/`: MCP detection, transport, context bridge, and UI
- `src/ai/`: providers, prompts, and chat panel
- `src/variants/`: KiCad 10 variant sidebar
- `src/drc/`: graphical DRC rules sidebar
- `test/unit/`: Jest-based unit coverage
- `test/e2e/`: Playwright-driven VS Code desktop smoke coverage

## Commit Style

Examples:

- `feat(mcp): add fix queue sidebar`
- `fix(viewer): restore layer visibility on refresh`
- `docs(readme): document Azure-first CI flow`
- `test(prompts): cover KiCad 10 grouped DRC summaries`

Allowed prefixes:

- `feat`
- `fix`
- `test`
- `docs`
- `refactor`
- `perf`
- `chore`

## Pull Request Checklist

- `task pre-push` passes
- `task ci` or `npm run check:ci` passes for release-facing changes
- `npm run test:e2e` passes for desktop-facing changes when the environment supports it
- relevant docs are updated
- screenshots or reproduction notes are included for UI changes
- new commands/settings are reflected in `package.json`
- workspace trust, security/secret, and release/package impacts are called out in the PR body

## CI/CD Expectations

- The `oaslananka-lab` GitHub mirror owns the primary automated CI/CD workflows.
- Azure DevOps and GitLab are manual fallback pipelines.
- Marketplace publishing is approval-gated through the GitHub `release` environment and requires explicit maintainer approval.
