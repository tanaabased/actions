import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

const action = readFileSync(new URL('../action.yml', import.meta.url), 'utf8');
const steps = action.split(/^    - /m);
const updateDefault = action.match(/  update-prerelease-tag-on-stable:\n(?:    .*\n)*?    default: '(true|false)'/)[1];

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
    const step = steps.find(value => value.startsWith(`name: ${name}\n`));
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
    const calls = existsSync(join(directory, 'calls'))
      ? readFileSync(join(directory, 'calls'), 'utf8').trim().split('\n').map(JSON.parse) : [];
    return { ...result, calls };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

// Exercise the checked-in publication conditions and shell steps with a fake npm.
// This covers command selection and ordering, not live registry authentication.
function runPublication({ releaseType = 'stable', update = updateDefault, dryRun = 'false', token = 'fixture-token' } = {}) {
  const values = {
    'inputs.dry-run': dryRun,
    'inputs.update-prerelease-tag-on-stable': update,
    'steps.package.outputs.release-type': releaseType,
  };
  const calls = [];
  for (const step of steps) {
    const name = step.split('\n')[0].replace('name: ', '');
    if (!['Validate channel update authentication', 'Dry-run publication', 'Publish tarball', 'Update prerelease channel'].includes(name)) continue;
    const expression = step.match(/      if: \$\{\{ (.*) \}\}/)[1];
    const selected = expression.split(' && ').every(term => {
      const match = term.match(/^([\w.-]+) (==|!=) '([^']*)'$/);
      assert.ok(match, `unsupported condition: ${term}`);
      const [, key, operator, expected] = match;
      assert.ok(Object.hasOwn(values, key), key);
      return operator === '==' ? values[key] === expected : values[key] !== expected;
    });
    if (!selected) continue;
    const result = runStep(name, {
      CHANNEL: releaseType === 'stable' ? 'latest' : 'edge',
      PACKAGE_VERSION: releaseType === 'stable' ? '1.2.3' : '1.2.3-next.1',
      CHANNEL_TOKEN: token,
      NODE_AUTH_TOKEN: token,
    });
    calls.push(...result.calls);
    if (result.status !== 0) return { ...result, calls };
  }
  return { status: 0, calls };
}

test('stable publication updates latest and then edge by default', () => {
  const result = runPublication();
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.calls, [
    ['publish', '/fixture/package.tgz', '--ignore-scripts', '--tag', 'latest',
      '--registry', 'https://registry.example.invalid', '--access', 'public'],
    ['dist-tag', 'add', '@fixture/package@1.2.3', 'edge', '--registry', 'https://registry.example.invalid'],
  ]);
});

test('stable publication can explicitly leave edge unchanged without a channel token', () => {
  const result = runPublication({ update: 'false', token: '' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.calls.length, 1);
  assert.equal(result.calls[0][0], 'publish');
  assert.equal(result.calls[0][4], 'latest');
});

test('prerelease publication only updates edge and needs no channel token', () => {
  const result = runPublication({ releaseType: 'prerelease', token: '' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.calls.length, 1);
  assert.equal(result.calls[0][0], 'publish');
  assert.equal(result.calls[0][4], 'edge');
});

test('default stable dry run requires no token and never updates channels', () => {
  const result = runPublication({ dryRun: 'true', token: '' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.calls.length, 1);
  assert.equal(result.calls[0][0], 'publish');
  assert.ok(result.calls[0].includes('--dry-run'));
  assert.ok(result.calls[0].includes('--offline'));
});

test('missing channel credentials fail before any stable publication', () => {
  const result = runPublication({ token: '' });
  assert.equal(result.status, 1);
  assert.deepEqual(result.calls, []);
  assert.match(result.stdout, /requires channel-token or registry-token/);
});

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
