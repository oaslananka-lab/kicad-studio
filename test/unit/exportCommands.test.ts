import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { buildCliExportCommands } from '../../src/cli/exportCommands';
import { zipDirectory } from '../../src/utils/zipUtils';
import { __setConfiguration } from './vscodeMock';

describe('buildCliExportCommands', () => {
  beforeEach(() => {
    __setConfiguration({
      'kicadstudio.gerber.precision': 6,
      'kicadstudio.ipc2581.version': 'C',
      'kicadstudio.ipc2581.units': 'mm',
      'kicadstudio.viewer.theme': 'kicad',
      'kicadstudio.bom.fields': ['Reference', 'Value', 'Footprint']
    });
  });

  it('builds KiCad 9+ 3D and CAM export commands', () => {
    const pcb = 'C:\\project\\board.kicad_pcb';
    expect(buildCliExportCommands('export-brep', pcb, 'fab')[0]).toContain('brep');
    expect(buildCliExportCommands('export-ply', pcb, 'fab')[0]).toContain('ply');
    expect(buildCliExportCommands('export-gencad', pcb, 'fab')[0]).toContain('gencad');
    expect(buildCliExportCommands('export-ipcd356', pcb, 'fab')[0]).toContain('ipcd356');
  });

  it('builds pick-and-place export as CSV in millimeters', () => {
    const command = buildCliExportCommands('export-pos', '/project/board.kicad_pcb', '/project/fab')[0];
    expect(command).toEqual(
      expect.arrayContaining(['pos', '--format', 'csv', '--units', 'mm', '--side', 'both'])
    );
  });

  it('builds symbol and footprint SVG export commands', () => {
    expect(buildCliExportCommands('export-fp-svg', '/project/R_0603.kicad_mod', '/project/fab')[0]).toEqual(
      ['fp', 'export', 'svg', '--output', '/project/fab', '/project/R_0603.kicad_mod']
    );
    expect(buildCliExportCommands('export-sym-svg', '/project/lib.kicad_sym', '/project/fab')[0]).toEqual(
      ['sym', 'export', 'svg', '--output', '/project/fab', '--theme', 'kicad', '/project/lib.kicad_sym']
    );
  });
});

describe('zipDirectory', () => {
  it('creates a readable zip archive', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kicadstudio-zip-'));
    const sourceDir = path.join(root, 'source');
    const outputFile = path.join(root, 'package.zip');
    fs.mkdirSync(path.join(sourceDir, 'nested'), { recursive: true });
    fs.writeFileSync(path.join(sourceDir, 'manifest.json'), '{"ok":true}', 'utf8');
    fs.writeFileSync(path.join(sourceDir, 'nested', 'board.gbr'), 'G04 test*', 'utf8');

    await zipDirectory(sourceDir, outputFile);

    const archive = fs.readFileSync(outputFile);
    expect(archive.subarray(0, 4).toString('hex')).toBe('504b0304');
    expect(archive.toString('utf8')).toContain('manifest.json');
    expect(archive.toString('utf8')).toContain('nested/board.gbr');
  });
});
