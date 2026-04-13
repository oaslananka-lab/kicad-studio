import * as assert from 'node:assert';
import * as vscode from 'vscode';

suite('Extension Integration', () => {
  test('activates when .kicad_pro workspace opened', async () => {
    const extension = vscode.extensions.getExtension('oaslananka.kicadstudio');
    assert.ok(extension);
    await extension?.activate();
    assert.strictEqual(extension?.isActive, true);
  });

  test('registers all commands', async () => {
    const commands = await vscode.commands.getCommands(true);
    for (const command of [
      'kicadstudio.openSchematic',
      'kicadstudio.openPCB',
      'kicadstudio.detectCli',
      'kicadstudio.exportGerbers',
      'kicadstudio.runDRC',
      'kicadstudio.searchComponent',
      'kicadstudio.showDiff'
    ]) {
      assert.ok(commands.includes(command), `Missing command ${command}`);
    }
  });

  test('registers all custom editors', async () => {
    const extension = vscode.extensions.getExtension('oaslananka.kicadstudio');
    const customEditors = extension?.packageJSON?.contributes?.customEditors ?? [];
    assert.ok(customEditors.some((item: any) => item.viewType === 'kicadstudio.schematicViewer'));
    assert.ok(customEditors.some((item: any) => item.viewType === 'kicadstudio.pcbViewer'));
  });

  test('creates status bar command entry', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('kicadstudio.showStatusMenu'));
  });
});
