#!/usr/bin/env bun

import { lstatSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { join } from 'node:path';

const agentSchemaPrefix = 'https://agent-plugins.org/schemas/';
const agentSchema = agentSchemaPrefix + '1.0.0/plugin.schema.json';
const compatibilityManifests = [
  '.codex-plugin/plugin.json',
  '.claude-plugin/plugin.json',
  '.cursor-plugin/plugin.json',
];
const compatibilityName = /^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*$/;
const compatibilityVersion = /^[A-Za-z0-9_.+-]+$/;
const agentName = /^[a-z0-9](?:[a-z0-9.-]{0,62}[a-z0-9])?$/;
const utf8 = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function parseManifest(path, contents) {
  let manifest;
  try {
    manifest = JSON.parse(contents);
  } catch {
    throw new Error(path + ': expected valid JSON');
  }
  if (!isObject(manifest)) {
    throw new Error(path + ': expected JSON object');
  }
  return manifest;
}

function readManifest(path) {
  let contents;
  try {
    contents = utf8.decode(readFileSync(path));
  } catch {
    throw new Error(path + ': expected readable UTF-8 JSON');
  }
  return parseManifest(path, contents);
}

function selectManifest(root) {
  // Unrelated root JSON is not an Agent Plugins manifest.
  const portablePath = join(root, 'plugin.json');
  const portableStat = lstatSync(portablePath, { throwIfNoEntry: false });
  if (portableStat) {
    if (!portableStat.isFile()) return;
    let manifest;
    try {
      manifest = readManifest(portablePath);
    } catch {
      // Codex can still look for a compatibility manifest.
    }
    const schema = manifest?.$schema;
    if (typeof schema === 'string' && schema.startsWith(agentSchemaPrefix)) {
      return { path: portablePath, manifest, portable: true };
    }
  }

  for (const relativePath of compatibilityManifests) {
    const parent = lstatSync(join(root, relativePath.split('/')[0]), { throwIfNoEntry: false });
    if (!parent) continue;
    if (!parent.isDirectory()) return;
    const path = join(root, relativePath);
    const entry = lstatSync(path, { throwIfNoEntry: false });
    if (!entry) continue;
    if (!entry.isFile()) return;
    return { path, manifest: readManifest(path), portable: false };
  }
}

function checkCompatibilityTypes(path, { name, version }) {
  if (name !== undefined && typeof name !== 'string') {
    throw new Error(path + ': name must be a string when present');
  }
  if (version != null && typeof version !== 'string') {
    throw new Error(path + ': version must be a string when present');
  }
}

function checkCompatibility(path, manifest) {
  checkCompatibilityTypes(path, manifest);
  const { name, version, $schema } = manifest;
  if (name?.trim() && !compatibilityName.test(name)) {
    throw new Error(path + ': invalid Codex plugin name');
  }
  // Codex encodes recognized Agent Plugins versions that cannot serve as path segments.
  if (version != null && $schema !== agentSchema) {
    const segment = version.trim();
    if (!compatibilityVersion.test(segment) || segment === '.' || segment === '..') {
      throw new Error(path + ': invalid Codex plugin version');
    }
  }
}

function checkPortable(root, path, { $schema, name, version, extensions }) {
  if ($schema !== agentSchema) {
    throw new Error(path + ': unsupported Agent Plugins schema; expected ' + agentSchema);
  }
  if (
    typeof name !== 'string' ||
    !agentName.test(name) ||
    name.includes('--') ||
    name.includes('..')
  ) {
    throw new Error(path + ': invalid Agent Plugins name');
  }
  if (version !== undefined && typeof version !== 'string') {
    throw new Error(path + ': version must be a string when present');
  }

  // Codex reads the compatibility overlay only without an OpenAI extension object.
  if (isObject(extensions) && isObject(extensions['com.openai'])) return;
  const overlay = join(root, compatibilityManifests[0]);
  let contents;
  try {
    if (!statSync(overlay).isFile()) return;
    contents = utf8.decode(readFileSync(overlay));
  } catch {
    return;
  }
  checkCompatibilityTypes(overlay, parseManifest(overlay, contents));
}

function validate(directory) {
  if (!directory || !statSync(directory, { throwIfNoEntry: false })?.isDirectory()) {
    throw new Error('plugin-directory must be a directory');
  }
  const root = realpathSync(directory);
  const selected = selectManifest(root);
  if (!selected) return 'No manifest selected; installation depends on marketplace fallback.';

  const { path, manifest, portable } = selected;
  if (portable) {
    checkPortable(root, path, manifest);
  } else {
    checkCompatibility(path, manifest);
  }
  return 'Manifest checks passed: ' + path;
}

try {
  console.log(validate(process.argv[2]));
} catch (error) {
  console.error('Plugin validation failed: ' + error.message);
  process.exitCode = 1;
}
