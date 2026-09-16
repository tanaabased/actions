import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const [versionInput = '', packageJsonPath = '', packageField = ''] = process.argv.slice(2);

function fail(message) {
  process.stderr.write(`error: ${message}\n`);
  process.exit(1);
}

function packageVersionSpec(path, field) {
  if (!path) fail('package-json must not be empty when version is omitted');
  if (!field) fail('package-field must not be empty when version is omitted');

  let packageJson;
  try {
    packageJson = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    fail(`cannot read valid JSON from ${path}: ${error.message}`);
  }

  const segments = field.split('.');
  if (segments.some(segment => !segment || ['__proto__', 'constructor', 'prototype'].includes(segment))) {
    fail(`package-field is invalid: ${field}`);
  }

  let value = packageJson;
  for (const segment of segments) {
    if (value === null || typeof value !== 'object' || !Object.hasOwn(value, segment)) {
      fail(`package.json field is missing: ${field}`);
    }
    value = value[segment];
  }

  if (typeof value !== 'string' || !value.trim()) {
    fail(`package.json field must contain a non-empty string: ${field}`);
  }
  return value.trim();
}

function npmView(spec, field) {
  try {
    const output = execFileSync('npm', ['view', `openclaw@${spec}`, field, '--json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return JSON.parse(output);
  } catch (error) {
    const detail = String(error.stderr ?? error.message).trim().split('\n').at(-1);
    fail(`npm could not resolve openclaw@${spec}${detail ? `: ${detail}` : ''}`);
  }
}

const requestedSpec = versionInput.trim() || packageVersionSpec(packageJsonPath, packageField);
const semverCharacters = /^[0-9A-Za-z*<>=~^|._+\-\s]+$/;
const semverStart = /^\s*(?:[<>=~^]+\s*)?(?:v?\d|[xX*])/;
if (
  !semverCharacters.test(requestedSpec) ||
  !semverStart.test(requestedSpec) ||
  /^[xX*]\s*$/.test(requestedSpec)
) {
  fail(`OpenClaw version must be an exact semantic version or range, not a tag or URL: ${requestedSpec}`);
}

const versionResult = npmView(requestedSpec, 'version');
const candidates = Array.isArray(versionResult) ? versionResult : [versionResult];
const resolvedVersion = candidates.at(-1);
if (typeof resolvedVersion !== 'string' || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(resolvedVersion)) {
  fail(`npm returned no exact OpenClaw version for: ${requestedSpec}`);
}

const nodeRange = npmView(resolvedVersion, 'engines.node');
if (typeof nodeRange !== 'string' || !nodeRange.trim()) {
  fail(`openclaw@${resolvedVersion} does not declare engines.node`);
}

process.stdout.write(`${resolvedVersion}\n${nodeRange.trim()}\n`);
