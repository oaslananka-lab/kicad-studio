import * as fs from 'node:fs';
import * as vscode from 'vscode';
import { COMMANDS, EXPORT_PRESET_SETTING } from '../constants';
import type { ExportPreset } from '../types';

const LAST_USED_PRESET_KEY = 'kicadstudio.exportPresets.lastUsed';

/**
 * Workspace-backed export preset storage with validation and import/export helpers.
 */
export class ExportPresetStore {
  constructor(private readonly context: vscode.ExtensionContext) {}

  getAll(): ExportPreset[] {
    return vscode.workspace.getConfiguration().get<ExportPreset[]>(EXPORT_PRESET_SETTING, []);
  }

  getByName(name: string): ExportPreset | undefined {
    return this.getAll().find((preset) => preset.name === name);
  }

  getLastUsedName(): string | undefined {
    return this.context.workspaceState.get<string>(LAST_USED_PRESET_KEY);
  }

  async save(preset: ExportPreset): Promise<void> {
    this.validatePreset(preset);
    const config = vscode.workspace.getConfiguration();
    const presets = this.getAll().filter((item) => item.name !== preset.name);
    presets.push(preset);
    await config.update(EXPORT_PRESET_SETTING, presets, vscode.ConfigurationTarget.Workspace);
  }

  async rememberLastUsed(name: string): Promise<void> {
    await this.context.workspaceState.update(LAST_USED_PRESET_KEY, name);
  }

  async exportToFile(filePath: string): Promise<void> {
    fs.writeFileSync(filePath, JSON.stringify(this.getAll(), null, 2), 'utf8');
  }

  async importFromFile(filePath: string): Promise<void> {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw) as ExportPreset[];
    for (const preset of parsed) {
      this.validatePreset(preset);
    }
    await vscode.workspace
      .getConfiguration()
      .update(EXPORT_PRESET_SETTING, parsed, vscode.ConfigurationTarget.Workspace);
  }

  private validatePreset(preset: ExportPreset): void {
    if (!preset.name.trim()) {
      throw new Error('Export preset name cannot be empty.');
    }
    const validCommands = new Set(Object.values(COMMANDS));
    for (const command of preset.commands) {
      if (!validCommands.has(command as typeof COMMANDS[keyof typeof COMMANDS])) {
        throw new Error(`Export preset "${preset.name}" contains an unknown command: ${command}`);
      }
    }
  }
}
