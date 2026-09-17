import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync, statSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { selectAgentSystem, setupInputs } from '../scripts/lib/setup-inputs.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const action = readFileSync(join(root, 'action.yml'), 'utf8');
function shellBlock(id) {
  const step = action.split(/^    - /m).find(block => block.startsWith(`id: ${id}\n`));
  return step.split('      run: |\n')[1].split('\n').map(line => line.slice(8)).join('\n');
}
function fixture(run) {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), 'openclaw-contract-')));
  try { return run(directory); } finally { rmSync(directory, { recursive: true, force: true }); }
}
function environment(directory) {
  mkdirSync(join(directory, 'home'));
  return { ...process.env, ...Object.fromEntries(setupInputs.map(name => [`SETUP_${name.replaceAll('-', '_').toUpperCase()}`, ''])),
    HOME: join(directory, 'home'), GITHUB_ACTIONS: 'true', GITHUB_WORKSPACE: directory,
    RUNNER_TEMP: directory, GITHUB_OUTPUT: join(directory, 'outputs'), GITHUB_ENV: join(directory, 'environment'),
    OPENCLAW_PROFILE: 'contract', OPENCLAW_WORKSPACE: join(directory, 'workspace'),
    SETUP_OPENCLAW_STATE_DIR: join(directory, 'state'), SETUP_OPENCLAW_DEBUG: 'false',
    SETUP_OPENCLAW_SELECTION: '', SETUP_RUN: '', DBUS_SESSION_BUS_ADDRESS: '',
  };
}
function inputs(env) {
  return spawnSync(process.execPath, [join(root, 'scripts/lib/action-inputs.mjs')], { env, encoding: 'utf8' });
}
function mockOpenclaw(directory, env) {
  mkdirSync(join(directory, 'bin'));
  writeFileSync(join(directory, 'bin/openclaw'), `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.CALLS, JSON.stringify(args)+'\\n');
if (args[0] !== '--profile' || args[1] !== 'contract') process.exit(91);
if (args.includes('onboard')) {
  fs.mkdirSync(process.env.OPENCLAW_STATE_DIR, {recursive:true});
  fs.writeFileSync(process.env.OPENCLAW_CONFIG_PATH, '{}');
}
if (args.includes('validate')) {
  if (process.env.FAIL_VALIDATE) { console.error(process.env.OPENAI_API_KEY); process.exit(17); }
  console.log('configuration accepted');
}
if (args.includes('inspect')) {
 const artifact = process.env.TEST_ARTIFACT;
 console.log(JSON.stringify({plugin:{id:'agent-system',enabled:true,status:'loaded',source:'/plugin/dist/index.js',version:'0.6.0'},
 install:{source:'npm',artifactKind:'npm-pack',artifactFormat:'tgz',sourcePath:artifact,installPath:'/plugin',version:'0.6.0'},
 policy:{allowConversationAccess:true},typedHooks:[{name:'before_prompt_build'}],diagnostics:[]}));
}
`, { mode: 0o755 });
  env.PATH = `${join(directory, 'bin')}:${process.env.PATH}`;
  env.CALLS = join(directory, 'calls');
}

test('mode inference leaves common inputs in install mode and rejects conflicts before side effects', () => fixture(directory => {
  const env = environment(directory);
  assert.equal(inputs(env).status, 0);
  assert.equal(readFileSync(env.GITHUB_OUTPUT, 'utf8'), 'mode=install\n');
  for (const name of setupInputs) {
    const key = `SETUP_${name.replaceAll('-', '_').toUpperCase()}`;
    const value = { profile: 'ci', workspace: '/tmp/ci', 'state-dir': '/tmp/ci', model: 'openai/gpt-5.4',
      'agent-system': '0.6.0', 'op-cache': '{}', 'needs-secret-service': 'false', 'needs-ssh-key': 'false', yolo: 'false' }[name];
    writeFileSync(env.GITHUB_OUTPUT, '');
    const configured = { ...env, [key]: value, OPENAI_API_KEY: 'fake-test-key', ...(name === 'op-cache' ? { SETUP_AGENT_SYSTEM: '0.6.0' } : {}) };
    assert.equal(inputs(configured).status, 0, name);
    assert.equal(readFileSync(env.GITHUB_OUTPUT, 'utf8'), 'mode=setup\n');
    writeFileSync(env.GITHUB_OUTPUT, '');
    const conflict = inputs({ ...configured, SETUP_RUN: 'echo never' });
    assert.equal(conflict.status, 2);
    assert.match(conflict.stderr, /mutually exclusive/);
    assert.equal(readFileSync(env.GITHUB_OUTPUT, 'utf8'), '');
    assert.equal(existsSync(join(directory, 'state')), false);
  }
  writeFileSync(env.GITHUB_OUTPUT, '');
  assert.equal(inputs({ ...env, SETUP_RUN: 'echo first\necho second' }).status, 0);
  assert.equal(readFileSync(env.GITHUB_OUTPUT, 'utf8'), 'mode=run\n');
}));

test('selectors distinguish exact versions, explicit paths and repository refs without guessing', () => fixture(directory => {
  assert.equal(selectAgentSystem('0.6.0-beta.1').mode, 'published');
  assert.equal(selectAgentSystem('github:tanaabased/openclaw-agent-system#main').mode, 'repository');
  for (const selector of ['latest', '^0.6.0', '0.6.0-01', 'owner/repo', 'github:owner/repo', 'github:owner/repo#--upload-pack=bad', './missing.tgz']) {
    assert.throws(() => selectAgentSystem(selector, directory), undefined, selector);
  }
  writeFileSync(join(directory, 'plugin.tgz'), 'fixture');
  assert.equal(selectAgentSystem('./plugin.tgz', directory).mode, 'tarball');
  writeFileSync(join(directory, 'package.json'), JSON.stringify({ name: '@tanaab/openclaw-agent-system', version: '0.6.0', packageManager: 'bun@1.4.2', scripts: {build:'build', 'plugin:check':'check'} }));
  writeFileSync(join(directory, 'bun.lock'), '');
  assert.equal(selectAgentSystem('.', directory).bunVersion, '1.4.2');
}));

test('run mode provides helpers, executes multiline commands, preserves failure, and removes its script', () => fixture(directory => {
  const env = environment(directory);
  env.HARNESS_MODE = 'run';
  env.PATH = `${join(root, 'scripts')}:${process.env.PATH}`;
  env.SETUP_RUN = 'command -v openclaw-setup\nprintf "%s\\n" "$OPENCLAW_PROFILE"\nexit 23';
  const result = spawnSync('bash', ['-eo', 'pipefail', '-c', shellBlock('orchestrate')], { env, encoding: 'utf8' });
  assert.equal(result.status, 23, result.stderr);
  assert.match(result.stdout, /openclaw-setup\ncontract/);
  assert.equal(execFileSync('find', [directory, '-name', 'openclaw-run.*'], { encoding: 'utf8' }), '');
}));

test('action setup emits boolean inputs as bare helper switches', () => fixture(directory => {
  const env = environment(directory);
  const bin = join(directory, 'bin');
  mkdirSync(bin);
  writeFileSync(join(bin, 'openclaw-setup'), '#!/usr/bin/env bash\nprintf \'%s\\n\' "$@" > "$CALLS"\n', { mode: 0o755 });
  Object.assign(env, {
    CALLS: join(directory, 'calls'), HARNESS_MODE: 'setup',
    SETUP_NEEDS_SECRET_SERVICE: 'true', SETUP_NEEDS_SSH_KEY: 'true', SETUP_YOLO: 'true',
    PATH: `${bin}:${process.env.PATH}`,
  });
  const result = spawnSync('bash', ['-eo', 'pipefail', '-c', shellBlock('orchestrate')], { env, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(readFileSync(env.CALLS, 'utf8').trim().split('\n'), [
    '--needs-secret-service', '--needs-ssh-key', '--yolo',
  ]);
}));

test('action setup and direct helper use the same model, plugin, cache, SSH and policy contract', () => fixture(directory => {
  const env = environment(directory);
  mockOpenclaw(directory, env);
  mkdirSync(join(directory, 'package'));
  writeFileSync(join(directory, 'package/package.json'), JSON.stringify({name:'@tanaab/openclaw-agent-system',version:'0.6.0'}));
  const artifact = join(directory, 'plugin.tgz');
  execFileSync('tar', ['-czf', artifact, '-C', directory, 'package']);
  Object.assign(env, { TEST_ARTIFACT: artifact, OPENAI_API_KEY: 'sentinel-credential-never-print',
    SETUP_MODEL: 'openai/gpt-5.4-nano', SETUP_AGENT_SYSTEM: artifact,
    SETUP_NEEDS_SSH_KEY: 'true', SETUP_YOLO: 'true', HARNESS_MODE: 'setup' });
  env.PATH = `${join(root, 'scripts')}:${env.PATH}`;
  const result = spawnSync('bash', ['-eo', 'pipefail', '-c', shellBlock('orchestrate')], { env, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const calls = readFileSync(env.CALLS, 'utf8');
  assert.equal(calls.split('\n').filter(line => line.includes('"validate"')).length, 1);
  for (const expected of ['openai-api-key', 'openai/gpt-5.4-nano', 'codexDynamicToolsLoading', 'npm-pack:', '--accept-capabilities', 'allowConversationAccess', 'opCache', 'process-lifetime', 'exec-policy', 'yolo']) assert.ok(calls.includes(expected), expected);
  assert.ok(!result.stdout.includes(env.OPENAI_API_KEY) && !result.stderr.includes(env.OPENAI_API_KEY));
  const key = join(env.HOME, '.ssh/big-test-bucket-ssh');
  assert.equal(statSync(key).mode & 0o777, 0o600);
  assert.equal(statSync(`${key}.pub`).mode & 0o777, 0o644);
  const exported = readFileSync(env.GITHUB_ENV, 'utf8');
  assert.match(exported, /AGENT_SYSTEM_VERSION=0.6.0/);
  assert.match(exported, /OPENCLAW_PROFILE=contract/);
  assert.ok(!exported.includes('BEGIN OPENSSH') && !exported.includes(env.OPENAI_API_KEY));
  const again = spawnSync('bash', [join(root, 'scripts/openclaw-setup'), '--needs-ssh-key'], { env, encoding:'utf8' });
  assert.notEqual(again.status, 0);
  assert.match(again.stderr, /already exists/);
  assert.ok(existsSync(key));
  const moved = spawnSync('bash', [join(root, 'scripts/openclaw-setup'), '--workspace', join(directory, 'scenario-workspace')], { env, encoding:'utf8' });
  assert.equal(moved.status, 0, moved.stderr);
  const diagnostics = spawnSync('bash', [join(root, 'scripts/openclaw-diagnostics')], { env, encoding:'utf8' });
  assert.equal(diagnostics.status, 0, diagnostics.stderr);
  assert.match(diagnostics.stderr, /configuration: valid/);
}));

test('invalid helper flags fail before onboarding; failure diagnostics redact raw credentials', () => fixture(directory => {
  const env = environment(directory);
  mockOpenclaw(directory, env);
  for (const args of [['--yolo', 'yes'], ['--agent-system', 'latest'], ['--op-cache', '{}']]) {
    const result = spawnSync('bash', [join(root, 'scripts/openclaw-setup'), ...args], { env, encoding:'utf8' });
    assert.notEqual(result.status, 0);
    assert.equal(existsSync(env.CALLS), false);
    assert.equal(existsSync(join(directory, 'state')), false);
  }
  env.OPENAI_API_KEY = 'raw-credential-sentinel';
  env.FAIL_VALIDATE = 'true';
  const result = spawnSync('bash', [join(root, 'scripts/openclaw-setup'), '--debug'], { env, encoding:'utf8' });
  assert.equal(result.status, 17);
  assert.match(result.stderr, /REDACTED/);
  assert.ok(!result.stderr.includes(env.OPENAI_API_KEY));
}));

test('action defaults establish a valid isolated context before run commands', () => fixture(directory => {
  const env = environment(directory);
  const result = spawnSync('bash', ['-eo', 'pipefail', '-c', shellBlock('context')], { env, encoding:'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const outputs = Object.fromEntries(readFileSync(env.GITHUB_OUTPUT, 'utf8').trim().split('\n').map(line => line.split(/=(.*)/s).slice(0, 2)));
  assert.match(outputs.profile, /^[A-Za-z0-9][A-Za-z0-9_-]*$/);
  assert.ok(outputs['state-dir'].startsWith(directory));
  assert.equal(outputs['config-path'], `${outputs['state-dir']}/openclaw/openclaw.json`);
  assert.equal(existsSync(outputs['config-path']), false);
  const exported = readFileSync(env.GITHUB_ENV, 'utf8');
  assert.match(exported, /DBUS_SESSION_BUS_ADDRESS=unix:path=/);
}));

// Runtime inspection supplies readiness and the plugin-path output, not a schema audit.
test('runtime inspection requires loading and output path without internal layout assumptions', () => {
  const report = { plugin: { id: 'agent-system', enabled: true, status: 'loaded', version: '0.6.0' },
    install: { installPath: '/plugin' } };
  const inspect = value => spawnSync(process.execPath, [join(root, 'scripts/lib/verify-runtime.mjs'), '0.6.0'], {
    input: JSON.stringify(value), encoding: 'utf8',
  });
  const result = inspect(report);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '/plugin\n');
  for (const change of [{ status: 'error' }, { enabled: false }, { version: '0.5.0' }, { id: 'other' }]) {
    assert.notEqual(inspect({ ...report, plugin: { ...report.plugin, ...change } }).status, 0);
  }
  assert.notEqual(inspect({ ...report, install: {} }).status, 0);
});
