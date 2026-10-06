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
if (args[0] === '--version') {
  process.stdout.write(process.env.FAKE_NPM_VERSION || '11.21.0');
} else if (args[0] === 'pack') {
  process.stdout.write(JSON.stringify([{ name: '@fixture/package', version: process.env.PACKED_VERSION || '1.2.3' }]));
} else {
  fs.appendFileSync(process.env.CALLS, JSON.stringify(args) + '\\n');
  fs.appendFileSync(process.env.AUTH_CALLS, JSON.stringify(process.env.NODE_AUTH_TOKEN || '') + '\\n');
  process.exitCode = ['publish', 'dist-tag'].includes(args[0])
    ? Number(args[0] === 'dist-tag'
      ? process.env.NPM_DIST_TAG_STATUS || process.env.NPM_STATUS || 0
      : process.env.NPM_STATUS || 0) : 99;
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
        AUTH_CALLS: join(directory, 'auth-calls'), RUNNER_TEMP: directory,
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
    const auth = existsSync(join(directory, 'auth-calls'))
      ? readFileSync(join(directory, 'auth-calls'), 'utf8').trim().split('\n').map(JSON.parse) : [];
    const output = existsSync(join(directory, 'output'))
      ? Object.fromEntries(readFileSync(join(directory, 'output'), 'utf8').trim().split('\n')
        .map(line => line.split('=', 2))) : {};
    const configs = Object.fromEntries(['publish-config', 'channel-config']
      .filter(key => output[key] && existsSync(output[key]))
      .map(key => [key, readFileSync(output[key], 'utf8')]));
    return { ...result, calls, auth, output, configs };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

// Exercise the checked-in publication conditions and shell steps with fake GitHub and npm commands.
// This covers command selection and ordering, not live registry authentication.
function runPublication({ version = '1.2.3', release, inputs = {},
  dryRun = 'false', token = 'fixture-token', channelToken = '',
  npmVersion = '11.21.0', distTagStatus = '0' } = {}) {
  const validated = runStep('Validate supported npm', { FAKE_NPM_VERSION: npmVersion });
  if (validated.status !== 0) return validated;
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
  const auth = [];
  for (const step of steps) {
    const name = step.split('\n')[0].replace('name: ', '');
    if (!['Dry-run publication', 'Publish tarball', 'Sync edge tag'].includes(name)) continue;
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
      NODE_AUTH_TOKEN: name === 'Sync edge tag' ? channelToken || token : token,
      NPM_DIST_TAG_STATUS: distTagStatus,
    });
    calls.push(...result.calls);
    auth.push(...result.auth);
    if (result.status !== 0) return { ...result, calls, auth, output: inspected.output };
  }
  return { status: 0, calls, auth, output: inspected.output };
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

test('tokenless latest publication still syncs edge with no token in either command', () => {
  const result = runPublication({ token: '' });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.calls.map(call => call[0]), ['publish', 'dist-tag']);
  assert.deepEqual(result.auth, ['', '']);
});

test('registry and channel tokens remain independently scoped', () => {
  const result = runPublication({ token: 'publish-token', channelToken: 'tag-token' });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.auth, ['publish-token', 'tag-token']);
  const fallback = runPublication({ token: 'shared-token' });
  assert.deepEqual(fallback.auth, ['shared-token', 'shared-token']);
  const channelOnly = runPublication({ token: '', channelToken: 'tag-token' });
  assert.deepEqual(channelOnly.auth, ['', 'tag-token']);
});

test('temporary registry configurations contain token placeholders only when supplied', () => {
  const oidc = runStep('Configure registry access', {
    REGISTRY_TOKEN: '', CHANNEL_TOKEN: '',
  });
  assert.equal(oidc.status, 0, oidc.stderr);
  assert.ok(!oidc.configs['publish-config'].includes('_authToken'));
  assert.ok(!oidc.configs['channel-config'].includes('_authToken'));
  const channel = runStep('Configure registry access', {
    REGISTRY_TOKEN: '', CHANNEL_TOKEN: 'tag-token',
  });
  assert.equal(channel.status, 0, channel.stderr);
  assert.ok(!channel.configs['publish-config'].includes('_authToken'));
  assert.match(channel.configs['channel-config'], /:_authToken=\$\{NODE_AUTH_TOKEN\}/);
  const registry = runStep('Configure registry access', {
    REGISTRY_TOKEN: 'publish-token', CHANNEL_TOKEN: '',
  });
  assert.equal(registry.status, 0, registry.stderr);
  assert.match(registry.configs['publish-config'], /:_authToken=\$\{NODE_AUTH_TOKEN\}/);
  assert.match(registry.configs['channel-config'], /:_authToken=\$\{NODE_AUTH_TOKEN\}/);
});

test('incompatible npm versions fail before publication', () => {
  for (const npmVersion of ['11.20.9', '12.1.9', '11.21.0-beta.1', '10.9.0']) {
    const result = runPublication({ npmVersion });
    assert.notEqual(result.status, 0, npmVersion);
    assert.deepEqual(result.calls, []);
    assert.match(result.stderr, /cannot use OIDC dist-tags/);
  }
  for (const npmVersion of ['11.21.0', '12.2.0', '13.0.0', '14.0.0']) {
    assert.equal(runPublication({ npmVersion }).status, 0, npmVersion);
  }
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

test('tokenless edge sync failure remains visible after successful publication', () => {
  const result = runPublication({ token: '', distTagStatus: '23' });
  assert.equal(result.status, 23, result.stderr);
  assert.deepEqual(result.calls.map(call => call[0]), ['publish', 'dist-tag']);
  assert.deepEqual(result.auth, ['', '']);
});
