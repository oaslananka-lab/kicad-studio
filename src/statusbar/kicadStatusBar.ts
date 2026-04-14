import * as vscode from 'vscode';
import { COMMANDS } from '../constants';
import type { DetectedKiCadCli, DiagnosticSummary } from '../types';

export class KiCadStatusBar implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem;
  private cli: DetectedKiCadCli | undefined;
  private drc: DiagnosticSummary | undefined;
  private erc: DiagnosticSummary | undefined;
  private aiConfigured = false;
  private aiHealthy: boolean | undefined;

  constructor(_context: vscode.ExtensionContext) {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.item.command = {
      command: COMMANDS.showStatusMenu,
      title: 'KiCad Studio'
    };
    this.item.show();
    this.render();
  }

  update(update: {
    cli?: DetectedKiCadCli | undefined;
    drc?: DiagnosticSummary | undefined;
    erc?: DiagnosticSummary | undefined;
    aiConfigured?: boolean;
    aiHealthy?: boolean | undefined;
  }): void {
    this.cli = update.cli ?? this.cli;
    this.drc = update.drc ?? this.drc;
    this.erc = update.erc ?? this.erc;
    this.aiConfigured = update.aiConfigured ?? this.aiConfigured;
    this.aiHealthy = update.aiHealthy ?? this.aiHealthy;
    this.render();
  }

  getSnapshot(): {
    cli: DetectedKiCadCli | undefined;
    drc: DiagnosticSummary | undefined;
    erc: DiagnosticSummary | undefined;
    aiConfigured: boolean;
    aiHealthy: boolean | undefined;
  } {
    return {
      cli: this.cli,
      drc: this.drc,
      erc: this.erc,
      aiConfigured: this.aiConfigured,
      aiHealthy: this.aiHealthy
    };
  }

  dispose(): void {
    this.item.dispose();
  }

  private render(): void {
    if (!this.cli) {
      this.item.text = '$(warning) KiCad: Not found';
      this.item.tooltip = 'kicad-cli not found. Click to configure.';
      return;
    }

    const drcText = this.drc
      ? this.drc.errors > 0
        ? `DRC: ${this.drc.errors} ✗`
        : this.drc.warnings > 0
          ? `DRC: ${this.drc.warnings} ⚠`
          : 'DRC: ✓'
      : 'DRC: —';
    const ercText = this.erc
      ? this.erc.errors > 0
        ? `ERC: ${this.erc.errors} ✗`
        : this.erc.warnings > 0
          ? `ERC: ${this.erc.warnings} ⚠`
          : 'ERC: ✓'
      : 'ERC: —';
    const aiText = !this.aiConfigured
      ? 'AI: ○'
      : this.aiHealthy === false
        ? 'AI: ◔'
        : 'AI: ●';

    this.item.text = `$(circuit-board) ${this.cli.versionLabel} | ${drcText} | ${ercText} | ${aiText}`;
    this.item.tooltip = `CLI: ${this.cli.path}\nAI: ${
      !this.aiConfigured ? 'not configured' : this.aiHealthy === false ? 'configured, last check failed' : 'configured'
    }`;
  }
}
