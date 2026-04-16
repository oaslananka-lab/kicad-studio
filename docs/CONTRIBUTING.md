# Contributing To KiCad Studio

## Development Setup

1. Install Node.js 20+ and VS Code 1.95+.
2. Run `npm install`.
3. Press `F5` to launch the Extension Development Host.
4. Run `npm run lint` and `npm run test:unit`.
5. Run `npm test` before sending substantial changes when the integration host is available.
6. Run `npm run test:e2e` for the desktop smoke suite when a Windows desktop session is available.

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

- `npm run lint` passes
- `npm run test:unit` passes
- `npm run test:e2e` passes for desktop-facing changes when the environment supports it
- relevant docs are updated
- screenshots or reproduction notes are included for UI changes
- new commands/settings are reflected in `package.json`

## CI/CD Expectations

- Azure DevOps is the primary CI/CD system.
- GitHub Actions are manual fallback workflows and should not be treated as the release source of truth.
- Marketplace publishing is approval-gated in Azure DevOps.
