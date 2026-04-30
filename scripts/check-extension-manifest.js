const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const packagePath = path.join(root, 'package.json');
const vscodeIgnorePath = path.join(root, '.vscodeignore');
const manifest = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const vscodeIgnore = fs.existsSync(vscodeIgnorePath)
  ? fs.readFileSync(vscodeIgnorePath, 'utf8')
  : '';

const expected = {
  name: 'kicadstudio',
  publisher: 'oaslananka',
  main: './dist/extension.js',
  repository: 'https://github.com/oaslananka/kicad-studio',
  marketplaceItem: 'oaslananka.kicadstudio'
};

const failures = [];

expectEqual('name', manifest.name, expected.name);
expectEqual('publisher', manifest.publisher, expected.publisher);
expectEqual('main', manifest.main, expected.main);
expectEqual('repository.url', manifest.repository?.url, expected.repository);
expectEqual('bugs.url', manifest.bugs?.url, expected.repository);
expectEqual('homepage', manifest.homepage, expected.repository);
expectEqual('engines.node', manifest.engines?.node, '24.x');
expectEqual('engines.vscode', manifest.engines?.vscode, '^1.99.0');
expectEqual(
  'capabilities.untrustedWorkspaces.supported',
  manifest.capabilities?.untrustedWorkspaces?.supported,
  'limited'
);

if (!manifest.packageManager?.startsWith('npm@11.')) {
  failures.push('packageManager must pin npm 11.x.');
}

if (
  !Array.isArray(manifest.activationEvents) ||
  manifest.activationEvents.length === 0
) {
  failures.push('activationEvents must be explicitly declared.');
} else {
  for (const event of manifest.activationEvents) {
    if (event === '*' || event === 'onStartupFinished') {
      failures.push(
        `activationEvents must not include broad startup event "${event}".`
      );
    }
  }
}

const commandIds = new Set();
for (const command of manifest.contributes?.commands ?? []) {
  if (!command.command) {
    failures.push('All contributed commands must define a command id.');
    continue;
  }
  if (commandIds.has(command.command)) {
    failures.push(`Duplicate contributed command: ${command.command}`);
  }
  commandIds.add(command.command);
}

for (const menuItems of Object.values(manifest.contributes?.menus ?? {})) {
  for (const item of menuItems) {
    if (item.command && !commandIds.has(item.command)) {
      failures.push(`Menu references unknown command: ${item.command}`);
    }
  }
}

for (const [settingName, setting] of Object.entries(
  manifest.contributes?.configuration?.properties ?? {}
)) {
  const defaultValue = setting?.default;
  if (typeof defaultValue === 'string' && looksLikeSecret(defaultValue)) {
    failures.push(
      `Configuration ${settingName} has a secret-like default value.`
    );
  }
}

for (const requiredIgnore of [
  '.github/**',
  '.doppler/**',
  'reports/**',
  'src/**',
  'test/**',
  'scripts/**',
  'node_modules/**',
  'coverage/**',
  'renovate.json',
  '*.vsix'
]) {
  if (!vscodeIgnore.includes(requiredIgnore)) {
    failures.push(`.vscodeignore must exclude ${requiredIgnore}.`);
  }
}

if (failures.length > 0) {
  console.error('Extension manifest validation failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(
  `Extension manifest is valid for ${expected.publisher}.${expected.name} (${expected.marketplaceItem}).`
);

function expectEqual(name, actual, expectedValue) {
  if (actual !== expectedValue) {
    failures.push(
      `${name} must be ${JSON.stringify(expectedValue)}, got ${JSON.stringify(actual)}.`
    );
  }
}

function looksLikeSecret(value) {
  return /(api[_-]?key|token|password|secret|pat)[=:][^<\s]+/i.test(value);
}
