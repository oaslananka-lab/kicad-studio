import * as vscode from 'vscode';
import { OUTPUT_CHANNEL_NAME } from '../constants';

export class Logger implements vscode.Disposable {
  private readonly channel: vscode.OutputChannel;

  constructor(name = OUTPUT_CHANNEL_NAME) {
    this.channel = vscode.window.createOutputChannel(name);
  }

  info(message: string): void {
    this.append('INFO', message);
  }

  warn(message: string): void {
    this.append('WARN', message);
  }

  error(message: string, error?: unknown): void {
    const detail = error instanceof Error ? `${error.message}\n${error.stack ?? ''}` : `${error ?? ''}`;
    this.append('ERROR', detail ? `${message}\n${detail}` : message);
  }

  debug(message: string): void {
    this.append('DEBUG', message);
  }

  show(preserveFocus = true): void {
    this.channel.show(preserveFocus);
  }

  dispose(): void {
    this.channel.dispose();
  }

  private append(level: string, message: string): void {
    const time = new Date().toISOString();
    this.channel.appendLine(`[${time}] [${level}] ${message}`);
  }
}
