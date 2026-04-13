import { __setConfiguration } from './vscodeMock';
import { getCliCandidates, KiCadCliDetector } from '../../src/cli/kicadCliDetector';

describe('KiCadCliDetector', () => {
  beforeEach(() => {
    __setConfiguration({
      'kicadstudio.kicadCliPath': 'C:\\KiCad\\bin\\kicad-cli.exe'
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
    const detector = new KiCadCliDetector() as any;
    detector.validateCandidate = jest.fn().mockResolvedValue(undefined);
    detector.findOnPath = jest.fn().mockReturnValue('/usr/bin/kicad-cli');
    detector.validateCandidate.mockResolvedValueOnce(undefined).mockResolvedValueOnce({
      path: '/usr/bin/kicad-cli',
      version: '8.0.0',
      versionLabel: 'KiCad 8.0.0',
      source: 'path'
    });

    const result = await detector.detect();
    expect(result?.source).toBe('path');
  });

  it('returns null when not found', async () => {
    const detector = new KiCadCliDetector() as any;
    detector.validateCandidate = jest.fn().mockResolvedValue(undefined);
    detector.findOnPath = jest.fn().mockReturnValue(undefined);

    const result = await detector.detect();
    expect(result).toBeUndefined();
  });

  it('builds candidate paths by platform', () => {
    const candidates = getCliCandidates('win32', 'C:\\Custom\\kicad-cli.exe');
    expect(candidates[0]).toBe('C:\\Custom\\kicad-cli.exe');
  });
});
