# Contributing to KiCad Studio

## Development Setup
1. Install Node.js 20+ and VS Code 1.95+.
2. Run `npm install`.
3. Press `F5` to launch the Extension Development Host.
4. Run `npm run test:unit` for unit tests.
5. Run `npm run lint` before opening a pull request.

## Architecture Overview
- `src/extension.ts` wires activation, service composition, and command registration.
- `src/ai/` contains AI providers, chat UI, and prompt builders.
- `src/cli/` contains `kicad-cli` wrappers, export logic, and DRC/ERC integration.
- `src/language/` contains the S-expression parser, diagnostics, completion, and hover support.
- `src/providers/` contains custom editors and webview-based viewers.
- `src/components/` contains remote component search and cache logic.
- `src/library/` contains local KiCad library indexing and search UI.
- `test/unit/` contains Jest tests for parser, AI, cache, and export helpers.

## Commit Convention
- `feat(ai): add streaming support for Claude provider`
- `fix(export): handle spaces in output path on Windows`
- `test(bom): add DNP component filtering cases`
- `docs(readme): update AI configuration section`

Allowed prefixes: `feat`, `fix`, `test`, `docs`, `refactor`, `perf`, `chore`.

## Pull Request Checklist
- [ ] `npm run lint` passes
- [ ] `npm run test:unit` passes and coverage does not regress
- [ ] New public APIs include JSDoc
- [ ] `CHANGELOG.md` is updated in the `Unreleased` section
- [ ] Relevant manual testing was completed on at least one platform

## Reporting Bugs
Please use the GitHub issue templates in `.github/ISSUE_TEMPLATE/`.
