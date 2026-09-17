import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolveRuntime } from '../../.lib/resolve-runtime.mjs';

function project(t, files = {}) {
  const root = mkdtempSync(join(tmpdir(), 'node-selection-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const [name, value] of Object.entries(files)) writeFileSync(join(root, name), value);
  return root;
}

for (const [name, files, requested, version, source] of [
  ['file precedence', { '.node-version': '26.9.0\n', '.nvmrc': '24', 'package.json': '{"engines":{"node":"22"}}' }, 'auto', '26.9.0', '.node-version'],
  ['nvmrc', { '.nvmrc': 'v24.21.0\r\n', 'package.json': '{}' }, 'auto', 'v24.21.0', '.nvmrc'],
  ['tool versions', { '.tool-versions': 'bun 1.4.2\nnodejs 26.9.0\n' }, 'auto', '26.9.0', '.tool-versions'],
  ['engine range', { 'package.json': '{"engines":{"node":">=24 <27"},"packageManager":"bun@1.4.2"}' }, 'auto', '>=24 <27', 'package.json#engines.node'],
  ['empty project fallback', {}, 'auto', '26.x', 'fallback'],
  ['unrelated metadata fallback', { 'package.json': '{"packageManager":"npm@11.5.1"}' }, 'auto', '26.x', 'fallback'],
  ['explicit wins over broken declarations', { '.node-version': '', 'package.json': 'broken' }, '24.21.0', '24.21.0', 'input'],
]) {
  test(name, (t) => assert.deepEqual(resolveRuntime('node', requested, project(t, files)), { version, source }));
}

for (const files of [
  { '.node-version': '', '.nvmrc': '26' },
  { '.node-version': '26\n24' },
  { '.tool-versions': 'nodejs\n' },
  { 'package.json': 'invalid json' },
  { 'package.json': 'null' },
  { 'package.json': '{"engines":{"node":26}}' },
  { 'package.json': '{"engines":{"node":""}}' },
]) {
  test(`rejects malformed declaration ${JSON.stringify(files)}`, (t) => {
    assert.throws(() => resolveRuntime('node', 'auto', project(t, files)));
  });
}

test('rejects empty and multiline overrides; explicit version needs no project', (t) => {
  const root = project(t);
  for (const requested of ['', '26\nsource=injected']) assert.throws(() => resolveRuntime('node', requested, root));
  assert.throws(() => resolveRuntime('node', 'auto', join(root, 'missing')), /directory does not exist/);
  assert.equal(resolveRuntime('node', '26', join(root, 'missing')).version, '26');
});

test('CLI resolves relative to the caller workspace', (t) => {
  const root = project(t, { '.node-version': '26.9.0\n' });
  const script = fileURLToPath(new URL('../../.lib/resolve-runtime.mjs', import.meta.url));
  const result = spawnSync(process.execPath, [script], {
    encoding: 'utf8', cwd: tmpdir(),
    env: { ...process.env, RUNTIME: 'node', RUNTIME_VERSION: 'auto', PROJECT_DIRECTORY: '.',
      GITHUB_WORKSPACE: root, ACTION_DEBUG: 'false' },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'version=26.9.0\nsource=.node-version\n');
});
