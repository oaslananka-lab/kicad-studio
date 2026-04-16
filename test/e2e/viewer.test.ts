import { expect, test } from '@playwright/test';
import { launchVsCodeWithFixtures } from './vscodeHarness';

test.describe('KiCad Studio VS Code E2E', () => {
  test('activates the extension and renders KiCad workspace affordances', async () => {
    const session = await launchVsCodeWithFixtures();

    try {
      await expect(session.page.locator('body')).toContainText('sample.kicad_sch');
      await expect(session.page.locator('body')).toContainText('sample.kicad_pcb');
      await expect(session.page.locator('body')).toContainText('KiCad: New Variant');
      await expect(session.page.locator('body')).toContainText('KiCad: Add DRC Rule with MCP');

      const statusBar = session.page.locator('.statusbar');
      await expect(statusBar).toContainText(/MCP (Setup|Available|Connected)/);
      await expect(statusBar).toContainText(
        /KiCad(?:: Not found| [0-9].*\| DRC: .* \| ERC: .* \| AI: .*)/
      );
    } finally {
      await session.close();
    }
  });
});
