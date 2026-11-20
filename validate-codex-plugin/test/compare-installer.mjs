#!/usr/bin/env bun

import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const fixtures = join(import.meta.dirname, 'fixture');
const validator = resolve(import.meta.dirname, '../scripts/validate-plugin.mjs');
const cases = [
  ['valid', 'valid', true, true],
  ['portable', 'portable', true, true],
  ['fallback', 'fallback', true, true],
  ['malformed', 'malformed', false, false],
  ['invalid', 'invalid', false, false],
  ['invalid-version', 'invalid-version', false, false],
  ['invalid-portable', 'invalid-portable', false, false],
  ['invalid-overlay', 'invalid-overlay', false, false],
  // Marketplace name agreement is outside directory-only validation.
  ['valid', 'different-name', true, false],
  ['no-manifest', 'no-manifest', true, true],
];

function run(command, args, options) {
  const result = spawnSync(command, args, { encoding: 'utf8', timeout: 30_000, ...options });
  if (result.error) throw result.error;
  if (result.signal) throw new Error(command + ' terminated with ' + result.signal);
  return result;
}

function expectResult(result, expected, label) {
  if ((result.status === 0) !== expected) {
    throw new Error(
      label + ': unexpected exit status ' + result.status + '\n' + result.stdout + result.stderr,
    );
  }
}

function compare(codex, fixture, name, validatorOk, installOk) {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'codex-fixture-'));
  try {
    const root = realpathSync(temporaryDirectory);
    const home = join(root, 'home');
    const codexHome = join(home, '.codex');
    mkdirSync(codexHome, { recursive: true });
    const options = {
      cwd: root,
      env: { HOME: home, CODEX_HOME: codexHome, PATH: process.env.PATH },
    };
    const plugin = join(root, 'plugins', fixture);
    if (fixture === 'no-manifest') {
      mkdirSync(plugin, { recursive: true });
    } else {
      cpSync(join(fixtures, fixture), plugin, { recursive: true });
    }
    const catalogDirectory = join(root, '.agents', 'plugins');
    mkdirSync(catalogDirectory, { recursive: true });
    writeFileSync(
      join(catalogDirectory, 'marketplace.json'),
      JSON.stringify({
        name: 'validation-fixtures',
        plugins: [
          {
            name,
            source: './plugins/' + fixture,
            policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' },
            category: 'Other',
          },
        ],
      }),
    );

    const label = fixture + ' (' + name + ')';
    expectResult(
      run(codex, ['plugin', 'marketplace', 'add', root], options),
      true,
      label + ' marketplace setup',
    );
    expectResult(
      run(process.execPath, [validator, plugin], options),
      validatorOk,
      label + ' validator',
    );
    expectResult(
      run(codex, ['plugin', 'add', name + '@validation-fixtures'], options),
      installOk,
      label + ' Codex install',
    );
    console.log(label + ': validator=' + validatorOk + ', install=' + installOk);
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

try {
  if (!process.argv[2]) throw new Error('Usage: bun compare-installer.mjs /path/to/codex');
  const codex = resolve(process.argv[2]);
  const result = run(codex, ['--version'], { env: { PATH: process.env.PATH } });
  expectResult(result, true, 'Codex version');
  const version = result.stdout.trim();
  if (version !== 'codex-cli 0.170.0') {
    throw new Error('Expected codex-cli 0.170.0; got ' + version);
  }
  console.log(version);
  for (const fixture of cases) compare(codex, ...fixture);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
