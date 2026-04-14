import * as fs from 'node:fs';
import * as path from 'node:path';

describe('diff viewer assets', () => {
  const root = process.cwd();

  it('creates KiCanvas elements after the bundle has registered custom elements', () => {
    const html = fs.readFileSync(path.join(root, 'media', 'viewer', 'diff.html'), 'utf8');
    const script = fs.readFileSync(path.join(root, 'media', 'viewer', 'diff.js'), 'utf8');

    expect(html).not.toContain('<kicanvas-embed');
    expect(script).toContain("document.createElement('kicanvas-embed')");
    expect(script).toContain("document.createElement('kicanvas-source')");
    expect(script).not.toContain("setAttribute('src'");
  });

  it('allows KiCanvas blob/worker resources in the diff webview CSP', () => {
    const html = fs.readFileSync(path.join(root, 'media', 'viewer', 'diff.html'), 'utf8');

    expect(html).toContain('worker-src {{cspSource}} blob:;');
    expect(html).toContain('connect-src {{cspSource}} blob: data:;');
    expect(html).toContain('img-src {{cspSource}} data: blob:;');
  });
});
