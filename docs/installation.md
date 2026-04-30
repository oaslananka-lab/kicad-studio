# Installation

## Requirements

- VS Code 1.99 or newer
- Node.js 24.x and npm 11.x for local development
- KiCad 9 or newer for basic support
- KiCad 10 for variants, tuning metadata, and 3D PDF export

## KiCad CLI Setup

### Windows

KiCad Studio checks common KiCad install locations under `Program Files` and `Program Files (x86)`, including KiCad 10.

If auto-detection fails:

1. Open VS Code settings.
2. Search for `kicadstudio.kicadCliPath`.
3. Set the full path to `kicad-cli.exe`.

### macOS

The extension checks the KiCad app bundle plus common Homebrew paths.

### Linux

The extension checks:

- `/usr/bin/kicad-cli`
- `/usr/local/bin/kicad-cli`
- `/snap/bin/kicad-cli`
- `~/.local/bin/kicad-cli`

## MCP Setup

If `kicad-mcp-pro` is installed:

1. Run `KiCad: Setup MCP Integration`.
2. Review or accept the generated `.vscode/mcp.json`.
3. Configure `kicadstudio.mcp.endpoint` if you use HTTP mode.

## CI/CD Note

- The `oaslananka-lab` GitHub mirror owns the primary automated CI/CD workflows.
- Azure DevOps and GitLab are manual fallback pipelines.
- Publishing workflows require protected approval gates and secret names managed outside the repository.
