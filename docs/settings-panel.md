# Settings Panel

KiCad Studio settings are contributed through the VS Code Settings UI under the `kicadstudio` namespace. The extension manifest is the source of truth for setting keys, defaults, enum values, and descriptions.

## Maintainer Notes

- Keep setting descriptions concise and user-facing because they render directly in VS Code.
- Update README and feature docs when a setting changes public behavior.
- Use `kicadstudio.kicadCliPath` for a direct executable path only. Use
  `kicadstudio.kicadCliCommand` for structured launchers with arguments, such as
  KiCad Flatpak.
- Keep prompt-facing AI settings aligned with `docs/AI_PROVIDERS.md`.
- Keep MCP settings aligned with `docs/INTEGRATION.md` and the `.vscode/mcp.json` schema.
- Validate manifest edits with `npm run format:check`, `npm run typecheck`, and package metadata checks before release.
