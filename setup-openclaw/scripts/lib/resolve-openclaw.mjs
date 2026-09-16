import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const [versionInput = '', packageJsonPath = '', packageField = ''] = process.argv.slice(2);
const automaticFields = ['devDependencies.openclaw', 'dependencies.openclaw'];

function fail(message) {
  process.stderr.write(`error: ${message}\n`);
  process.exit(1);
}

function readPackageJson(path) {
  if (!path) fail('package-json must not be empty when version is auto');
  let packageJson;
  try {
    packageJson = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    fail(`cannot read valid JSON from ${path}: ${error.message}`);
  }

  return packageJson;
}

function packageFieldValue(packageJson, field, required = true) {
  const segments = field.split('.');
  if (segments.some(segment => !segment || ['__proto__', 'constructor', 'prototype'].includes(segment))) {
    fail(`package-field is invalid: ${field}`);
  }

  let value = packageJson;
  for (const segment of segments) {
    if (value === null || typeof value !== 'object' || !Object.hasOwn(value, segment)) {
      if (required) fail(`package.json field is missing: ${field}`);
      return undefined;
    }
    value = value[segment];
  }

  if (typeof value !== 'string' || !value.trim()) {
    fail(`package.json field must contain a non-empty string: ${field}`);
  }
  return value.trim();
}

function packageVersionSpec(path, field) {
  const packageJson = readPackageJson(path);
  const selectedField = field.trim();
  if (selectedField) return packageFieldValue(packageJson, selectedField);

  const [developmentSpec, runtimeSpec] = automaticFields.map(candidate =>
    packageFieldValue(packageJson, candidate, false),
  );
  if (developmentSpec && runtimeSpec && developmentSpec !== runtimeSpec) {
    fail(
      `package.json declares conflicting OpenClaw versions: ${automaticFields[0]}=${developmentSpec} and ${automaticFields[1]}=${runtimeSpec}`,
    );
  }
  if (!developmentSpec && !runtimeSpec) {
    fail(
      `package.json does not declare OpenClaw in ${automaticFields.join(' or ')}; provide an explicit version or package-field`,
    );
  }
  return developmentSpec ?? runtimeSpec;
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

const versionSpec = versionInput.trim() || 'auto';
const requestedSpec =
  versionSpec === 'auto' ? packageVersionSpec(packageJsonPath, packageField) : versionSpec;
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
