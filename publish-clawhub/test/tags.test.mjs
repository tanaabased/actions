import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

const action = readFileSync(new URL('../action.yml', import.meta.url), 'utf8');
function shellStep(header) {
  const step = action.split(/^ {4}- /m).find((value) => value.startsWith(header + '\n'));
  assert.ok(step, header);
  return step.split('      run: |\n')[1].replace(/^ {8}/gm, '');
}

const tagScript = shellStep('id: tags');
const publishScript = shellStep('name: Publish package');

function resolve({
  event = 'push',
  nodeId = '',
  response = '',
  ghStatus = '0',
  explicit = '',
} = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'clawhub-tags-'));
  try {
    const bin = join(directory, 'bin');
    mkdirSync(bin);
    writeFileSync(
      join(bin, 'gh'),
      `#!${process.execPath}\nprocess.stdout.write(process.env.GH_RESPONSE);process.exitCode=Number(process.env.GH_STATUS);\n`,
      { mode: 0o755 },
    );
    const result = spawnSync('bash', ['-eo', 'pipefail', '-c', tagScript], {
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${bin}:${process.env.PATH}`,
        GITHUB_OUTPUT: join(directory, 'output'),
        GITHUB_EVENT_NAME: event,
        GITHUB_SERVER_URL: 'https://github.com',
        RELEASE_NODE_ID: nodeId,
        EXPLICIT_TAGS: explicit,
        GH_RESPONSE: response,
        GH_STATUS: ghStatus,
        ACTION_DEBUG: 'false',
      },
    });
    const output = existsSync(join(directory, 'output'))
      ? readFileSync(join(directory, 'output'), 'utf8').trim()
      : '';
    return { ...result, tags: output.startsWith('tags=') ? output.slice(5) : '' };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function release(isLatest, isPrerelease) {
  return JSON.stringify({ data: { node: { __typename: 'Release', isLatest, isPrerelease } } });
}

test('GitHub release status selects ClawHub tags', () => {
  for (const [latest, prerelease, expected] of [
    [true, false, 'latest,edge'],
    [false, false, 'edge'],
    [true, true, 'edge'],
  ]) {
    const result = resolve({
      event: 'release',
      nodeId: 'release-node',
      response: release(latest, prerelease),
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.tags, expected);
  }
});

test('outside release events the CLI receives only explicitly supplied tags', () => {
  for (const explicit of ['', 'edge']) {
    const result = resolve({ explicit });
    assert.equal(result.status, 0, result.stderr);
    const published = spawnSync(
      'bash',
      ['-c', 'clawhub() { printf "%s\\n" "$@"; }\n' + publishScript],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          TARBALL_PATH: 'fixture.tgz',
          OWNER: 'fixture',
          SOURCE_REPO: 'fixture/plugin',
          SOURCE_COMMIT: 'fixture-commit',
          DRY_RUN: 'true',
          TAGS: result.tags,
        },
      },
    );
    assert.equal(published.status, 0, published.stderr);
    const args = published.stdout.trimEnd().split('\n');
    assert.ok(args.includes('--dry-run'));
    const tagIndex = args.indexOf('--tags');
    if (explicit) {
      assert.notEqual(tagIndex, -1);
      assert.equal(args[tagIndex + 1], explicit);
    } else {
      assert.equal(tagIndex, -1);
    }
  }
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
  assert.match(
    action,
    /name: Authenticate with ClawHub\n {6}if: \$\{\{ inputs\.dry-run != 'true' \}\}/,
  );
  assert.doesNotMatch(action, /clawhub package (?:tag|unpublish)\b/);
});
