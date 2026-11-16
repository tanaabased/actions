import assert from 'node:assert/strict';
import { test } from 'node:test';

import { selectPackageSpec } from '../resolve-package.mjs';

for (const name of ['openclaw', 'clawhub']) {
  test(`${name}: explicit input overrides missing or conflicting declarations`, () => {
    const conflict = { devDependencies: { [name]: '1.2.3' }, dependencies: { [name]: '2.0.0' } };
    assert.equal(selectPackageSpec(name, '2.3.4', conflict), '2.3.4');
    assert.equal(selectPackageSpec(name, 'latest'), 'latest');
  });

  test(`${name}: auto selects matching declarations and falls back only when absent`, () => {
    for (const [manifest, expected] of [
      [undefined, 'latest'],
      [{}, 'latest'],
      [{ peerDependencies: { [name]: '1.2.3' } }, 'latest'],
      [{ devDependencies: { [name]: '1.2.3' } }, '1.2.3'],
      [{ dependencies: { [name]: '^1.2.3' } }, '^1.2.3'],
      [{ devDependencies: { [name]: '1.2.3' }, dependencies: { [name]: '1.2.3' } }, '1.2.3'],
    ]) assert.equal(selectPackageSpec(name, 'auto', manifest), expected);
  });

  test(`${name}: bad declarations fail rather than selecting latest`, () => {
    for (const manifest of [
      { devDependencies: { [name]: '1.2.3' }, dependencies: { [name]: '2.0.0' } },
      ...['', 42, 'file:../tool', 'https://example.com/tool.tgz', '--global', 'next'].map(value => ({ devDependencies: { [name]: value } })),
      null, [],
    ]) assert.throws(() => selectPackageSpec(name, 'auto', manifest));
  });
}

test('custom fields override dependency discovery and remain required', () => {
  const manifest = { tested: { version: '1.2.3' }, devDependencies: { openclaw: '2.0.0' } };
  assert.equal(selectPackageSpec('openclaw', 'auto', manifest, 'tested.version'), '1.2.3');
  assert.throws(() => selectPackageSpec('openclaw', 'auto', manifest, 'tested.missing'), /missing/);
  assert.throws(() => selectPackageSpec('openclaw', 'auto', manifest, '__proto__.version'), /invalid/);
});
