import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tarball = process.argv[2];
assert(tarball && process.argv.length === 3, 'Usage: node scripts/check-package-task.mjs <tarball>');
const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const actions = readdirSync(root).filter((name) => existsSync(join(root, name, 'action.yml'))).sort();
assert(actions.length > 0, 'The catalog must contain actions');

function files(directory, prefix = '') {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const name = prefix ? `${prefix}/${entry.name}` : entry.name;
    return entry.isDirectory() ? files(join(directory, entry.name), name) : [name];
  });
}

// Derive the contract from public action scopes, independently of package.json#files.
const expected = [
  'package.json',
  'README.md',
  'CHANGELOG.md',
  'LICENSE',
  'scripts/resolve-debug.sh',
];
for (const action of actions) {
  expected.push(`${action}/action.yml`, `${action}/README.md`);
  for (const directory of ['scripts', 'examples']) {
    const path = join(root, action, directory);
    if (existsSync(path)) expected.push(...files(path, `${action}/${directory}`));
  }
  expected.push(...readdirSync(join(root, action))
    .filter((name) => /^(LICENSE|NOTICE)/.test(name))
    .map((name) => `${action}/${name}`));
}

const consumer = mkdtempSync(join(tmpdir(), 'actions-package-'));
try {
  execFileSync('npm', ['install', '--prefix', consumer, '--cache', join(consumer, '.cache'),
    '--offline', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', resolve(tarball)],
  { stdio: 'inherit' });
  const installed = join(consumer, 'node_modules', '@tanaab', 'actions');
  assert.deepEqual(files(installed).sort(), expected.sort(), 'Packed catalog has missing or unexpected files');
  const packedManifest = JSON.parse(readFileSync(join(installed, 'package.json'), 'utf8'));
  assert.equal(packedManifest.name, '@tanaab/actions');
  assert.equal(packedManifest.version, manifest.version);
  assert.equal(packedManifest.license, 'MIT');
  for (const name of expected) {
    assert.deepEqual(readFileSync(join(installed, name)), readFileSync(join(root, name)),
      `Installed content differs: ${name}`);
    if (statSync(join(root, name)).mode & 0o111) {
      assert(statSync(join(installed, name)).mode & 0o111, `Executable permission lost: ${name}`);
    }
  }
  console.log(`Verified @tanaab/actions@${manifest.version}: ${actions.length} actions, ${expected.length} files`);
} finally {
  rmSync(consumer, { recursive: true, force: true });
}
