import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

const action = readFileSync(new URL('../action.yml', import.meta.url), 'utf8');
function runStep(name, environment = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'npm-publication-'));
  try {
    const bin = join(directory, 'bin');
    mkdirSync(bin);
    writeFileSync(join(bin, 'npm'), `#!${process.execPath}
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.CALLS, JSON.stringify(args) + '\\n');
if (!['publish', 'dist-tag'].includes(args[0])) process.exit(99);
process.exit(Number(process.env.NPM_STATUS || 0));
`, { mode: 0o755 });
    const step = action.split(/^    - /m).find(value => value.startsWith(`name: ${name}\n`));
    assert.ok(step, name);
    const raw = step.split('      run: ')[1];
    const script = raw.startsWith('|\n')
      ? raw.slice(2).split('\n').map(line => line.slice(8)).join('\n') : raw.trim();
    const result = spawnSync('bash', ['-eo', 'pipefail', '-c', script], {
      encoding: 'utf8',
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, CALLS: join(directory, 'calls'),
        ACCESS: 'public', CHANNEL: 'edge', REGISTRY_URL: 'https://registry.example.invalid',
        TARBALL_PATH: '/fixture/package.tgz', PACKAGE_NAME: '@fixture/package',
        PACKAGE_VERSION: '1.2.3', PRERELEASE_TAG: 'edge', ...environment },
    });
    const calls = readFileSync(join(directory, 'calls'), 'utf8').trim().split('\n').map(JSON.parse);
    return { ...result, calls };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test('successful publication makes one upload without registry lookups', () => {
  const result = runStep('Publish tarball');
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.calls, [['publish', '/fixture/package.tgz', '--ignore-scripts',
    '--tag', 'edge', '--registry', 'https://registry.example.invalid', '--access', 'public']]);
});

test('publication failures retain npm status and do not retry or query the registry', () => {
  const result = runStep('Publish tarball', { NPM_STATUS: '17' });
  assert.equal(result.status, 17, result.stderr);
  assert.equal(result.calls.length, 1);
});

test('dry run stays offline and credential-free', () => {
  const result = runStep('Dry-run publication', { NODE_AUTH_TOKEN: '', ACCESS: '' });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.calls, [['publish', '/fixture/package.tgz', '--dry-run', '--offline',
    '--ignore-scripts', '--tag', 'edge', '--registry', 'https://registry.example.invalid']]);
});

test('channel update preserves npm failure status', () => {
  const result = runStep('Update prerelease channel', { NPM_STATUS: '23' });
  assert.equal(result.status, 23, result.stderr);
  assert.deepEqual(result.calls, [['dist-tag', 'add', '@fixture/package@1.2.3', 'edge',
    '--registry', 'https://registry.example.invalid']]);
});
