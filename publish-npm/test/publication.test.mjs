import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

const action = readFileSync(new URL('../action.yml', import.meta.url), 'utf8');
const steps = action.split(/^    - /m);

function runStep(name, environment = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'npm-publication-'));
  try {
    const bin = join(directory, 'bin');
    mkdirSync(bin);
    writeFileSync(join(bin, 'npm'), `#!${process.execPath}
const fs = require('node:fs');
const args = process.argv.slice(2);
if (args[0] === 'pack') {
  process.stdout.write(JSON.stringify([{ name: '@fixture/package', version: process.env.PACKED_VERSION || '1.2.3' }]));
} else {
  fs.appendFileSync(process.env.CALLS, JSON.stringify(args) + '\\n');
  process.exitCode = ['publish', 'dist-tag'].includes(args[0])
    ? Number(process.env.NPM_STATUS || 0) : 99;
}
`, { mode: 0o755 });
    writeFileSync(join(bin, 'gh'), `#!${process.execPath}
process.stdout.write(process.env.GH_RESPONSE || '{}');
process.exitCode = Number(process.env.GH_STATUS || 0);
`, { mode: 0o755 });
    writeFileSync(join(directory, 'package.tgz'), 'fixture');
    const step = steps.find(value => value.startsWith(`name: ${name}\n`) ||
      value.includes(`\n      name: ${name}\n`));
    assert.ok(step, name);
    const raw = step.split('      run: ')[1];
    const script = raw.startsWith('|\n')
      ? raw.slice(2).split('\n').map(line => line.slice(8)).join('\n') : raw.trim();
    const result = spawnSync('bash', ['-eo', 'pipefail', '-c', script], {
      encoding: 'utf8',
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, CALLS: join(directory, 'calls'),
        ACCESS: 'public', CHANNEL: 'edge', REGISTRY_URL: 'https://registry.example.invalid',
        TARBALL_PATH: '/fixture/package.tgz', PACKAGE_NAME: '@fixture/package',
        PACKAGE_VERSION: '1.2.3', EDGE_TAG: '', LATEST_TAG: '',
        LEGACY_PRERELEASE_TAG: '', LEGACY_STABLE_TAG: '',
        LEGACY_SYNC_EDGE_TAG: '', SYNC_EDGE_TAG: '',
        TARBALL: join(directory, 'package.tgz'), GITHUB_OUTPUT: join(directory, 'output'),
        GITHUB_EVENT_NAME: 'push', GITHUB_SERVER_URL: 'https://github.com',
        RELEASE_NODE_ID: '', ...environment },
    });
    const calls = existsSync(join(directory, 'calls'))
      ? readFileSync(join(directory, 'calls'), 'utf8').trim().split('\n').map(JSON.parse) : [];
    const output = existsSync(join(directory, 'output'))
      ? Object.fromEntries(readFileSync(join(directory, 'output'), 'utf8').trim().split('\n')
        .map(line => line.split('=', 2))) : {};
    return { ...result, calls, output };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

// Exercise the checked-in publication conditions and shell steps with fake GitHub and npm commands.
// This covers command selection and ordering, not live registry authentication.
function runPublication({ version = '1.2.3', release, inputs = {},
  dryRun = 'false', token = 'fixture-token' } = {}) {
  const inspected = runStep('Inspect tarball', {
    PACKED_VERSION: version,
    GITHUB_EVENT_NAME: release ? 'release' : 'push',
    RELEASE_NODE_ID: release ? 'fixture-release-id' : '',
    GH_RESPONSE: release ? JSON.stringify({ data: { node: {
      __typename: 'Release', ...release,
    } } }) : '',
    LATEST_TAG: inputs['latest-tag'] || '',
    EDGE_TAG: inputs['edge-tag'] || '',
    SYNC_EDGE_TAG: inputs['sync-edge-tag'] || '',
    LEGACY_STABLE_TAG: inputs['stable-tag'] || '',
    LEGACY_PRERELEASE_TAG: inputs['prerelease-tag'] || '',
    LEGACY_SYNC_EDGE_TAG: inputs['update-prerelease-tag-on-stable'] || '',
  });
  if (inspected.status !== 0) return inspected;
  const values = {
    'inputs.dry-run': dryRun,
    'steps.package.outputs.sync-edge-tag': inspected.output['sync-edge-tag'],
    'steps.package.outputs.promote-both': inspected.output['promote-both'],
  };
  const calls = [];
  for (const step of steps) {
    const name = step.split('\n')[0].replace('name: ', '');
    if (!['Validate channel update authentication', 'Dry-run publication', 'Publish tarball', 'Sync edge tag'].includes(name)) continue;
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
      CHANNEL: inspected.output.channel,
      EDGE_TAG: inspected.output['edge-tag'],
      PACKAGE_VERSION: version,
      CHANNEL_TOKEN: token,
      NODE_AUTH_TOKEN: token,
    });
    calls.push(...result.calls);
    if (result.status !== 0) return { ...result, calls, output: inspected.output };
  }
  return { status: 0, calls, output: inspected.output };
}

test('without release context, a stable version updates latest and then edge', () => {
  const result = runPublication();
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.calls, [
    ['publish', '/fixture/package.tgz', '--ignore-scripts', '--tag', 'latest',
      '--registry', 'https://registry.example.invalid', '--access', 'public'],
    ['dist-tag', 'add', '@fixture/package@1.2.3', 'edge', '--registry', 'https://registry.example.invalid'],
  ]);
});

test('latest publication can explicitly leave edge unchanged without a channel token', () => {
  const result = runPublication({ inputs: { 'sync-edge-tag': 'false' }, token: '' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.calls.length, 1);
  assert.equal(result.calls[0][0], 'publish');
  assert.equal(result.calls[0][4], 'latest');
});

test('without release context, a prerelease version only updates edge', () => {
  const result = runPublication({ version: '1.2.3-next.1', token: '' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.calls.length, 1);
  assert.equal(result.calls[0][0], 'publish');
  assert.equal(result.calls[0][4], 'edge');
});

test('GitHub Latest release promotes a SemVer prerelease to latest and edge', () => {
  const result = runPublication({ version: '1.2.3-beta.12',
    release: { isLatest: true, isPrerelease: false } });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.output['release-type'], 'prerelease'); // Deprecated output remains SemVer-only.
  assert.equal(result.output.channel, 'latest');
  assert.deepEqual(result.calls, [
    ['publish', '/fixture/package.tgz', '--ignore-scripts', '--tag', 'latest',
      '--registry', 'https://registry.example.invalid', '--access', 'public'],
    ['dist-tag', 'add', '@fixture/package@1.2.3-beta.12', 'edge',
      '--registry', 'https://registry.example.invalid'],
  ]);
});

test('GitHub prerelease publishes only to edge despite a stable SemVer version', () => {
  const result = runPublication({ release: { isLatest: false, isPrerelease: true }, token: '' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.output.channel, 'edge');
  assert.equal(result.calls.length, 1);
  assert.equal(result.calls[0][4], 'edge');
});

test('preferred tag inputs customize latest and edge without changing publication policy', () => {
  const result = runPublication({ inputs: { 'latest-tag': 'recommended', 'edge-tag': 'next' } });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.output.channel, 'recommended');
  assert.deepEqual(result.calls, [
    ['publish', '/fixture/package.tgz', '--ignore-scripts', '--tag', 'recommended',
      '--registry', 'https://registry.example.invalid', '--access', 'public'],
    ['dist-tag', 'add', '@fixture/package@1.2.3', 'next',
      '--registry', 'https://registry.example.invalid'],
  ]);
});

test('legacy tag inputs and sync opt-out still work', () => {
  const latest = runPublication({ inputs: { 'stable-tag': 'recommended',
    'prerelease-tag': 'next', 'update-prerelease-tag-on-stable': 'false' }, token: '' });
  assert.equal(latest.status, 0, latest.stderr);
  assert.equal(latest.output.channel, 'recommended');
  assert.equal(latest.calls.length, 1);
  const edge = runPublication({ release: { isLatest: false, isPrerelease: true },
    inputs: { 'prerelease-tag': 'next' }, token: '' });
  assert.equal(edge.status, 0, edge.stderr);
  assert.equal(edge.output.channel, 'next');
  assert.equal(edge.calls.length, 1);
});

test('conflicting preferred and legacy inputs fail before publication', () => {
  for (const inputs of [
    { 'latest-tag': 'recommended', 'stable-tag': 'stable' },
    { 'edge-tag': 'next', 'prerelease-tag': 'preview' },
    { 'sync-edge-tag': 'true', 'update-prerelease-tag-on-stable': 'false' },
  ]) {
    const result = runPublication({ inputs });
    assert.notEqual(result.status, 0);
    assert.deepEqual(result.calls, []);
    assert.match(result.stderr, /conflicting values/);
  }
});

test('invalid sync-edge-tag fails before publication', () => {
  const result = runPublication({ inputs: { 'sync-edge-tag': 'sometimes' } });
  assert.notEqual(result.status, 0);
  assert.deepEqual(result.calls, []);
  assert.match(result.stderr, /sync-edge-tag must be true or false/);
});

test('regular non-Latest GitHub release preserves npm latest', () => {
  const result = runPublication({ release: { isLatest: false, isPrerelease: false }, token: '' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.output.channel, 'edge');
  assert.equal(result.calls.length, 1);
  assert.equal(result.calls[0][4], 'edge');
});

test('missing GitHub release status fails before publication', () => {
  const result = runPublication({ release: { isPrerelease: false } });
  assert.notEqual(result.status, 0);
  assert.deepEqual(result.calls, []);
  assert.match(result.stderr, /valid release status/);
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

test('edge sync preserves npm failure status', () => {
  const result = runStep('Sync edge tag', { NPM_STATUS: '23', EDGE_TAG: 'edge' });
  assert.equal(result.status, 23, result.stderr);
  assert.deepEqual(result.calls, [['dist-tag', 'add', '@fixture/package@1.2.3', 'edge',
    '--registry', 'https://registry.example.invalid']]);
});
