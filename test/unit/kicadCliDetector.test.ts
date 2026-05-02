jest.mock('node:child_process', () => ({
  spawnSync: jest.fn()
}));

jest.mock('node:fs', () => {
  const actual = jest.requireActual('node:fs');
  const realpathSync = Object.assign(jest.fn(actual.realpathSync), {
    native: jest.fn(actual.realpathSync.native)
  });
  return {
    ...actual,
    existsSync: jest.fn(actual.existsSync),
    realpathSync
  };
});

import * as fs from 'node:fs';
import * as childProcess from 'node:child_process';
import * as vscode from 'vscode';
import { __setConfiguration } from './vscodeMock';
import {
  getCliCandidates,
  KiCadCliDetector
} from '../../src/cli/kicadCliDetector';
import * as pathUtils from '../../src/utils/pathUtils';

describe('KiCadCliDetector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __setConfiguration({
      'kicadstudio.kicadCliPath': 'C:\\KiCad\\bin\\kicad-cli.exe'
    });
    // Default mock for spawnSync to avoid "status of undefined"
    (childProcess.spawnSync as jest.Mock).mockReturnValue({
      status: 1,
      stdout: '',
      stderr: ''
    });
  });

  it('detects kicad-cli from settings path', async () => {
    const detector = new KiCadCliDetector() as any;
    detector.validateCandidate = jest.fn().mockResolvedValue({
      path: 'C:\\KiCad\\bin\\kicad-cli.exe',
      version: '9.0.1',
      versionLabel: 'KiCad 9.0.1',
      source: 'settings'
    });

    const result = await detector.detect();
    expect(result?.path).toContain('kicad-cli.exe');
    expect(detector.validateCandidate).toHaveBeenCalled();
  });

  it('falls back to system PATH', async () => {
    __setConfiguration({
      'kicadstudio.kicadCliPath': ''
    });
    const detector = new KiCadCliDetector() as any;
    detector.validateCandidate = jest
      .fn()
      .mockImplementation(async (_candidate: string, source: string) =>
        source === 'path'
          ? {
              path: '/usr/bin/kicad-cli',
              version: '8.0.0',
              versionLabel: 'KiCad 8.0.0',
              source: 'path'
            }
          : undefined
      );
    jest.spyOn(pathUtils, 'findExecutableOnPath').mockReturnValue('/usr/bin/kicad-cli');

    const result = await detector.detect();
    expect(result?.source).toBe('path');
  });

  it('stores PATH-discovered cli results in cache', async () => {
    __setConfiguration({
      'kicadstudio.kicadCliPath': ''
    });
    const detector = new KiCadCliDetector() as any;
    detector.validateCandidate = jest
      .fn()
      .mockImplementation(async (_candidate: string, source: string) =>
        source === 'path'
          ? {
              path: '/usr/bin/kicad-cli',
              version: '8.0.0',
              versionLabel: 'KiCad 8.0.0',
              source: 'path'
            }
          : undefined
      );
    jest.spyOn(pathUtils, 'findExecutableOnPath').mockReturnValue('/usr/bin/kicad-cli');

    const detected = await detector.detect();

    expect(detected?.path).toBe('/usr/bin/kicad-cli');
    expect((detector as { detected?: { path: string } }).detected?.path).toBe(
      '/usr/bin/kicad-cli'
    );
  });

  it('returns null when not found', async () => {
    const detector = new KiCadCliDetector() as any;
    detector.validateCandidate = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(pathUtils, 'findExecutableOnPath').mockReturnValue(undefined);

    const result = await detector.detect();
    expect(result).toBeUndefined();
  });

  it('detects flatpak from settings', async () => {
    __setConfiguration({
      'kicadstudio.kicadCliPath': 'flatpak'
    });
    const detector = new KiCadCliDetector() as any;
    jest.spyOn(pathUtils, 'findExecutableOnPath').mockReturnValue('/usr/bin/flatpak');
    detector.validateFlatpak = jest.fn().mockResolvedValue({
      path: '/usr/bin/flatpak',
      args: ['run', '--command=kicad-cli', 'org.kicad.KiCad'],
      version: '10.0.1',
      versionLabel: 'KiCad 10.0.1 (Flatpak)',
      source: 'settings'
    });

    const result = await detector.detect();
    expect(result?.source).toBe('settings');
    expect(result?.args).toContain('org.kicad.KiCad');
  });

  it('auto-detects flatpak on linux', async () => {
    __setConfiguration({
      'kicadstudio.kicadCliPath': ''
    });
    const detector = new KiCadCliDetector() as any;
    // Mock platform to linux
    const originalPlatform = process.platform;
    Object.defineProperty(process, 'platform', { value: 'linux' });

    detector.validateCandidate = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(pathUtils, 'findExecutableOnPath').mockImplementation((name: string) => {
      if (name === 'flatpak') { return '/usr/bin/flatpak'; }
      return undefined;
    });
    detector.validateFlatpak = jest.fn().mockResolvedValue({
      path: '/usr/bin/flatpak',
      args: ['run', '--command=kicad-cli', 'org.kicad.KiCad'],
      version: '10.0.1',
      versionLabel: 'KiCad 10.0.1 (Flatpak)',
      source: 'flatpak'
    });

    try {
      const result = await detector.detect();
      expect(result?.source).toBe('flatpak');
      expect(result?.args).toContain('org.kicad.KiCad');
    } finally {
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    }
  });

  it('builds candidate paths by platform', () => {
    const candidates = getCliCandidates('win32', 'C:\\Custom\\kicad-cli.exe');
    expect(candidates[0]).toBe('C:\\Custom\\kicad-cli.exe');
  });

  it('includes Linux defaults when no configured path is provided', () => {
    expect(getCliCandidates('linux')).toEqual(
      expect.arrayContaining([
        '/usr/bin/kicad-cli',
        '/usr/local/bin/kicad-cli',
        '/snap/bin/kicad-cli'
      ])
    );
  });

  it('includes PROGRAMFILES(X86) and macOS app bundle candidates', () => {
    process.env['PROGRAMFILES(X86)'] = 'C:\\Program Files (x86)';
    expect(getCliCandidates('win32')).toContain(
      'C:\\Program Files (x86)\\KiCad\\9.0\\bin\\kicad-cli.exe'
    );
    expect(getCliCandidates('darwin')).toContain(
      '/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli'
    );
  });

  it('clearCache forces a fresh detect call', async () => {
    const detector = new KiCadCliDetector() as any;
    detector.validateCandidate = jest
      .fn()
      .mockResolvedValueOnce({
        path: 'C:\\KiCad\\bin\\kicad-cli.exe',
        version: '9.0.1',
        versionLabel: 'KiCad 9.0.1',
        source: 'settings'
      })
      .mockResolvedValueOnce({
        path: 'C:\\KiCad\\bin\\kicad-cli.exe',
        version: '9.0.2',
        versionLabel: 'KiCad 9.0.2',
        source: 'settings'
      });

    expect((await detector.detect())?.version).toBe('9.0.1');
    detector.clearCache();
    expect((await detector.detect())?.version).toBe('9.0.2');
  });

  it('returns the cached detect result without revalidating', async () => {
    const detector = new KiCadCliDetector() as any;
    detector.validateCandidate = jest.fn().mockResolvedValue({
      path: 'C:\\KiCad\\bin\\kicad-cli.exe',
      version: '9.0.1',
      versionLabel: 'KiCad 9.0.1',
      source: 'settings'
    });

    const first = await detector.detect();
    const second = await detector.detect();

    expect(first).toEqual(second);
    expect(detector.validateCandidate).toHaveBeenCalledTimes(1);
  });

  it('caches capability checks per command', async () => {
    const detector = new KiCadCliDetector() as any;
    detector.detect = jest.fn().mockResolvedValue({
      path: 'C:\\KiCad\\bin\\kicad-cli.exe',
      version: '9.0.1',
      versionLabel: 'KiCad 9.0.1',
      source: 'settings'
    });
    const spawnSyncMock = childProcess.spawnSync as unknown as jest.Mock;
    spawnSyncMock.mockReturnValue({
      status: 0,
      stdout: '',
      stderr: ''
    } as never);

    await expect(detector.hasCapability('bom')).resolves.toBe(true);
    await expect(detector.hasCapability('bom')).resolves.toBe(true);

    expect(spawnSyncMock).toHaveBeenCalledTimes(1);
  });

  it('reads and caches command help for option/format probes', async () => {
    const detector = new KiCadCliDetector() as any;
    detector.detect = jest.fn().mockResolvedValue({
      path: 'C:\\KiCad\\bin\\kicad-cli.exe',
      version: '10.0.1',
      versionLabel: 'KiCad 10.0.1',
      source: 'settings'
    });
    const spawnSyncMock = childProcess.spawnSync as unknown as jest.Mock;
    spawnSyncMock.mockReturnValue({
      status: 0,
      stdout: 'Usage: kicad-cli pcb import --format pads|altium|geda',
      stderr: ''
    } as never);

    await expect(
      detector.commandHelpIncludes(['pcb', 'import'], /\bgeda\b/i)
    ).resolves.toBe(true);
    await expect(detector.getCommandHelp(['pcb', 'import'])).resolves.toContain(
      '--format'
    );

    expect(spawnSyncMock).toHaveBeenCalledTimes(1);
  });

  it('validates real candidates and rejects broken binaries gracefully', async () => {
    const detector = new KiCadCliDetector() as any;
    const existsSyncMock = fs.existsSync as unknown as jest.Mock;
    const realpathNativeMock = fs.realpathSync.native as unknown as jest.Mock;
    const spawnSyncMock = childProcess.spawnSync as unknown as jest.Mock;

    existsSyncMock.mockReturnValue(true);
    realpathNativeMock.mockImplementation((value: fs.PathLike) =>
      String(value)
    );
    spawnSyncMock
      .mockReturnValueOnce({ status: 1, stdout: '', stderr: 'bad' } as never)
      .mockReturnValueOnce({
        status: 0,
        stdout: 'other-tool 1.0',
        stderr: ''
      } as never)
      .mockReturnValueOnce({
        status: 0,
        stdout: 'kicad-cli 9.0.3',
        stderr: ''
      } as never);

    await expect(
      detector.validateCandidate('C:\\broken.exe', 'settings')
    ).resolves.toBeUndefined();
    await expect(
      detector.validateCandidate('C:\\other.exe', 'settings')
    ).resolves.toBeUndefined();
    await expect(
      detector.validateCandidate('C:\\KiCad\\bin\\kicad-cli.exe', 'settings')
    ).resolves.toEqual(expect.objectContaining({ version: '9.0.3' }));
  });

  it('parses PATH lookup results and opens settings when requested', async () => {
    const detector = new KiCadCliDetector() as any;
    detector.validateCandidate = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(pathUtils, 'findExecutableOnPath').mockReturnValue(undefined);
    (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue(
      'Set Manual Path'
    );

    await detector.detect(true);

    expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
      'workbench.action.openSettings',
      'kicadstudio.kicadCliPath'
    );
  });

  it('returns false when capability checks run without a detected cli', async () => {
    const detector = new KiCadCliDetector() as any;
    detector.detect = jest.fn().mockResolvedValue(undefined);

    await expect(detector.hasCapability('bom')).resolves.toBe(false);
  });

  it('handles empty candidates, missing files, and failed PATH lookups', async () => {
    const detector = new KiCadCliDetector() as any;
    const existsSyncMock = fs.existsSync as unknown as jest.Mock;
    const spawnSyncMock = childProcess.spawnSync as unknown as jest.Mock;

    existsSyncMock.mockReturnValue(false);
    spawnSyncMock.mockReturnValue({
      status: 1,
      stdout: '',
      stderr: ''
    } as never);

    await expect(
      detector.validateCandidate('', 'settings')
    ).resolves.toBeUndefined();
    await expect(
      detector.validateCandidate('C:\\missing\\kicad-cli.exe', 'settings')
    ).resolves.toBeUndefined();
    jest.spyOn(pathUtils, 'findExecutableOnPath').mockReturnValue(undefined);
    expect(pathUtils.findExecutableOnPath('kicad-cli')).toBeUndefined();
  });

  it('falls back to normalized candidates when realpath fails and warns once for workspace overrides', () => {
    const detector = new KiCadCliDetector() as any;
    const realpathNativeMock = fs.realpathSync.native as unknown as jest.Mock;
    realpathNativeMock.mockImplementation(() => {
      throw new Error('broken symlink');
    });

    const originalGetConfiguration = vscode.workspace.getConfiguration;
    (vscode.workspace as any).getConfiguration = () => ({
      get: <T>(_key: string, fallback?: T): T => fallback as T,
      inspect: <T>() =>
        ({
          key: 'kicadstudio.kicadCliPath',
          workspaceValue: 'C:\\KiCad\\bin\\kicad-cli.exe'
        }) as {
          key: string;
          globalValue?: T;
          workspaceValue?: T;
          workspaceFolderValue?: T;
        },
      has: jest.fn(),
      update: jest.fn()
    });

    try {
      expect(detector.normalizeCandidate(' .\\kicad-cli.exe ')).toContain(
        'kicad-cli.exe'
      );
      detector.warnIfWorkspaceConfiguredPath('C:\\KiCad\\bin\\kicad-cli.exe');
      detector.warnIfWorkspaceConfiguredPath('C:\\KiCad\\bin\\kicad-cli.exe');
      expect(vscode.window.showWarningMessage).toHaveBeenCalledTimes(1);
    } finally {
      (vscode.workspace as any).getConfiguration = originalGetConfiguration;
    }
  });

  it('validates flatpak and returns expected results', async () => {
    const detector = new KiCadCliDetector() as any;
    const spawnSyncMock = childProcess.spawnSync as unknown as jest.Mock;
    spawnSyncMock.mockReturnValue({
      status: 0,
      stdout: 'kicad-cli 10.0.1',
      stderr: ''
    });

    const result = await detector.validateFlatpak('/usr/bin/flatpak', 'flatpak');
    expect(result).toEqual(expect.objectContaining({
      path: '/usr/bin/flatpak',
      args: ['run', '--command=kicad-cli', 'org.kicad.KiCad'],
      version: '10.0.1',
      source: 'flatpak'
    }));
  });
});
