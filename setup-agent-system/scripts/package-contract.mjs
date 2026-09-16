#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const packageName = '@tanaab/openclaw-agent-system';
const exactVersionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(2);
}

function readManifest(manifestPath) {
  let parsed;

  try {
    parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    fail(`cannot read package manifest ${manifestPath}: ${error.message}`);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    fail(`package manifest must contain a JSON object: ${manifestPath}`);
  }
  return parsed;
}

function requireExactVersion(version, label) {
  if (typeof version !== 'string' || !exactVersionPattern.test(version)) {
    fail(`${label} must be an exact semantic version: ${version || '(empty)'}`);
  }
  return version;
}

const [mode, value, expectedVersion = ''] = process.argv.slice(2);

if (mode === 'version') {
  process.stdout.write(`${requireExactVersion(value, 'version')}\n`);
  process.exit(0);
}

if (mode !== 'source' && mode !== 'packed') {
  fail('usage: package-contract.mjs <version|source|packed> <value> [expected-version]');
}

const manifestPath = mode === 'source' ? path.join(value, 'package.json') : value;
const manifest = readManifest(manifestPath);

if (manifest.name !== packageName) {
  fail(`package name must be ${packageName}: ${manifest.name || '(missing)'}`);
}

const version = requireExactVersion(manifest.version, 'package version');
if (expectedVersion && version !== expectedVersion) {
  fail(`packed version ${version} does not match selected version ${expectedVersion}`);
}

if (mode === 'source') {
  const packageManager = manifest.packageManager;
  if (typeof packageManager !== 'string' || !packageManager.startsWith('bun@')) {
    fail('source packageManager must select an exact Bun version');
  }
  const bunVersion = requireExactVersion(packageManager.slice(4), 'Bun version');
  for (const script of ['build', 'plugin:check']) {
    if (typeof manifest.scripts?.[script] !== 'string' || !manifest.scripts[script]) {
      fail(`source package must define scripts.${script}`);
    }
  }
  if (!fs.existsSync(path.join(value, 'bun.lock'))) {
    fail('source package must include bun.lock for frozen dependency installation');
  }
  process.stdout.write(`${version}\n${bunVersion}\n`);
} else {
  process.stdout.write(`${version}\n`);
}
