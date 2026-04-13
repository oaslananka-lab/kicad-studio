import * as vscode from 'vscode';
import { SEARCH_DEBOUNCE_MS, SETTINGS } from '../constants';
import type { ComponentSearchResult } from '../types';
import { openDatasheet } from './datasheetOpener';
import { LcscClient } from './lcscClient';
import { OctopartClient } from './octopartClient';

export class ComponentSearchService {
  private detailsPanel?: vscode.WebviewPanel;

  constructor(
    private readonly octopart: OctopartClient,
    private readonly lcsc: LcscClient
  ) {}

  async search(): Promise<void> {
    const sourceChoices = await vscode.window.showQuickPick(
      [
        { label: 'Octopart / Nexar', value: 'octopart', picked: true },
        { label: 'LCSC', value: 'lcsc', picked: vscode.workspace.getConfiguration().get<boolean>(SETTINGS.enableLCSC, true) }
      ],
      { canPickMany: true, title: 'Choose component sources' }
    );
    if (!sourceChoices?.length) {
      return;
    }

    const query = await vscode.window.showInputBox({
      title: 'Search component',
      prompt: 'Enter part number, description, or value + footprint'
    });
    if (!query) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, SEARCH_DEBOUNCE_MS));
    const results: ComponentSearchResult[] = [];
    const selectedSources = new Set(sourceChoices.map((item) => item.value));

    if (selectedSources.has('octopart')) {
      results.push(...(await this.octopart.search(query).catch(() => [])));
    }
    if (selectedSources.has('lcsc')) {
      results.push(...(await this.lcsc.search(query).catch(() => [])));
    }

    const picked = await vscode.window.showQuickPick(
      results.map((result) => ({
        label: result.mpn || result.lcscPartNumber || result.description,
        description: `${result.manufacturer} • ${result.source}`,
        detail: result.description,
        result
      })),
      { title: 'Search results' }
    );
    if (!picked) {
      return;
    }

    await this.showDetails(picked.result);
  }

  private async showDetails(result: ComponentSearchResult): Promise<void> {
    if (!this.detailsPanel) {
      this.detailsPanel = vscode.window.createWebviewPanel(
        'kicadstudio.componentDetails',
        'KiCad Component Details',
        vscode.ViewColumn.Beside,
        { enableScripts: true }
      );
      this.detailsPanel.onDidDispose(() => {
        this.detailsPanel = undefined;
      });
      this.detailsPanel.webview.onDidReceiveMessage(async (message) => {
        if (message.type === 'datasheet' && message.url) {
          await openDatasheet(String(message.url));
        }
        if (message.type === 'copy-mpn' && message.mpn) {
          await vscode.env.clipboard.writeText(String(message.mpn));
        }
      });
    }

    this.detailsPanel.title = `Part: ${result.mpn || result.lcscPartNumber || 'Details'}`;
    const nonce = createNonce();
    const cspSource = this.detailsPanel.webview.cspSource;
    this.detailsPanel.webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data: ${cspSource}; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <style nonce="${nonce}">
    body { font-family: Segoe UI, sans-serif; background: #0f172a; color: #e2e8f0; padding: 16px; }
    button { margin-right: 8px; }
    pre { white-space: pre-wrap; }
  </style>
</head>
<body>
  <h1>${escapeHtml(result.mpn || result.lcscPartNumber || 'Part')}</h1>
  <p>${escapeHtml(result.description)}</p>
  <p><strong>Manufacturer:</strong> ${escapeHtml(result.manufacturer || 'Unknown')}</p>
  <p><strong>Source:</strong> ${escapeHtml(result.source)}</p>
  <button id="datasheet">Open Datasheet</button>
  <button id="copy">Copy MPN</button>
  <button disabled>Insert into Schematic</button>
  <h2>Offers</h2>
  <pre>${escapeHtml(JSON.stringify(result.offers, null, 2))}</pre>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    document.getElementById('datasheet').addEventListener('click', () => vscode.postMessage({ type: 'datasheet', url: ${JSON.stringify(result.datasheetUrl ?? '')} }));
    document.getElementById('copy').addEventListener('click', () => vscode.postMessage({ type: 'copy-mpn', mpn: ${JSON.stringify(result.mpn)} }));
  </script>
</body>
</html>`;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createNonce(): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let value = '';
  for (let i = 0; i < 32; i++) {
    value += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return value;
}
