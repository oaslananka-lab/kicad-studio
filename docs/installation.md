# Installation

## Requirements

- VS Code 1.95 or newer
- Node.js 20 or newer for local development
- KiCad 6 or newer for basic support
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
- KiCad Flatpak through `flatpak run --command=kicad-cli org.kicad.KiCad`

### Linux Flatpak

If KiCad is installed through Flatpak, configure the structured launcher instead
of putting the full command into `kicadstudio.kicadCliPath`. The launcher is
executed as an executable plus an argument array, without a shell:

```json
{
  "kicadstudio.kicadCliCommand": {
    "command": "flatpak",
    "args": ["run", "--command=kicad-cli", "org.kicad.KiCad"]
  }
}
```

Verify the same command works in a terminal:

```bash
flatpak run --command=kicad-cli org.kicad.KiCad version
```

Use `kicadstudio.kicadCliPath` only for a direct executable path such as
`/usr/bin/kicad-cli`, `/snap/bin/kicad-cli`, or a Windows `.exe` path. Do not put
shell metacharacters, environment assignments, pipes, redirects, or a full
command line into `kicadstudio.kicadCliPath`.

## MCP Setup

If `kicad-mcp-pro` is installed:

1. Run `KiCad: Setup MCP Integration`.
2. Review or accept the generated `.vscode/mcp.json`.
3. Configure `kicadstudio.mcp.endpoint` if you use HTTP mode.

## CI/CD Note

- The `oaslananka-lab` GitHub mirror owns the primary automated CI/CD workflows.
- Azure DevOps and GitLab are manual fallback pipelines.
- GitHub Actions in the personal mirror are manual fallback workflows only.
