import * as vscode from 'vscode';
import { EXPORT_PRESET_SETTING } from '../constants';
import type { ExportPreset } from '../types';

export class ExportPresetStore {
  getAll(): ExportPreset[] {
    return vscode.workspace.getConfiguration().get<ExportPreset[]>(EXPORT_PRESET_SETTING, []);
  }

  async save(preset: ExportPreset): Promise<void> {
    const config = vscode.workspace.getConfiguration();
    const presets = this.getAll().filter((item) => item.name !== preset.name);
    presets.push(preset);
    await config.update(EXPORT_PRESET_SETTING, presets, vscode.ConfigurationTarget.Workspace);
  }

  getByName(name: string): ExportPreset | undefined {
    return this.getAll().find((preset) => preset.name === name);
  }
}
