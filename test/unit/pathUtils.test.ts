import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import {
  getWorkspaceRoot,
  isKiCadFile,
  normalizeUserPath,
  pathExistsOnAnyPlatform,
  relativeToWorkspace,
  toPosixPath
} from '../../src/utils/pathUtils';

describe('pathUtils', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kicad-path-utils-'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('detects KiCad files from strings and Uris', () => {
    expect(isKiCadFile('board.kicad_pcb')).toBe(true);
    expect(isKiCadFile(vscode.Uri.file('/tmp/schematic.kicad_sch'))).toBe(true);
    expect(isKiCadFile('notes.txt')).toBe(false);
  });

  it('returns the workspace root for an explicit uri or the first folder', () => {
    const explicit = getWorkspaceRoot(vscode.Uri.file('/workspace/demo/board.kicad_pcb'));
    const implicit = getWorkspaceRoot();

    expect(explicit).toBe(process.cwd());
    expect(implicit).toBe(process.cwd());
  });

  it('normalizes workspace-relative and posix paths', () => {
    const sample = ['folder', 'child', 'file.kicad_pcb'].join(path.sep);

    expect(toPosixPath(sample)).toBe('folder/child/file.kicad_pcb');
    expect(relativeToWorkspace(path.join(process.cwd(), 'folder', 'board.kicad_pcb'), process.cwd())).toBe(
      'folder/board.kicad_pcb'
    );
    expect(relativeToWorkspace('/tmp/board.kicad_pcb', '')).toBe('/tmp/board.kicad_pcb');
  });

  it('checks path existence for present and missing files', () => {
    const existing = path.join(tempDir, 'exists.txt');
    fs.writeFileSync(existing, 'ok', 'utf8');

    expect(pathExistsOnAnyPlatform(existing)).toBe(true);
    expect(pathExistsOnAnyPlatform(path.join(tempDir, 'missing.txt'))).toBe(false);
  });

  it('expands home-relative user paths', () => {
    const expanded = normalizeUserPath('~/kicad/config');
    const normalized = normalizeUserPath('folder/../board.kicad_pcb');

    expect(expanded).toContain('kicad');
    expect(normalized.endsWith(`board.kicad_pcb`)).toBe(true);
  });
});
