import * as vscode from 'vscode';
import type { BomEntry, BomWebviewMessage } from '../types';

export class BomWebviewManager {
  private view?: vscode.WebviewView;

  attach(view: vscode.WebviewView): void {
    this.view = view;
  }

  postMessage(message: BomWebviewMessage): void {
    void this.view?.webview.postMessage(message);
  }

  setEntries(entries: BomEntry[]): void {
    this.postMessage({
      type: 'setData',
      payload: {
        entries,
        summary: {
          totalComponents: entries.reduce((sum, entry) => sum + entry.quantity, 0),
          uniqueValues: entries.length
        }
      }
    });
  }

  highlightReference(reference: string): void {
    this.postMessage({
      type: 'highlight',
      payload: { reference }
    });
  }
}
