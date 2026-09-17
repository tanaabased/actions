#!/usr/bin/env node

import fs from 'node:fs';

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

let report;
try {
  report = JSON.parse(fs.readFileSync(0, 'utf8'));
} catch (error) {
  fail(`runtime command did not return valid JSON: ${error.message}`);
}

const [expectedVersion] = process.argv.slice(2);
if (!expectedVersion || process.argv.length !== 3) {
  fail('usage: verify-runtime.mjs <expected-version>');
}

const plugin = report.plugin ?? {};
const install = report.install ?? {};
// Inspect reports runtime state; command success alone does not mean the plugin loaded.
const valid =
  plugin.id === 'agent-system' &&
  plugin.enabled === true &&
  plugin.status === 'loaded' &&
  plugin.version === expectedVersion &&
  typeof install.installPath === 'string' &&
  install.installPath.length > 0;

if (!valid) {
  fail('Agent System runtime is not loaded at the requested version or has no install path');
}

process.stdout.write(`${install.installPath}\n`);
