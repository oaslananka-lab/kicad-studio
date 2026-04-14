# KiCad Studio Architecture

## Extension Lifecycle

`activate()` composes the parser, CLI services, viewers, tree providers, AI providers, and commands.  
The extension then registers diagnostics, custom editors, sidebar views, and task providers before refreshing context keys and status bar state.

## Service Graph

- `extension.ts` composes everything.
- `KiCadCliDetector` feeds `KiCadCliRunner`.
- `KiCadCliRunner` feeds export, DRC/ERC, and preview workflows.
- `SExpressionParser` feeds BOM parsing, symbol extraction, diagnostics, diffing, and document caching.
- `AIProviderRegistry` resolves Claude/OpenAI providers for `ErrorAnalyzer`, `CircuitExplainer`, and `KiCadChatPanel`.
- `KiCadLibraryIndexer` feeds `LibrarySearchProvider`.

## Data Flow

When a `.kicad_sch` or `.kicad_pcb` file is opened, the extension parses it with `SExpressionParser`, updates diagnostics, refreshes context keys, and keeps a cached AST in `KiCadDocumentStore`.  
Viewer providers then send the file payload to a webview that initializes KiCanvas locally.

## AI Flow

Commands route through `AIProviderRegistry`, which constructs the configured provider using SecretStorage-backed API keys.  
Single-shot analysis uses `analyze()`, while the chat panel uses `analyzeStream()` for token-by-token updates.  
The webview never talks to Anthropic or OpenAI directly; all network calls stay inside the extension host.

## Webview Architecture

Webviews use a strict CSP nonce pattern and local assets under `media/`.  
Extension host and webview communicate with `postMessage()` in both directions for refresh requests, state restore, selection changes, and streaming AI output.

## CLI Integration

`KiCadCliDetector` locates `kicad-cli`, then `KiCadCliRunner` spawns commands with progress reporting and duplicate-request coalescing.  
DRC/ERC results are normalized into `vscode.Diagnostic[]`, while exports write files into the configured fabrication output directory.

## Security Notes

- API keys live in VS Code SecretStorage, not plaintext settings.
- Webviews use local-only assets and a CSP nonce pattern.
- AI/network access is extension-host only.
- Viewer rendering is local and does not upload KiCad files.
