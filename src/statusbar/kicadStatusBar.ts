import * as vscode from 'vscode';
import { COMMANDS } from '../constants';
import type { DetectedKiCadCli, DiagnosticSummary } from '../types';

export class KiCadStatusBar implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem;
  private cli?: DetectedKiCadCli;
  private drc?: DiagnosticSummary;
  private erc?: DiagnosticSummary;

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
  }): void {
    this.cli = update.cli ?? this.cli;
    this.drc = update.drc ?? this.drc;
    this.erc = update.erc ?? this.erc;
    this.render();
  }

  getSnapshot(): {
    cli?: DetectedKiCadCli;
    drc?: DiagnosticSummary;
    erc?: DiagnosticSummary;
  } {
    return {
      cli: this.cli,
      drc: this.drc,
      erc: this.erc
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

    this.item.text = `$(circuit-board) ${this.cli.versionLabel} | ${drcText} | ${ercText}`;
    this.item.tooltip = `CLI: ${this.cli.path}`;
  }
}
