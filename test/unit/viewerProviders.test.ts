import * as vscode from 'vscode';
import { SchematicEditorProvider } from '../../src/providers/schematicEditorProvider';
import { PcbEditorProvider } from '../../src/providers/pcbEditorProvider';
import { __setConfiguration, workspace } from './vscodeMock';

type ProviderCtor = new (context: vscode.ExtensionContext) => {
  resolveCustomEditor(document: vscode.CustomDocument, webviewPanel: vscode.WebviewPanel): Promise<void>;
  dispose(): void;
};

function createPanel() {
  const webview = {
    html: '',
    cspSource: 'vscode-resource:',
    options: undefined,
    postMessage: jest.fn().mockResolvedValue(true),
    onDidReceiveMessage: jest.fn(() => ({ dispose: jest.fn() })),
    asWebviewUri: jest.fn((value) => value)
  };

  let disposeCallback: (() => void) | undefined;
  const panel = {
    webview,
    onDidDispose: jest.fn((callback: () => void) => {
      disposeCallback = callback;
      return { dispose: jest.fn() };
    }),
    fireDispose: () => disposeCallback?.()
  };

  return panel;
}

describe.each([
  ['schematic', SchematicEditorProvider, '.kicad_sch', '(kicad_sch (symbol "R1"))'],
  ['pcb', PcbEditorProvider, '.kicad_pcb', '(kicad_pcb (footprint "R1"))']
])('%s viewer provider', (_label, Provider, extension, sourceText) => {
  const ContextProvider = Provider as ProviderCtor;

  beforeEach(() => {
    __setConfiguration({
      'kicadstudio.viewer.autoRefresh': true
    });
    (workspace.fs.readFile as jest.Mock).mockReset();
    (workspace.fs.readFile as jest.Mock).mockResolvedValue(Buffer.from(sourceText, 'utf8'));
    (workspace.onDidSaveTextDocument as jest.Mock).mockClear();
  });

  it('writes HTML on initial load', async () => {
    const provider = new ContextProvider({
      extensionUri: vscode.Uri.file('/extension')
    } as vscode.ExtensionContext);
    const panel = createPanel();
    const document = {
      uri: vscode.Uri.file(`/workspace/sample${extension}`)
    } as vscode.CustomDocument;

    await provider.resolveCustomEditor(document, panel as unknown as vscode.WebviewPanel);

    expect(panel.webview.html).toContain('Opening interactive renderer...');
    expect(panel.webview.html).toContain('kicanvas-source');
  });

  it('refreshes via postMessage without replacing HTML', async () => {
    const provider = new ContextProvider({
      extensionUri: vscode.Uri.file('/extension')
    } as vscode.ExtensionContext);
    const panel = createPanel();
    const document = {
      uri: vscode.Uri.file(`/workspace/sample${extension}`)
    } as vscode.CustomDocument;

    await provider.resolveCustomEditor(document, panel as unknown as vscode.WebviewPanel);
    const initialHtml = panel.webview.html;

    await (provider as any).refreshDocument(document.uri);

    expect(panel.webview.html).toBe(initialHtml);
    expect(panel.webview.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'refresh',
        payload: expect.objectContaining({
          fileName: `sample${extension}`
        })
      })
    );
  });

  it('untracks panels when the webview is disposed', async () => {
    const provider = new ContextProvider({
      extensionUri: vscode.Uri.file('/extension')
    } as vscode.ExtensionContext);
    const panel = createPanel();
    const document = {
      uri: vscode.Uri.file(`/workspace/sample${extension}`)
    } as vscode.CustomDocument;

    await provider.resolveCustomEditor(document, panel as unknown as vscode.WebviewPanel);

    const panels = (provider as any).panels.get(document.uri.toString());
    expect(panels.size).toBe(1);

    panel.fireDispose();

    expect((provider as any).panels.has(document.uri.toString())).toBe(false);
  });
});
