import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { resolvePackageSpec } from '../resolve-package.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
function fixture(run) {
  const directory = mkdtempSync(join(tmpdir(), 'package-selection-'));
  try { return run(directory); }
  finally { rmSync(directory, { recursive: true, force: true }); }
}

for (const name of ['openclaw', 'clawhub']) {
  test(`${name}: declarations, explicit inputs and missing-only fallback`, () => fixture(directory => {
    const path = join(directory, 'package.json');
    assert.equal(resolvePackageSpec(name, 'auto', path), 'latest');
    for (const manifest of [{}, { peerDependencies: { [name]: '1.2.3' } }]) {
      writeFileSync(path, JSON.stringify(manifest));
      assert.equal(resolvePackageSpec(name, 'auto', path), 'latest');
    }
    for (const [manifest, expected] of [
      [{ devDependencies: { [name]: '1.2.3' } }, '1.2.3'],
      [{ dependencies: { [name]: '^1.2.3' } }, '^1.2.3'],
      [{ devDependencies: { [name]: '1.2.3' }, dependencies: { [name]: '1.2.3' } }, '1.2.3'],
    ]) {
      writeFileSync(path, JSON.stringify(manifest));
      assert.equal(resolvePackageSpec(name, 'auto', path), expected);
    }
    writeFileSync(path, '{broken');
    assert.equal(resolvePackageSpec(name, '2.3.4', path), '2.3.4');
    assert.equal(resolvePackageSpec(name, 'latest', path), 'latest');
    assert.throws(() => resolvePackageSpec(name, 'auto', path), /valid JSON/);
  }));

  test(`${name}: bad declarations fail instead of selecting latest`, () => fixture(directory => {
    const path = join(directory, 'package.json');
    for (const manifest of [
      { devDependencies: { [name]: '1.2.3' }, dependencies: { [name]: '2.0.0' } },
      ...['', 42, 'file:../tool', 'https://example.com/tool.tgz', '--global', 'next'].map(value => ({ devDependencies: { [name]: value } })),
      null, [],
    ]) {
      writeFileSync(path, JSON.stringify(manifest));
      assert.throws(() => resolvePackageSpec(name, 'auto', path));
    }
    writeFileSync(path, '{"tested":{"version":"1.2.3"}}');
    assert.equal(resolvePackageSpec(name, 'auto', path, 'tested.version'), '1.2.3');
    assert.throws(() => resolvePackageSpec(name, 'auto', path, 'tested.missing'), /missing/);
    assert.throws(() => resolvePackageSpec(name, 'auto', join(directory, 'absent.json'), 'tested.version'), /cannot read/);
    assert.throws(() => resolvePackageSpec(name, 'auto', path, '__proto__.version'), /invalid/);
  }));
}

for (const name of ['openclaw', 'clawhub']) {
  test(`${name}: action adapter passes discovered, explicit and fallback selections to npm`, () => fixture(directory => {
    const bin = join(directory, 'bin');
    const project = join(directory, 'caller');
    mkdirSync(bin);
    mkdirSync(project);
    writeFileSync(join(bin, 'npm'), `#!${process.execPath}
const args = process.argv.slice(2);
require('node:fs').appendFileSync(process.env.NPM_CALLS, JSON.stringify(args)+'\\n');
if (process.env.NPM_FAIL === 'true') process.exit(19);
if (args[0] === 'view') console.log(JSON.stringify(args[2] === 'version' ? '2026.11.3' : '>=22'));
`, { mode: 0o755 });
    const calls = join(directory, 'calls');
    const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, NPM_CALLS: calls,
      GITHUB_WORKSPACE: directory, WORKING_DIRECTORY: 'caller',
      GITHUB_ACTION_PATH: join(root, 'publish-clawhub') };
    const action = readFileSync(join(root, 'publish-clawhub/action.yml'), 'utf8');
    const install = action.split(/^    - /m).find(step => step.startsWith('name: Install ClawHub CLI\n'));
    const script = install.split('      run: |\n')[1].split('\n').map(line => line.slice(8)).join('\n');
    function run(input, fail = false, field = '') {
      writeFileSync(calls, '');
      return name === 'openclaw'
        ? spawnSync(process.execPath, [join(root, 'setup-openclaw/scripts/lib/resolve-openclaw.mjs'), input, join(project, 'package.json'), field], { env: { ...env, NPM_FAIL: String(fail) }, encoding: 'utf8' })
        : spawnSync('bash', ['-eo', 'pipefail', '-c', script], { env: { ...env, CLAWHUB_VERSION: input, NPM_FAIL: String(fail) }, encoding: 'utf8' });
    }
    function selected() {
      const args = JSON.parse(readFileSync(calls, 'utf8').trim().split('\n')[0]);
      return args[name === 'openclaw' ? 1 : 2];
    }
    assert.equal(run('auto').status, 0);
    assert.equal(selected(), `${name}@latest`);
    writeFileSync(join(project, 'package.json'), JSON.stringify({ devDependencies: { [name]: '1.2.3' } }));
    assert.equal(run('auto').status, 0);
    assert.equal(selected(), `${name}@1.2.3`);
    assert.equal(run('2.3.4').status, 0);
    assert.equal(selected(), `${name}@2.3.4`);
    assert.notEqual(run('auto', true).status, 0);
    assert.equal(selected(), `${name}@1.2.3`);
    assert.equal(readFileSync(calls, 'utf8').trim().split('\n').length, 1, 'npm failure must not retry with latest');
    writeFileSync(join(project, 'package.json'), '{broken');
    assert.notEqual(run('auto').status, 0);
    assert.equal(readFileSync(calls, 'utf8'), '');
    assert.equal(run('2.3.4').status, 0);
    if (name === 'openclaw') {
      writeFileSync(join(project, 'package.json'), '{"tested":{"version":"2026.11.3"}}');
      const result = run('auto', false, 'tested.version');
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stdout, '2026.11.3\n>=22\n');
    }
  }));
}
