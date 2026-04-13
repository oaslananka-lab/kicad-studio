import * as fs from 'node:fs';
import * as path from 'node:path';

import { GitDiffDetector } from '../../src/git/gitDiffDetector';
import { SExpressionParser } from '../../src/language/sExpressionParser';

describe('GitDiffDetector', () => {
  it('classifies added, removed, and changed components', async () => {
    const detector = new GitDiffDetector(new SExpressionParser()) as any;
    const tempFile = path.join(process.cwd(), 'test', 'fixtures', 'gitdiff-temp.kicad_sch');
    detector.readGitVersion = jest.fn().mockImplementation((_root: string, _ref: string) => {
      return `(kicad_sch
        (symbol (property "Reference" "R1") (property "Value" "10k") (uuid "11111111-1111-1111-1111-111111111111"))
        (symbol (property "Reference" "R2") (property "Value" "10k") (uuid "22222222-2222-2222-2222-222222222222"))
      )`;
    });

    fs.writeFileSync(
      tempFile,
      `(kicad_sch
        (symbol (property "Reference" "R1") (property "Value" "22k") (uuid "11111111-1111-1111-1111-111111111111"))
        (symbol (property "Reference" "R3") (property "Value" "1k") (uuid "33333333-3333-3333-3333-333333333333"))
      )`,
      'utf8'
    );

    const diffs = await detector.getChangedComponents(tempFile);
    expect(diffs.some((item: any) => item.type === 'changed' && item.reference === 'R1')).toBe(true);
    expect(diffs.some((item: any) => item.type === 'removed' && item.reference === 'R2')).toBe(true);
    expect(diffs.some((item: any) => item.type === 'added' && item.reference === 'R3')).toBe(true);
    fs.rmSync(tempFile, { force: true });
  });
});
