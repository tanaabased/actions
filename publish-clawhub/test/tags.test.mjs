import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

const action = readFileSync(new URL('../action.yml', import.meta.url), 'utf8');
const step = action.split(/^    - /m).find(value => value.startsWith('id: tags\n'));
assert.ok(step, 'Resolve publication tags step exists');
const raw = step.split('      run: ')[1];
const script = raw.slice(2).split('\n').map(line => line.slice(8)).join('\n');

function resolve({ version = '1.2.3', event = 'push', nodeId = '', response = '', ghStatus = '0', explicit = '' } = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'clawhub-tags-'));
  try {
    const bin = join(directory, 'bin');
    const project = join(directory, 'project');
    mkdirSync(bin);
    mkdirSync(project);
    writeFileSync(join(project, 'package.json'), JSON.stringify({ version }));
    writeFileSync(join(bin, 'gh'), `#!${process.execPath}\nprocess.stdout.write(process.env.GH_RESPONSE);process.exitCode=Number(process.env.GH_STATUS);\n`, { mode: 0o755 });
    const result = spawnSync('bash', ['-eo', 'pipefail', '-c', script], {
      encoding: 'utf8',
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, GITHUB_OUTPUT: join(directory, 'output'),
        GITHUB_EVENT_NAME: event, GITHUB_SERVER_URL: 'https://github.com', RELEASE_NODE_ID: nodeId,
        WORKING_DIRECTORY: project, EXPLICIT_TAGS: explicit, GH_RESPONSE: response,
        GH_STATUS: ghStatus, ACTION_DEBUG: 'false' },
    });
    const output = existsSync(join(directory, 'output')) ? readFileSync(join(directory, 'output'), 'utf8').trim() : '';
    return { ...result, tags: output.startsWith('tags=') ? output.slice(5) : '' };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function release(isLatest, isPrerelease) {
  return JSON.stringify({ data: { node: { __typename: 'Release', isLatest, isPrerelease } } });
}

test('release status, not SemVer syntax, selects ClawHub tags', () => {
  for (const [version, latest, prerelease, expected] of [
    ['1.2.3-beta.1', true, false, 'latest,edge'],
    ['1.2.3', false, false, 'edge'],
    ['1.2.3', true, true, 'edge'],
  ]) {
    const result = resolve({ version, event: 'release', nodeId: 'release-node',
      response: release(latest, prerelease) });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.tags, expected);
  }
});

test('without release context, package SemVer selects tags', () => {
  assert.equal(resolve({ version: '1.2.3' }).tags, 'latest,edge');
  assert.equal(resolve({ version: '1.2.3-rc.1' }).tags, 'edge');
  assert.equal(resolve({ version: '1.2.3+build-1' }).tags, 'latest,edge');
});

test('explicit tags override automatic selection without querying GitHub', () => {
  const result = resolve({ event: 'release', explicit: 'preview,stable' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.tags, 'preview,stable');
});

test('missing or unresolved authoritative release status fails closed', () => {
  for (const options of [
    { event: 'release' },
    { event: 'release', nodeId: 'release-node', response: '{}' },
    { event: 'release', nodeId: 'release-node', response: release(true, false), ghStatus: '1' },
  ]) {
    const result = resolve(options);
    assert.notEqual(result.status, 0);
    assert.equal(result.tags, '');
  }
});

test('dry run keeps authentication conditional and publication in native dry-run mode', () => {
  assert.match(action, /name: Authenticate with ClawHub\n      if: \$\{\{ inputs\.dry-run != 'true' \}\}/);
  assert.ok(action.includes('publish_args+=(--dry-run)'));
  assert.doesNotMatch(action, /clawhub package (?:tag|unpublish)\b/);
});
