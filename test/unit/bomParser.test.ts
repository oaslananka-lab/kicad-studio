import * as fs from 'node:fs';
import * as path from 'node:path';
import { __setConfiguration } from './vscodeMock';
import { BomParser } from '../../src/bom/bomParser';
import { SExpressionParser } from '../../src/language/sExpressionParser';

describe('BomParser', () => {
  const fixture = fs.readFileSync(
    path.join(__dirname, '..', 'fixtures', 'sample.kicad_sch'),
    'utf8'
  );

  beforeEach(() => {
    __setConfiguration({});
  });

  it('extracts all components from schematic', () => {
    const parser = new BomParser(new SExpressionParser());
    const entries = parser.parse(fixture, false);
    expect(entries).toHaveLength(3);
  });

  it('groups identical components', () => {
    const parser = new BomParser(new SExpressionParser());
    const entries = parser.parse(fixture, true);
    expect(entries.find((entry) => entry.value === '10k')?.quantity).toBe(2);
  });

  it('handles DNP components', () => {
    const parser = new BomParser(new SExpressionParser());
    const entries = parser.parse(fixture, false);
    expect(entries.find((entry) => entry.references.includes('C1'))?.dnp).toBe(true);
  });
});
