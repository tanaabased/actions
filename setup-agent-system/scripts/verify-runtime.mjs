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

const [mode, expectedVersion, expectedArtifact] = process.argv.slice(2);

if (mode === 'config') {
  if (report.valid !== true) {
    fail('OpenClaw configuration is invalid');
  }
  process.exit(0);
}

if (mode !== 'plugin' || !expectedVersion || !expectedArtifact) {
  fail('usage: verify-runtime.mjs <config|plugin> [expected-version] [expected-artifact]');
}

const plugin = report.plugin ?? {};
const install = report.install ?? {};
const diagnostics = Array.isArray(report.diagnostics) ? report.diagnostics : [];
const typedHooks = Array.isArray(report.typedHooks) ? report.typedHooks : [];

const valid =
  plugin.id === 'agent-system' &&
  plugin.enabled === true &&
  plugin.status === 'loaded' &&
  typeof plugin.source === 'string' &&
  plugin.source.endsWith('/dist/index.js') &&
  plugin.error == null &&
  plugin.version === expectedVersion &&
  install.source === 'npm' &&
  install.artifactKind === 'npm-pack' &&
  install.artifactFormat === 'tgz' &&
  install.sourcePath === expectedArtifact &&
  typeof install.installPath === 'string' &&
  install.installPath.length > 0 &&
  install.version === expectedVersion &&
  report.policy?.allowConversationAccess === true &&
  typedHooks.some((hook) => hook?.name === 'before_prompt_build') &&
  diagnostics.every((diagnostic) => diagnostic?.level !== 'error');

if (!valid) {
  fail('Agent System runtime inspection did not match the installed artifact');
}

process.stdout.write(`${install.installPath}\n`);
