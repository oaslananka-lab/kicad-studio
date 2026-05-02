import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import * as vscode from 'vscode';
import { CLI_CAPABILITY_COMMANDS, SETTINGS } from '../constants';
import type { DetectedKiCadCli } from '../types';

interface CliCandidate {
  command: string;
  args: string[];
  source: DetectedKiCadCli['source'];
  requiresExistingPath: boolean;
}

interface ConfiguredCliCommand {
  command: string;
  args: string[];
}

const FLATPAK_KICAD_CLI_ARGS = [
  'run',
  '--command=kicad-cli',
  'org.kicad.KiCad'
];

export function getCliCandidates(
  platform = process.platform,
  configuredPath = ''
): string[] {
  return getCliCandidateSpecs(platform, configuredPath).map(
    (candidate) => candidate.command
  );
}

function getCliCandidateSpecs(
  platform = process.platform,
  configuredPath = '',
  configuredCommand?: ConfiguredCliCommand | undefined
): CliCandidate[] {
  const candidates: CliCandidate[] = [];
  if (configuredPath) {
    candidates.push(pathCandidate(configuredPath, 'settings'));
  }
  if (configuredCommand) {
    candidates.push({
      command: configuredCommand.command,
      args: configuredCommand.args,
      source: 'settings-command',
      requiresExistingPath: false
    });
  }

  if (platform === 'win32') {
    const programFiles = process.env['PROGRAMFILES'] ?? 'C:\\Program Files';
    const programFilesX86 =
      process.env['PROGRAMFILES(X86)'] ?? 'C:\\Program Files (x86)';
    const localAppData = process.env['LOCALAPPDATA'] ?? '';
    for (const version of [
      '10.0',
      '10',
      '9.0',
      '9',
      '8.0',
      '8',
      '7.0',
      '7',
      '6.0',
      '6'
    ]) {
      candidates.push(
        pathCandidate(
          path.win32.join(
            programFiles,
            'KiCad',
            version,
            'bin',
            'kicad-cli.exe'
          ),
          'common-path'
        )
      );
      candidates.push(
        pathCandidate(
          path.win32.join(
            programFilesX86,
            'KiCad',
            version,
            'bin',
            'kicad-cli.exe'
          ),
          'common-path'
        )
      );
      if (localAppData) {
        candidates.push(
          pathCandidate(
            path.win32.join(
              localAppData,
              'Programs',
              'KiCad',
              version,
              'bin',
              'kicad-cli.exe'
            ),
            'common-path'
          )
        );
      }
    }
  } else if (platform === 'darwin') {
    candidates.push(
      pathCandidate(
        '/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli',
        'common-path'
      ),
      pathCandidate('/usr/local/bin/kicad-cli', 'common-path'),
      pathCandidate('/opt/homebrew/bin/kicad-cli', 'common-path')
    );
  } else {
    candidates.push(
      pathCandidate('/usr/bin/kicad-cli', 'common-path'),
      pathCandidate('/usr/local/bin/kicad-cli', 'common-path'),
      pathCandidate('/snap/bin/kicad-cli', 'common-path'),
      pathCandidate(
        path.join(os.homedir(), '.local', 'bin', 'kicad-cli'),
        'common-path'
      ),
      pathCandidate(
        path.join(
          os.homedir(),
          '.var',
          'app',
          'org.kicad.KiCad',
          'data',
          'bin',
          'kicad-cli'
        ),
        'common-path'
      ),
      {
        command: 'flatpak',
        args: FLATPAK_KICAD_CLI_ARGS,
        source: 'flatpak',
        requiresExistingPath: false
      }
    );
  }

  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = [candidate.command, ...candidate.args].join('\0');
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function pathCandidate(
  command: string,
  source: DetectedKiCadCli['source']
): CliCandidate {
  return {
    command,
    args: [],
    source,
    requiresExistingPath: true
  };
}

function validateCommandText(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`KiCad CLI ${label} cannot be empty.`);
  }
  if (/[\0\r\n]/.test(trimmed)) {
    throw new Error(
      `KiCad CLI ${label} cannot contain control-line characters.`
    );
  }
  return trimmed;
}

function readConfiguredCommand(): ConfiguredCliCommand | undefined {
  const raw = vscode.workspace
    .getConfiguration()
    .get<unknown>(SETTINGS.cliCommand);

  if (!raw || typeof raw !== 'object') {
    return undefined;
  }

  const record = raw as Record<string, unknown>;
  if (typeof record['command'] !== 'string') {
    return undefined;
  }

  const argsRaw = Array.isArray(record['args']) ? record['args'] : [];
  const args = argsRaw.map((arg) => {
    if (typeof arg !== 'string') {
      throw new Error('KiCad CLI configured command args must be strings.');
    }
    return validateCommandText(arg, 'configured command argument');
  });

  return {
    command: validateCommandText(record['command'], 'configured command'),
    args
  };
}

export class KiCadCliDetector {
  private detected: DetectedKiCadCli | undefined;
  private readonly capabilityCache = new Map<string, boolean>();
  private readonly helpCache = new Map<string, string | undefined>();
  private warnedWorkspaceConfiguredPath = false;

  async detect(notifyOnMissing = false): Promise<DetectedKiCadCli | undefined> {
    if (this.detected) {
      return this.detected;
    }

    const configuredPath = vscode.workspace
      .getConfiguration()
      .get<string>(SETTINGS.cliPath, '')
      .trim();
    this.warnIfWorkspaceConfiguredPath(configuredPath);

    let configuredCommand: ConfiguredCliCommand | undefined;
    try {
      configuredCommand = readConfiguredCommand();
    } catch (error) {
      void vscode.window.showWarningMessage(
        error instanceof Error
          ? error.message
          : 'KiCad CLI configured command is invalid.'
      );
    }

    const candidates = getCliCandidateSpecs(
      process.platform,
      configuredPath,
      configuredCommand
    );
    for (const candidate of candidates) {
      const resolved = await this.validateCandidate(candidate);
      if (resolved) {
        this.detected = resolved;
        return resolved;
      }
    }

    const fromPath = this.findOnPath();
    if (fromPath) {
      const resolved = await this.validateCandidate(fromPath, 'path');
      if (resolved) {
        this.detected = resolved;
        return resolved;
      }
    }

    if (notifyOnMissing) {
      const selected = await vscode.window.showErrorMessage(
        'KiCad CLI (kicad-cli) was not found.',
        'Download KiCad',
        'Set Manual Path',
        'Help'
      );
      if (selected === 'Download KiCad') {
        await vscode.env.openExternal(
          vscode.Uri.parse('https://www.kicad.org/download/')
        );
      } else if (selected === 'Set Manual Path') {
        await vscode.commands.executeCommand(
          'workbench.action.openSettings',
          SETTINGS.cliPath
        );
      } else if (selected === 'Help') {
        await vscode.env.openExternal(
          vscode.Uri.parse(
            'https://github.com/oaslananka/kicad-studio/blob/main/docs/installation.md'
          )
        );
      }
    }

    return undefined;
  }

  clearCache(): void {
    this.detected = undefined;
    this.capabilityCache.clear();
    this.helpCache.clear();
  }

  getVersion(): number | undefined {
    if (!this.detected) {
      return undefined;
    }
    return (
      Number.parseInt(this.detected.version.split('.')[0] ?? '', 10) ||
      undefined
    );
  }

  async hasCapability(
    command: keyof typeof CLI_CAPABILITY_COMMANDS
  ): Promise<boolean> {
    const detected = await this.detect();
    if (!detected) {
      return false;
    }

    if (this.capabilityCache.has(command)) {
      return this.capabilityCache.get(command) ?? false;
    }

    const args = [
      ...(detected.args ?? []),
      ...CLI_CAPABILITY_COMMANDS[command],
      '--help'
    ];
    const result = spawnSync(detected.path, args, { encoding: 'utf8' });
    const supported =
      result.status === 0 ||
      /Usage:/i.test(`${result.stdout}\n${result.stderr}`);
    this.capabilityCache.set(command, supported);
    return supported;
  }

  async commandHelpIncludes(
    command: readonly string[],
    pattern: RegExp
  ): Promise<boolean> {
    const help = await this.getCommandHelp(command);
    return Boolean(help && pattern.test(help));
  }

  async getCommandHelp(
    command: readonly string[]
  ): Promise<string | undefined> {
    const detected = await this.detect();
    if (!detected) {
      return undefined;
    }

    const key = [...(detected.args ?? []), ...command].join('\0');
    if (this.helpCache.has(key)) {
      return this.helpCache.get(key);
    }

    const result = spawnSync(
      detected.path,
      [...(detected.args ?? []), ...command, '--help'],
      {
        encoding: 'utf8'
      }
    );
    const help = `${result.stdout}\n${result.stderr}`;
    const supported = result.status === 0 || /Usage:/i.test(help);
    const normalized = supported ? help : undefined;
    this.helpCache.set(key, normalized);
    return normalized;
  }

  private async validateCandidate(
    candidate: string | CliCandidate,
    source?: DetectedKiCadCli['source']
  ): Promise<DetectedKiCadCli | undefined> {
    const spec =
      typeof candidate === 'string'
        ? pathCandidate(candidate, source ?? 'common-path')
        : candidate;
    if (!spec.command) {
      return undefined;
    }

    const resolvedCandidate = spec.requiresExistingPath
      ? this.normalizeCandidate(spec.command)
      : spec.command.trim();
    if (spec.requiresExistingPath && !fs.existsSync(resolvedCandidate)) {
      return undefined;
    }

    const result = spawnSync(resolvedCandidate, [...spec.args, '--version'], {
      encoding: 'utf8'
    });
    if (result.status !== 0) {
      return undefined;
    }

    const output = `${result.stdout}\n${result.stderr}`.trim();
    if (!this.looksLikeKiCadCli(output, resolvedCandidate, spec.args)) {
      return undefined;
    }

    const versionMatch = output.match(/(\d+\.\d+(?:\.\d+)?)/);
    const version = versionMatch?.[1] ?? 'unknown';
    return {
      path: resolvedCandidate,
      ...(spec.args.length ? { args: spec.args } : {}),
      version,
      versionLabel: `KiCad ${version}`,
      source: spec.source
    };
  }

  private findOnPath(): string | undefined {
    const finder = process.platform === 'win32' ? 'where' : 'which';
    const result = spawnSync(finder, ['kicad-cli'], { encoding: 'utf8' });
    if (result.status !== 0) {
      return undefined;
    }
    return result.stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean);
  }

  private normalizeCandidate(candidate: string): string {
    const normalized = path.resolve(candidate.trim());
    try {
      return fs.realpathSync.native(normalized);
    } catch {
      return normalized;
    }
  }

  private looksLikeKiCadCli(
    versionOutput: string,
    candidate: string,
    args: readonly string[] = []
  ): boolean {
    return (
      /\bkicad(?:-cli)?\b/i.test(versionOutput) ||
      /kicad-cli(?:\.exe)?$/i.test(path.basename(candidate)) ||
      args.some((arg) => /^--command=kicad-cli(?:\.exe)?$/i.test(arg))
    );
  }

  private warnIfWorkspaceConfiguredPath(configuredPath: string): void {
    if (!configuredPath || this.warnedWorkspaceConfiguredPath) {
      return;
    }

    const inspect = vscode.workspace
      .getConfiguration()
      .inspect<string>(SETTINGS.cliPath);
    if (!inspect?.workspaceValue && !inspect?.workspaceFolderValue) {
      return;
    }

    this.warnedWorkspaceConfiguredPath = true;
    void vscode.window.showWarningMessage(
      'KiCad Studio is using a workspace-level kicad-cli path override. Only use workspace overrides for repositories you trust.'
    );
  }
}
