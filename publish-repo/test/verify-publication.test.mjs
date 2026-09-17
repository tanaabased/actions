import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyPublication } from '../scripts/verify-publication.mjs';

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
