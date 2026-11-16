import assert from 'node:assert/strict';
import { test } from 'node:test';

import { selectPackageSpec } from '../resolve-package.mjs';

for (const name of ['openclaw', 'clawhub']) {
  test(`should let explicit input override missing or conflicting declarations (${name})`, () => {
    const conflict = { devDependencies: { [name]: '1.2.3' }, dependencies: { [name]: '2.0.0' } };
    assert.equal(selectPackageSpec(name, '2.3.4', conflict), '2.3.4');
    assert.equal(selectPackageSpec(name, 'latest'), 'latest');
  });

  test(`should discover matching declarations and fall back only when absent (${name})`, () => {
    for (const [manifest, expected] of [
      [undefined, 'latest'],
      [{}, 'latest'],
      [{ peerDependencies: { [name]: '1.2.3' } }, 'latest'],
      [{ devDependencies: { [name]: '1.2.3' } }, '1.2.3'],
      [{ dependencies: { [name]: '^1.2.3' } }, '^1.2.3'],
      [{ devDependencies: { [name]: '1.2.3' }, dependencies: { [name]: '1.2.3' } }, '1.2.3'],
    ])
      assert.equal(selectPackageSpec(name, 'auto', manifest), expected);
  });

  test(`should reject bad declarations rather than select latest (${name})`, () => {
    for (const manifest of [
      { devDependencies: { [name]: '1.2.3' }, dependencies: { [name]: '2.0.0' } },
      ...['', 42, 'file:../tool', 'https://example.com/tool.tgz', '--global', 'next'].map(
        (value) => ({ devDependencies: { [name]: value } }),
      ),
      null,
      [],
    ])
      assert.throws(() => selectPackageSpec(name, 'auto', manifest));
  });
}

test('should use explicit custom fields and reject missing or unsafe fields', () => {
  const manifest = { tested: { version: '1.2.3' }, devDependencies: { openclaw: '2.0.0' } };
  assert.equal(selectPackageSpec('openclaw', 'auto', manifest, 'tested.version'), '1.2.3');
  assert.throws(() => selectPackageSpec('openclaw', 'auto', manifest, 'tested.missing'), /missing/);
  assert.throws(
    () => selectPackageSpec('openclaw', 'auto', manifest, '__proto__.version'),
    /invalid/,
  );
});
