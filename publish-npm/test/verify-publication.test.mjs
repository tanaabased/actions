import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyPublication } from '../scripts/verify-publication.mjs';

const local = { name: '@consumer/widget', version: '2.3.4', integrity: 'sha512-fixture' };
const options = { tarball: '/tmp/widget.tgz', registry: 'https://registry.example.test', channels: ['stable', 'preview'] };
const remote = { ...local, 'dist.integrity': local.integrity, 'dist.tarball': 'https://registry.example.test/widget.tgz' };
const tags = { stable: local.version, preview: local.version };

function reader(change = (value) => value) {
  return (args) => {
    if (args[0] === 'pack') return [local];
    assert.equal(args[0], 'view');
    assert.equal(args[args.indexOf('--registry') + 1], options.registry);
    return change(args[2] === 'dist-tags' ? tags : remote);
  };
}

test('verifies consumer artifact and every requested channel', async () => {
  await verifyPublication(options, reader(), () => assert.fail('Unexpected retry'));
});

test('retries stale registry state without publishing again', async () => {
  let waits = 0;
  const read = reader((value) => waits === 0 && value === tags ? { ...tags, preview: '2.3.3' } : value);
  await verifyPublication(options, read, async (ms) => { assert.equal(ms, 5000); waits++; });
  assert.equal(waits, 1);
});

for (const [name, change] of [
  ['identity', (value) => value === remote ? { ...value, name: 'wrong' } : value],
  ['version', (value) => value === remote ? { ...value, version: '2.3.3' } : value],
  ['integrity', (value) => value === remote ? { ...value, 'dist.integrity': 'wrong' } : value],
  ['tarball', (value) => value === remote ? { ...value, 'dist.tarball': '' } : value],
  ['channel', (value) => value === tags ? { ...value, preview: '2.3.3' } : value],
  ['read failure', () => { throw new Error('private-registry-error'); }],
]) {
  test(`fails bounded readback for ${name}`, async () => {
    let waits = 0;
    await assert.rejects(verifyPublication(options, reader(change), async () => { waits++; }),
      /inspect registry state before retrying publication/);
    assert.equal(waits, 11);
  });
}
