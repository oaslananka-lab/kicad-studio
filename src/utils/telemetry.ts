import * as vscode from 'vscode';
import { SETTINGS } from '../constants';

export interface TelemetrySender {
  trackCommand(commandId: string, measurements: { durationMs: number }): void;
}

export class TelemetryService {
  constructor(private readonly sender?: TelemetrySender | undefined) {}

  trackCommand(commandId: string, durationMs: number): void {
    if (
      !vscode.workspace
        .getConfiguration()
        .get<boolean>(SETTINGS.telemetryEnabled, false)
    ) {
      return;
    }
    this.sender?.trackCommand(commandId, { durationMs });
  }
}

export const telemetry = new TelemetryService();
