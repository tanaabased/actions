import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { resolveRuntime } from '../../.lib/resolve-runtime.mjs';

function project(t, files = {}) {
  const root = mkdtempSync(join(tmpdir(), 'bun-selection-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const [name, value] of Object.entries(files)) writeFileSync(join(root, name), value);
  return root;
}

for (const [name, files, requested, version, source] of [
  ['file precedence', { '.bun-version': '1.4.2\r\n', 'package.json': '{"packageManager":"bun@1.3.14"}' }, 'auto', '1.4.2', '.bun-version'],
  ['tool versions', { '.tool-versions': 'nodejs 26.9.0\nbun 1.4.2\n' }, 'auto', '1.4.2', '.tool-versions'],
  ['package manager precedence', { 'package.json': '{"packageManager":"bun@1.4.2","engines":{"bun":"1.3.x"}}' }, 'auto', '1.4.2', 'package.json#packageManager'],
  ['package manager integrity', { 'package.json': '{"packageManager":"bun@1.4.2+sha512.example"}' }, 'auto', '1.4.2', 'package.json#packageManager'],
  ['engine range', { 'package.json': '{"packageManager":"npm@11.5.1","engines":{"bun":"1.3.x"}}' }, 'auto', '1.3.x', 'package.json#engines.bun'],
  ['empty project fallback', {}, 'auto', '1.4.x', 'fallback'],
  ['unrelated metadata fallback', { 'package.json': '{"packageManager":"npm@11.5.1"}', '.tool-versions': 'nodejs 26' }, 'auto', '1.4.x', 'fallback'],
  ['explicit wins over broken declarations', { '.bun-version': '', 'package.json': 'broken' }, '1.3.14', '1.3.14', 'input'],
]) {
  test(name, (t) => assert.deepEqual(resolveRuntime('bun', requested, project(t, files)), { version, source }));
}

for (const files of [
  { '.bun-version': '', 'package.json': '{"packageManager":"bun@1.4.2"}' },
  { '.bun-version': '1.4.2\n1.3.14' },
  { '.tool-versions': 'bun\n' },
  { 'package.json': 'invalid json' },
  { 'package.json': '[]' },
  { 'package.json': '{"packageManager":13}' },
  { 'package.json': '{"packageManager":"bun@","engines":{"bun":"1.3.x"}}' },
  { 'package.json': '{"engines":{"bun":13}}' },
]) {
  test(`rejects malformed declaration ${JSON.stringify(files)}`, (t) => {
    assert.throws(() => resolveRuntime('bun', 'auto', project(t, files)));
  });
}
