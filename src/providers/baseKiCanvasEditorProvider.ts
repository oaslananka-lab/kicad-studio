import * as path from 'node:path';
import * as vscode from 'vscode';
import { COMMANDS, SETTINGS, WEBVIEW_MESSAGE_DEBOUNCE_MS } from '../constants';
import { bufferToBase64 } from '../utils/fileUtils';
import { createKiCanvasViewerHtml, createViewerErrorHtml, kicanvasUri } from './viewerHtml';

const MAX_INLINE_INTERACTIVE_BYTES = 2 * 1024 * 1024;

interface ViewerPayload {
  fileName: string;
  base64: string;
  disabledReason: string;
  theme: string;
}

export abstract class BaseKiCanvasEditorProvider implements vscode.CustomReadonlyEditorProvider, vscode.Disposable {
  protected abstract readonly fileExtension: string;
  protected abstract readonly fileType: 'schematic' | 'board';
  protected abstract readonly viewerTitle: string;

  private readonly panels = new Map<string, Set<vscode.WebviewPanel>>();
  private readonly disposables: vscode.Disposable[] = [];

  constructor(protected readonly context: vscode.ExtensionContext) {
    this.disposables.push(
      vscode.workspace.onDidSaveTextDocument((document) => {
        if (!document.fileName.endsWith(this.fileExtension)) {
          return;
        }
        if (!vscode.workspace.getConfiguration().get<boolean>(SETTINGS.viewerAutoRefresh, true)) {
          return;
        }
        setTimeout(() => void this.refreshDocument(document.uri), WEBVIEW_MESSAGE_DEBOUNCE_MS);
      })
    );
  }

  dispose(): void {
    this.disposables.forEach((item) => item.dispose());
  }

  async openCustomDocument(uri: vscode.Uri): Promise<vscode.CustomDocument> {
    return {
      uri,
      dispose() {}
    };
  }

  async resolveCustomEditor(
    document: vscode.CustomDocument,
    webviewPanel: vscode.WebviewPanel
  ): Promise<void> {
    try {
      webviewPanel.webview.options = {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'media')]
      };
      this.trackPanel(document.uri, webviewPanel);
      this.disposables.push(
        webviewPanel.onDidDispose(() => this.untrackPanel(document.uri, webviewPanel))
      );
      this.disposables.push(
        webviewPanel.webview.onDidReceiveMessage(async (message) => {
          if (message.type === 'openInKiCad') {
            await vscode.commands.executeCommand(COMMANDS.openInKiCad, document.uri);
          }
        })
      );
      await this.postFile(webviewPanel, document.uri);
    } catch (error) {
      webviewPanel.webview.html = createViewerErrorHtml(path.basename(document.uri.fsPath), error);
    }
  }

  private async refreshDocument(uri: vscode.Uri): Promise<void> {
    const payload = await this.buildViewerPayload(uri);
    for (const panel of this.panels.get(uri.toString()) ?? []) {
      await panel.webview.postMessage({
        type: 'refresh',
        payload
      });
    }
  }

  private async postFile(panel: vscode.WebviewPanel, uri: vscode.Uri): Promise<void> {
    const payload = await this.buildViewerPayload(uri);
    panel.webview.html = createKiCanvasViewerHtml({
      title: this.viewerTitle,
      fileName: payload.fileName,
      fileType: this.fileType,
      status: 'Opening interactive renderer...',
      cspSource: panel.webview.cspSource,
      kicanvasUri: kicanvasUri(this.context, panel.webview),
      base64: payload.base64,
      disabledReason: payload.disabledReason,
      theme: payload.theme
    });
  }

  private async buildViewerPayload(uri: vscode.Uri): Promise<ViewerPayload> {
    const bytes = await vscode.workspace.fs.readFile(uri);
    const fileName = path.basename(uri.fsPath);
    const canInline = bytes.byteLength <= MAX_INLINE_INTERACTIVE_BYTES;
    const theme = vscode.workspace.getConfiguration().get<string>(SETTINGS.viewerTheme, 'kicad');

    return {
      fileName,
      base64: canInline ? bufferToBase64(bytes) : '',
      disabledReason: canInline
        ? ''
        : `Interactive render is disabled for files larger than ${MAX_INLINE_INTERACTIVE_BYTES} bytes.`,
      theme
    };
  }

  private trackPanel(uri: vscode.Uri, panel: vscode.WebviewPanel): void {
    const key = uri.toString();
    const set = this.panels.get(key) ?? new Set<vscode.WebviewPanel>();
    set.add(panel);
    this.panels.set(key, set);
  }

  private untrackPanel(uri: vscode.Uri, panel: vscode.WebviewPanel): void {
    const key = uri.toString();
    const set = this.panels.get(key);
    if (!set) {
      return;
    }
    set.delete(panel);
    if (!set.size) {
      this.panels.delete(key);
    }
  }
}
