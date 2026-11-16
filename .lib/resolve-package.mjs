import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

function fieldValue(manifest, field, required = true) {
  const segments = field.split('.');
  if (
    segments.some(
      (segment) => !segment || ['__proto__', 'constructor', 'prototype'].includes(segment),
    )
  ) {
    throw new Error(`package-field is invalid: ${field}`);
  }
  let value = manifest;
  for (const segment of segments) {
    if (value === null || typeof value !== 'object' || !Object.hasOwn(value, segment)) {
      if (required) throw new Error(`package.json field is missing: ${field}`);
      return undefined;
    }
    value = value[segment];
  }
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`package.json field must contain a non-empty string: ${field}`);
  }
  return value.trim();
}

export function selectPackageSpec(name, requested, manifest, field = '') {
  const input = requested.trim() || 'auto';
  if (input !== 'auto') return validateSpec(input);
  if (manifest === undefined && !field.trim()) return 'latest';
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new Error('package.json must contain an object');
  }
  if (field.trim()) return validateSpec(fieldValue(manifest, field.trim()));
  const fields = [`devDependencies.${name}`, `dependencies.${name}`];
  const [development, runtime] = fields.map((candidate) => fieldValue(manifest, candidate, false));
  if (development && runtime && development !== runtime) {
    throw new Error(`package.json declares conflicting ${name} versions`);
  }
  return validateSpec(development ?? runtime ?? 'latest');
}

export function resolvePackageSpec(name, requested, path, field = '') {
  const input = requested.trim() || 'auto';
  if (input !== 'auto') return selectPackageSpec(name, input);
  if (!path) throw new Error('package-json must not be empty when version is auto');
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT' && !field.trim()) return selectPackageSpec(name, input);
    throw new Error(`cannot read package.json: ${path}`, { cause: error });
  }
  let manifest;
  try {
    manifest = JSON.parse(text);
  } catch {
    throw new Error(`cannot read valid JSON from ${path}`);
  }
  return selectPackageSpec(name, input, manifest, field);
}

function validateSpec(spec) {
  const characters = /^[0-9A-Za-z*<>=~^|._+\-\s]+$/;
  const start = /^\s*(?:[<>=~^]+\s*)?(?:v?\d|[xX*])/;
  if (
    spec !== 'latest' &&
    (!characters.test(spec) || !start.test(spec) || /^[xX*]\s*$/.test(spec))
  ) {
    throw new Error('version must be an exact semantic version, range, or latest');
  }
  return spec;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.stdout.write(`${resolvePackageSpec(...process.argv.slice(2))}\n`);
  } catch (error) {
    console.error(`error: ${error.message}`);
    process.exitCode = 1;
  }
}
