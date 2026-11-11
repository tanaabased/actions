import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function prepare(overrides = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'secret-service-packages-'));
  try {
    const bin = join(directory, 'bin');
    mkdirSync(bin);
    for (const command of ['dpkg-query', 'sudo', 'timeout', 'getent']) {
      copyFileSync(join(root, 'test/fixture/secret-service-command'), join(bin, command));
      chmodSync(join(bin, command), 0o755);
    }
    const calls = join(directory, 'calls');
    const result = spawnSync('bash', ['-euo', 'pipefail', '-c', `
      command_dir="$TEST_ACTION_ROOT/scripts"
      state_dir="$TEST_STATE_DIR"
      source "$command_dir/lib/openclaw-common.sh"
      source "$command_dir/lib/secret-service-packages.sh"
      configure_debug "$TEST_DEBUG"
      prepare_secret_service_packages
      printf 'packages ready\\n'
    `], { encoding: 'utf8', env: { ...process.env,
      PATH: `${bin}:${process.env.PATH}`, TEST_ACTION_ROOT: root, TEST_STATE_DIR: directory,
      TEST_CALLS: calls, TEST_DEBUG: 'false', TEST_INSTALLED: '', TEST_UPDATE_STATUS: '0',
      TEST_INSTALL_STATUS: '0', TEST_RESOLVER_STATUS: '0', ...overrides,
    } });
    return { ...result, calls: existsSync(calls) ? readFileSync(calls, 'utf8').trim().split('\n') : [] };
  } finally { rmSync(directory, { recursive: true, force: true }); }
}

test('installed packages bypass unavailable package sources', () => {
  const result = prepare({ TEST_INSTALLED: 'dbus-x11 gnome-keyring libsecret-tools', TEST_UPDATE_STATUS: '100' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.calls.length, 0);
  assert.match(result.stdout, /packages ready/);
});

test('missing packages use bounded native acquisition and install only what is missing', () => {
  const result = prepare({ TEST_INSTALLED: 'dbus-x11' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.calls.length, 2);
  assert.match(result.calls[0], /APT::Update::Error-Mode=any update$/);
  for (const call of result.calls) {
    assert.match(call, /Acquire::Retries=[1-3]\b/);
    assert.match(call, /Acquire::http::Timeout=\d+/);
    assert.match(call, /Acquire::https::Timeout=\d+/);
  }
  assert.match(result.calls[1], /install .*gnome-keyring libsecret-tools$/);
  assert.ok(!result.calls[1].includes('dbus-x11'));
});

for (const setting of ['auto', 'true', 'false']) {
  for (const runnerDebug of ['', '1']) {
    test(`package failures preserve status and redact diagnostics (${setting}, runner debug ${runnerDebug || 'off'})`, () => {
      const result = prepare({ TEST_DEBUG: setting, RUNNER_DEBUG: runnerDebug, TEST_UPDATE_STATUS: '100', TEST_RESOLVER_STATUS: '2' });
      assert.equal(result.status, 100, result.stderr);
      assert.equal(result.calls.length, 1);
      assert.match(result.stderr, /package index update failed/);
      assert.match(result.stderr, /resolver diagnostic: github.com/);
      assert.match(result.stderr, /REDACTED/);
      assert.ok(!result.stderr.includes('package-sentinel'));
      assert.ok(!result.stderr.includes('resolver-sentinel'));
      assert.ok(!result.stdout.includes('packages ready'));
    });
  }
}

test('installation failure and root deadline failure cannot become successful preparation', () => {
  for (const status of ['100', '124', '137']) {
    const result = prepare({ TEST_INSTALL_STATUS: status });
    assert.equal(result.status, Number(status), result.stderr);
    assert.equal(result.calls.length, 2);
    assert.match(result.stderr, /package installation failed/);
    assert.ok(!result.stdout.includes('packages ready'));
    assert.ok(!result.stderr.includes('package-sentinel'));
  }
});
