import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolveRuntime } from '../resolve-runtime.mjs';

function project(t, files = {}) {
  const root = mkdtempSync(join(tmpdir(), 'runtime-selection-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const [name, value] of Object.entries(files)) writeFileSync(join(root, name), value);
  return root;
}

for (const [runtime, name, files, requested, version, source] of [
  [
    'node',
    'file precedence',
    { '.node-version': '26.9.0\n', '.nvmrc': '24', 'package.json': '{"engines":{"node":"22"}}' },
    'auto',
    '26.9.0',
    '.node-version',
  ],
  [
    'node',
    'nvmrc',
    { '.nvmrc': 'v24.21.0\r\n', 'package.json': '{}' },
    'auto',
    'v24.21.0',
    '.nvmrc',
  ],
  [
    'node',
    'nvmrc comments and blank lines',
    { '.nvmrc': '# active LTS\r\n\r\n  lts/* # CI\r\n# end\r\n' },
    'auto',
    'lts/*',
    '.nvmrc',
  ],
  [
    'node',
    'tool versions',
    { '.tool-versions': '# nodejs 20\nbun 1.4.2\nnodejs 26.9.0 # CI\n' },
    'auto',
    '26.9.0',
    '.tool-versions',
  ],
  [
    'node',
    'engine range',
    { 'package.json': '{"engines":{"node":">=24 <27"},"packageManager":"bun@1.4.2"}' },
    'auto',
    '>=24 <27',
    'package.json#engines.node',
  ],
  ['node', 'empty project fallback', {}, 'auto', '26.x', 'fallback'],
  [
    'node',
    'unrelated metadata fallback',
    { 'package.json': '{"packageManager":"npm@11.5.1"}' },
    'auto',
    '26.x',
    'fallback',
  ],
  [
    'node',
    'explicit wins over broken declarations',
    { '.node-version': '', 'package.json': 'broken' },
    '24.21.0',
    '24.21.0',
    'input',
  ],
  [
    'bun',
    'file precedence',
    { '.bun-version': '1.4.2\r\n', 'package.json': '{"packageManager":"bun@1.3.14"}' },
    'auto',
    '1.4.2',
    '.bun-version',
  ],
  [
    'bun',
    'tool versions',
    { '.tool-versions': '# bun 1.3.0\r\nnodejs 26.9.0\r\nbun 1.4.2 # CI\r\n' },
    'auto',
    '1.4.2',
    '.tool-versions',
  ],
  [
    'bun',
    'package manager precedence',
    { 'package.json': '{"packageManager":"bun@1.4.2","engines":{"bun":"1.3.x"}}' },
    'auto',
    '1.4.2',
    'package.json#packageManager',
  ],
  [
    'bun',
    'package manager integrity',
    { 'package.json': '{"packageManager":"bun@1.4.2+sha512.example"}' },
    'auto',
    '1.4.2',
    'package.json#packageManager',
  ],
  [
    'bun',
    'engine range',
    { 'package.json': '{"packageManager":"npm@11.5.1","engines":{"bun":"1.3.x"}}' },
    'auto',
    '1.3.x',
    'package.json#engines.bun',
  ],
  ['bun', 'empty project fallback', {}, 'auto', '1.4.x', 'fallback'],
  [
    'bun',
    'unrelated metadata fallback',
    { 'package.json': '{"packageManager":"npm@11.5.1"}', '.tool-versions': 'nodejs 26' },
    'auto',
    '1.4.x',
    'fallback',
  ],
  [
    'bun',
    'explicit wins over broken declarations',
    { '.bun-version': '', 'package.json': 'broken' },
    '1.3.14',
    '1.3.14',
    'input',
  ],
]) {
  test(`${runtime}: ${name}`, (t) =>
    assert.deepEqual(resolveRuntime(runtime, requested, project(t, files)), { version, source }));
}

for (const [runtime, files] of [
  ['node', { '.node-version': '', '.nvmrc': '26' }],
  ['node', { '.node-version': '26\n24' }],
  ['node', { '.nvmrc': '# no version\n', 'package.json': '{"engines":{"node":"24"}}' }],
  ['node', { '.nvmrc': '26 # first\n24 # second\n' }],
  ['node', { '.tool-versions': 'nodejs\n' }],
  ['node', { 'package.json': 'invalid json' }],
  ['node', { 'package.json': 'null' }],
  ['node', { 'package.json': '{"engines":{"node":26}}' }],
  ['node', { 'package.json': '{"engines":{"node":""}}' }],
  ['bun', { '.bun-version': '', 'package.json': '{"packageManager":"bun@1.4.2"}' }],
  ['bun', { '.bun-version': '1.4.2\n1.3.14' }],
  ['bun', { '.tool-versions': 'bun\n' }],
  ['bun', { '.tool-versions': 'bun # version missing\n' }],
  ['bun', { 'package.json': 'invalid json' }],
  ['bun', { 'package.json': '[]' }],
  ['bun', { 'package.json': '{"packageManager":13}' }],
  ['bun', { 'package.json': '{"packageManager":"bun@","engines":{"bun":"1.3.x"}}' }],
  ['bun', { 'package.json': '{"engines":{"bun":13}}' }],
]) {
  test(`${runtime} rejects malformed declaration ${JSON.stringify(files)}`, (t) => {
    assert.throws(() => resolveRuntime(runtime, 'auto', project(t, files)));
  });
}

test('rejects empty and multiline overrides; explicit version needs no project', (t) => {
  const root = project(t);
  for (const requested of ['', '26\nsource=injected'])
    assert.throws(() => resolveRuntime('node', requested, root));
  assert.throws(
    () => resolveRuntime('node', 'auto', join(root, 'missing')),
    /directory does not exist/,
  );
  assert.equal(resolveRuntime('node', '26', join(root, 'missing')).version, '26');
});

test('CLI resolves relative to the caller workspace', (t) => {
  const root = project(t, { '.node-version': '26.9.0\n' });
  const script = fileURLToPath(new URL('../resolve-runtime.mjs', import.meta.url));
  const result = spawnSync(process.execPath, [script], {
    encoding: 'utf8',
    cwd: tmpdir(),
    env: {
      ...process.env,
      RUNTIME: 'node',
      RUNTIME_VERSION: 'auto',
      PROJECT_DIRECTORY: '.',
      GITHUB_WORKSPACE: root,
      ACTION_DEBUG: 'false',
    },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'version=26.9.0\nsource=.node-version\n');
});
