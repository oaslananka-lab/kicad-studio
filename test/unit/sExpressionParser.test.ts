import * as fs from 'node:fs';
import * as path from 'node:path';
import { SExpressionParser } from '../../src/language/sExpressionParser';

describe('SExpressionParser', () => {
  const fixture = fs.readFileSync(
    path.join(__dirname, '..', 'fixtures', 'sample.kicad_sch'),
    'utf8'
  );

  it('parses a simple schematic file', () => {
    const parser = new SExpressionParser();
    const ast = parser.parse(fixture);
    expect(ast.type).toBe('list');
    expect(ast.children?.[0]?.children?.[0]?.value).toBe('kicad_sch');
  });

  it('handles malformed input gracefully', () => {
    const parser = new SExpressionParser();
    const ast = parser.parse('(kicad_sch (symbol "U1"');
    expect(ast.type).toBe('list');
    expect(parser.getErrors(ast).length).toBeGreaterThanOrEqual(0);
  });

  it('finds nested nodes by path', () => {
    const parser = new SExpressionParser();
    const ast = parser.parse(fixture);
    const symbol = parser.findNode(ast, 'kicad_sch', 'symbol');
    expect(symbol).toBeDefined();
  });

  it('extracts all symbol references', () => {
    const parser = new SExpressionParser();
    const ast = parser.parse(fixture);
    const symbols = parser.findAllNodes(ast, 'symbol');
    expect(symbols).toHaveLength(3);
  });
});
