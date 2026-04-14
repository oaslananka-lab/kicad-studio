import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import {
  COMMANDS,
  SETTINGS,
  VIEWER_HIDDEN_CACHE_RELEASE_MS,
  WEBVIEW_MESSAGE_DEBOUNCE_MS
} from '../constants';
import type { ViewerState } from '../types';
import { bufferToBase64 } from '../utils/fileUtils';
import { createKiCanvasViewerHtml, createViewerErrorHtml, kicanvasUri } from './viewerHtml';

const MAX_INLINE_INTERACTIVE_BYTES = 2 * 1024 * 1024;

interface ViewerPayload {
  fileName: string;
  base64: string;
  disabledReason: string;
  theme: string;
  restoreState?: ViewerState;
}

interface CachedFilePayload {
  base64: string;
  disabledReason: string;
  mtimeMs: number;
}

interface PanelInfo {
  uri: vscode.Uri;
  pendingRefresh: boolean;
  state?: ViewerState | undefined;
  releaseTimer?: NodeJS.Timeout | undefined;
}

/**
 * Shared custom editor provider for KiCanvas-backed viewers.
 */
export abstract class BaseKiCanvasEditorProvider
  implements vscode.CustomReadonlyEditorProvider, vscode.Disposable
{
  protected abstract readonly fileExtension: string;
  protected abstract readonly fileType: 'schematic' | 'board';
  protected abstract readonly viewerTitle: string;

  private readonly panels = new Map<string, Set<vscode.WebviewPanel>>();
  private readonly panelInfo = new Map<vscode.WebviewPanel, PanelInfo>();
  private readonly disposables: vscode.Disposable[] = [];
  private readonly refreshDebounce = new Map<string, NodeJS.Timeout>();
  private readonly fileCache = new Map<string, CachedFilePayload>();
  private theme = vscode.workspace.getConfiguration().get<string>(SETTINGS.viewerTheme, 'kicad');

  constructor(protected readonly context: vscode.ExtensionContext) {
    this.disposables.push(
      vscode.workspace.onDidSaveTextDocument((document) => {
        if (!document.fileName.endsWith(this.fileExtension)) {
          return;
        }
        this.invalidateFileCache(document.uri);
        if (!vscode.workspace.getConfiguration().get<boolean>(SETTINGS.viewerAutoRefresh, true)) {
          return;
        }
        this.scheduleRefresh(document.uri);
      })
    );
  }

  dispose(): void {
    for (const timeout of this.refreshDebounce.values()) {
      clearTimeout(timeout);
    }
    for (const info of this.panelInfo.values()) {
      if (info.releaseTimer) {
        clearTimeout(info.releaseTimer);
      }
    }
    this.disposables.forEach((item) => item.dispose());
  }

  setTheme(theme: string): void {
    this.theme = theme;
    for (const [panel, info] of this.panelInfo) {
      void panel.webview.postMessage({
        type: 'setTheme',
        payload: {
          theme,
          restoreState: info.state
        }
      });
    }
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
        webviewPanel.onDidDispose(() => this.untrackPanel(document.uri, webviewPanel)),
        webviewPanel.onDidChangeViewState((event) => {
          const info = this.panelInfo.get(event.webviewPanel);
          if (!info) {
            return;
          }
          if (event.webviewPanel.visible) {
            if (info.releaseTimer) {
              clearTimeout(info.releaseTimer);
              info.releaseTimer = undefined;
            }
            if (info.pendingRefresh) {
              info.pendingRefresh = false;
              void this.refreshDocument(info.uri);
            }
          } else {
            info.releaseTimer = setTimeout(() => {
              this.invalidateFileCache(info.uri);
            }, VIEWER_HIDDEN_CACHE_RELEASE_MS);
          }
        }),
        webviewPanel.webview.onDidReceiveMessage(async (message) => {
          if (message.type === 'openInKiCad') {
            await vscode.commands.executeCommand(COMMANDS.openInKiCad, document.uri);
          }
          if (message.type === 'requestRefresh') {
            await this.refreshDocument(document.uri);
          }
          if (message.type === 'viewerState') {
            const info = this.panelInfo.get(webviewPanel);
            if (info) {
              info.state = message.payload as ViewerState;
            }
          }
        })
      );
      await this.postFile(webviewPanel, document.uri);
    } catch (error) {
      webviewPanel.webview.html = createViewerErrorHtml(path.basename(document.uri.fsPath), error);
    }
  }

  protected async refreshDocument(uri: vscode.Uri): Promise<void> {
    const payload = await this.buildViewerPayload(uri);
    for (const panel of this.panels.get(uri.toString()) ?? []) {
      if (!panel.visible) {
        const info = this.panelInfo.get(panel);
        if (info) {
          info.pendingRefresh = true;
        }
        continue;
      }
      await panel.webview.postMessage({
        type: 'refresh',
        payload: {
          ...payload,
          restoreState: this.panelInfo.get(panel)?.state
        }
      });
    }
  }

  private scheduleRefresh(uri: vscode.Uri): void {
    const key = uri.toString();
    const existing = this.refreshDebounce.get(key);
    if (existing) {
      clearTimeout(existing);
    }
    this.refreshDebounce.set(
      key,
      setTimeout(() => {
        this.refreshDebounce.delete(key);
        void this.refreshDocument(uri);
      }, WEBVIEW_MESSAGE_DEBOUNCE_MS)
    );
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
      theme: payload.theme,
      ...(payload.restoreState ? { restoreState: payload.restoreState } : {})
    });
  }

  private async buildViewerPayload(uri: vscode.Uri): Promise<ViewerPayload> {
    const cacheKey = uri.toString();
    const fileName = path.basename(uri.fsPath);
    const stat = fs.statSync(uri.fsPath);
    const cached = this.fileCache.get(cacheKey);
    if (cached && cached.mtimeMs === stat.mtimeMs) {
      return {
        fileName,
        base64: cached.base64,
        disabledReason: cached.disabledReason,
        theme: this.theme
      };
    }

    const bytes = await vscode.workspace.fs.readFile(uri);
    const canInline = bytes.byteLength <= MAX_INLINE_INTERACTIVE_BYTES;
    const nextPayload: CachedFilePayload = {
      base64: canInline ? bufferToBase64(bytes) : '',
      disabledReason: canInline
        ? ''
        : `Interactive render is disabled for files larger than ${MAX_INLINE_INTERACTIVE_BYTES} bytes.`,
      mtimeMs: stat.mtimeMs
    };
    this.fileCache.set(cacheKey, nextPayload);

    return {
      fileName,
      base64: nextPayload.base64,
      disabledReason: nextPayload.disabledReason,
      theme: this.theme
    };
  }

  private invalidateFileCache(uri: vscode.Uri): void {
    this.fileCache.delete(uri.toString());
  }

  private trackPanel(uri: vscode.Uri, panel: vscode.WebviewPanel): void {
    const key = uri.toString();
    const set = this.panels.get(key) ?? new Set<vscode.WebviewPanel>();
    set.add(panel);
    this.panels.set(key, set);
    this.panelInfo.set(panel, {
      uri,
      pendingRefresh: false
    });
  }

  private untrackPanel(uri: vscode.Uri, panel: vscode.WebviewPanel): void {
    const key = uri.toString();
    const set = this.panels.get(key);
    if (set) {
      set.delete(panel);
      if (!set.size) {
        this.panels.delete(key);
      }
    }
    const info = this.panelInfo.get(panel);
    if (info?.releaseTimer) {
      clearTimeout(info.releaseTimer);
    }
    this.panelInfo.delete(panel);
  }
}
