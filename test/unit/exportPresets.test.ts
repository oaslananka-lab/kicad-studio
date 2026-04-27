import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { ExportPresetStore } from '../../src/cli/exportPresets';
import { COMMANDS, EXPORT_PRESET_SETTING } from '../../src/constants';
import {
  __setConfiguration,
  createExtensionContextMock,
  workspace
} from './vscodeMock';

describe('ExportPresetStore', () => {
  let tempDir: string;

  beforeEach(() => {
    jest.clearAllMocks();
    __setConfiguration({});
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kicadstudio-presets-'));
    workspace.workspaceFolders = [{ uri: vscode.Uri.file(tempDir) }] as never;
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('migrates legacy presets without schemaVersion on load', () => {
    __setConfiguration({
      [EXPORT_PRESET_SETTING]: [
        {
          name: 'Legacy Gerbers',
          commands: [COMMANDS.exportGerbers]
        }
      ]
    });
    const store = new ExportPresetStore(
      createExtensionContextMock() as unknown as vscode.ExtensionContext
    );

    expect(store.getAll()).toEqual([
      expect.objectContaining({
        schemaVersion: 2,
        name: 'Legacy Gerbers',
        commands: [COMMANDS.exportGerbers]
      })
    ]);
  });

  it('loads workspace presets from .vscode/kicad-export-presets.json after configured presets', () => {
    __setConfiguration({
      [EXPORT_PRESET_SETTING]: [
        {
          schemaVersion: 2,
          name: 'User Gerbers',
          commands: [COMMANDS.exportGerbers]
        }
      ]
    });
    const vscodeDir = path.join(tempDir, '.vscode');
    fs.mkdirSync(vscodeDir, { recursive: true });
    fs.writeFileSync(
      path.join(vscodeDir, 'kicad-export-presets.json'),
      JSON.stringify([
        {
          name: 'Workspace Pack',
          commands: [COMMANDS.exportGerbersWithDrill]
        }
      ]),
      'utf8'
    );
    const store = new ExportPresetStore(
      createExtensionContextMock() as unknown as vscode.ExtensionContext
    );

    expect(store.getAll().map((preset) => preset.name)).toEqual([
      'User Gerbers',
      'Workspace Pack'
    ]);
    expect(store.getByName('Workspace Pack')?.schemaVersion).toBe(2);
  });
});
