import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  downloadAndUnzipVSCode,
  resolveCliPathFromVSCodeExecutablePath,
  runTests
} from '@vscode/test-electron';

async function main(): Promise<void> {
  const extensionDevelopmentPath = path.resolve(__dirname, '..', '..');
  const extensionTestsPath = path.resolve(__dirname, 'suite', 'index');
  const workspacePath = path.resolve(__dirname, '..', '..', 'test', 'fixtures');
  const vscodeExecutablePath = await downloadAndUnzipVSCode('1.115.0');

  await runTests({
    vscodeExecutablePath: resolveCliPathFromVSCodeExecutablePath(vscodeExecutablePath),
    extensionDevelopmentPath,
    extensionTestsPath,
    launchArgs: ['--disable-extensions', '--folder-uri', pathToFileURL(workspacePath).toString()]
  });
}

void main().catch((error) => {
  console.error('Failed to run extension tests');
  console.error(error);
  process.exit(1);
});
