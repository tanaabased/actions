import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

function selection(version, source) {
  if (typeof version !== 'string' || !version.trim() || /[\r\n\0]/.test(version.trim())) {
    throw new Error(`Runtime version in ${source} must be a nonempty single-line string`);
  }
  return { version: version.trim(), source };
}

export function resolveRuntime(runtime, requested, directory) {
  if (!['node', 'bun'].includes(runtime)) throw new Error('Runtime must be node or bun');
  if (requested !== 'auto') return selection(requested, 'input');
  const root = resolve(process.env.GITHUB_WORKSPACE || process.cwd(), directory);
  if (!existsSync(root) || !statSync(root).isDirectory()) throw new Error('Runtime project directory does not exist');
  const files = runtime === 'node' ? ['.node-version', '.nvmrc'] : ['.bun-version'];
  for (const file of files) {
    if (existsSync(resolve(root, file))) return selection(readFileSync(resolve(root, file), 'utf8'), file);
  }
  const toolFile = resolve(root, '.tool-versions');
  if (existsSync(toolFile)) {
    const tool = runtime === 'node' ? 'nodejs' : 'bun';
    const line = readFileSync(toolFile, 'utf8').split(/\r?\n/)
      .find((value) => new RegExp(`^\\s*${tool}(?:\\s|$)`).test(value));
    if (line !== undefined) return selection(line.trim().slice(tool.length).trim(), '.tool-versions');
  }
  const packageFile = resolve(root, 'package.json');
  if (existsSync(packageFile)) {
    let manifest;
    try { manifest = JSON.parse(readFileSync(packageFile, 'utf8')); }
    catch { throw new Error('Cannot read valid package.json for runtime selection'); }
    if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
      throw new Error('package.json must contain an object');
    }
    if (runtime === 'bun' && manifest.packageManager !== undefined) {
      if (typeof manifest.packageManager !== 'string') throw new Error('packageManager must be a string');
      if (manifest.packageManager.startsWith('bun@')) {
        return selection(manifest.packageManager.slice(4).split('+')[0], 'package.json#packageManager');
      }
    }
    if (manifest.engines?.[runtime] !== undefined) {
      return selection(manifest.engines[runtime], `package.json#engines.${runtime}`);
    }
  }
  return selection(runtime === 'node' ? '26.x' : '1.4.x', 'fallback');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = resolveRuntime(process.env.RUNTIME, process.env.RUNTIME_VERSION, process.env.PROJECT_DIRECTORY);
    process.stdout.write(`version=${result.version}\nsource=${result.source}\n`);
    if (process.env.ACTION_DEBUG === 'true') console.error(`Runtime selected from ${result.source}`);
  } catch (error) {
    console.error(`::error::${error.message}`);
    process.exitCode = 1;
  }
}
