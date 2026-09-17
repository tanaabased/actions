import assert from 'node:assert/strict';
import test from 'node:test';
import { execFile, execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { gitEnvironment, verifyPublication } from '../scripts/verify-publication.mjs';

const options = { root: '/consumer', version: 'v2.3.4', branch: 'refs/heads/release/2.x', tags: ' v2\n stable\n' };
const refs = ['refs/heads/release/2.x', 'refs/tags/v2.3.4', 'refs/tags/v2', 'refs/tags/stable'];
const commit = 'a'.repeat(40);

function reader({ missing, stale, version = '2.3.4', fail = false } = {}) {
  return (args) => {
    switch (args[0]) {
      case 'check-ref-format': assert(refs.includes(args[1])); return '';
      case 'rev-parse': return commit;
      case 'show': assert.equal(args[1], `${commit}:package.json`); return JSON.stringify({ version });
      case 'ls-remote':
        if (fail) throw new Error('private-transport-error');
        assert.equal(args[1], 'origin');
        for (const ref of refs.slice(0, 2)) assert(args.includes(ref));
        return refs.filter((ref) => ref !== missing)
          .map((ref) => `${ref === stale ? 'b'.repeat(40) : commit}\t${ref}`).join('\n');
      default: assert.fail(`Unexpected command: ${args[0]}`);
    }
  };
}

test('verifies the caller branch, exact tag, multiple moving tags, and package version', () => {
  verifyPublication(options, reader());
  verifyPublication({ ...options, tags: '' }, reader());
});

for (const ref of refs) {
  test(`rejects absent or stale ${ref}`, () => {
    assert.throws(() => verifyPublication(options, reader({ missing: ref })), /prepared commit/);
    assert.throws(() => verifyPublication(options, reader({ stale: ref })), /prepared commit/);
  });
}

test('rejects the wrong package version and hides transport details', () => {
  assert.throws(() => verifyPublication(options, reader({ version: '2.3.3' })), /package version/);
  assert.throws(() => verifyPublication(options, reader({ fail: true })), /^Error: Could not read published/);
});

test('replaces duplicate checkout and publisher headers without changing Git configuration', async () => {
  const root = mkdtempSync(join(tmpdir(), 'publish-repo-auth-'));
  const requests = [];
  const server = createServer((request, response) => {
    requests.push(request.rawHeaders.flatMap((name, index, headers) =>
      index % 2 === 0 && name.toLowerCase() === 'authorization' ? [headers[index + 1]] : []));
    response.writeHead(403).end();
  });
  try {
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${server.address().port}`;
    const git = (args) => execFileSync('git', args, { cwd: root, stdio: 'pipe' });
    git(['init', '--quiet']);
    writeFileSync(join(root, 'checkout.config'), `[http "${url}/"]\n  extraheader = AUTHORIZATION: basic checkout-sentinel\n`);
    git(['config', '--local', 'include.path', join(root, 'checkout.config')]);
    git(['config', '--local', `http.${url}/.extraheader`, 'AUTHORIZATION: basic publisher-sentinel']);
    const before = readFileSync(join(root, '.git/config'), 'utf8');
    const environment = { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_CONFIG_COUNT: '1',
      GIT_CONFIG_KEY_0: 'protocol.version', GIT_CONFIG_VALUE_0: '2' };
    const read = (env) => promisify(execFile)('git', ['ls-remote', `${url}/repo.git`], { cwd: root, env });
    // A denied local endpoint captures headers without contacting a real registry or repository.
    await assert.rejects(read(environment));
    assert.deepEqual(requests.at(-1), ['basic checkout-sentinel', 'basic publisher-sentinel']);
    const isolated = gitEnvironment('readback-sentinel', url, environment);
    await assert.rejects(read(isolated));
    assert.deepEqual(requests.at(-1), [`basic ${Buffer.from('x-access-token:readback-sentinel').toString('base64')}`]);
    assert.equal(isolated.GIT_CONFIG_KEY_0, 'protocol.version');
    assert.equal(readFileSync(join(root, '.git/config'), 'utf8'), before);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    rmSync(root, { recursive: true, force: true });
  }
});
