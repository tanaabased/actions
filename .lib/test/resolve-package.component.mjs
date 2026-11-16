import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { resolvePackageSpec } from '../resolve-package.mjs';

function fixture(run) {
  const directory = mkdtempSync(join(tmpdir(), 'package-selection-'));
  try {
    return run(join(directory, 'package.json'));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

for (const name of ['openclaw', 'clawhub']) {
  test(`should distinguish absent manifests, valid declarations and malformed JSON (${name})`, () =>
    fixture((path) => {
      assert.equal(resolvePackageSpec(name, 'auto', path), 'latest');
      writeFileSync(path, JSON.stringify({ devDependencies: { [name]: '1.2.3' } }));
      assert.equal(resolvePackageSpec(name, 'auto', path), '1.2.3');
      writeFileSync(path, '{broken');
      assert.throws(() => resolvePackageSpec(name, 'auto', path), /valid JSON/);
      assert.equal(resolvePackageSpec(name, '2.3.4', path), '2.3.4');
    }));
}

test('should require a readable manifest and field for explicit field selection', () =>
  fixture((path) => {
    assert.throws(
      () => resolvePackageSpec('openclaw', 'auto', path, 'tested.version'),
      /cannot read/,
    );
    writeFileSync(path, '{"tested":{"version":"1.2.3"}}');
    assert.equal(resolvePackageSpec('openclaw', 'auto', path, 'tested.version'), '1.2.3');
    assert.throws(() => resolvePackageSpec('openclaw', 'auto', path, 'tested.missing'), /missing/);
  }));

test('should reject unreadable manifests rather than select latest', () =>
  fixture((path) => {
    mkdirSync(path);
    assert.throws(() => resolvePackageSpec('clawhub', 'auto', path), /cannot read/);
  }));
