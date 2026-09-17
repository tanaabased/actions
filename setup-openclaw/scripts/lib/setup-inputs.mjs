import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

export const setupInputs = ['profile', 'workspace', 'state-dir', 'model', 'agent-system',
  'needs-secret-service', 'needs-ssh-key', 'op-cache', 'yolo'];
export const exactVersion = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

export function selectAgentSystem(selector, directory = process.env.GITHUB_WORKSPACE || process.cwd()) {
  if (!selector) return { mode: 'none' };
  if (/[\r\n\0]/.test(selector)) throw new Error('agent-system must be a single-line selector');
  if (exactVersion.test(selector)) return { mode: 'published', version: selector, source: `npm:@tanaab/openclaw-agent-system@${selector}` };
  const repository = /^github:([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)#([^\s~^:?*\[\\]+)$/.exec(selector);
  if (repository) {
    if (repository[2].startsWith('-') || repository[2].includes('..')) throw new Error('invalid Agent System repository ref');
    return { mode: 'repository', repository: repository[1], ref: repository[2] };
  }
  if (!/^(?:file:|\/|\.\.?\/)/.test(selector) && selector !== '.') {
    throw new Error('agent-system must be an exact version, explicit local path, or github:owner/repo#ref');
  }
  const suppliedPath = selector.replace(/^file:/, '');
  if (!suppliedPath || !existsSync(resolve(directory, suppliedPath))) throw new Error('Agent System local path does not exist');
  const path = realpathSync(resolve(directory, suppliedPath));
  if (/[\r\n\0]/.test(path)) throw new Error('resolved Agent System path must be a single-line value');
  if (statSync(path).isDirectory()) {
    const manifest = JSON.parse(readFileSync(resolve(path, 'package.json'), 'utf8'));
    if (manifest.name !== '@tanaab/openclaw-agent-system' || !exactVersion.test(manifest.version || '')) {
      throw new Error('source must contain an exact-version @tanaab/openclaw-agent-system package');
    }
    const bunVersion = manifest.packageManager?.replace(/^bun@/, '');
    if (!manifest.packageManager?.startsWith('bun@') || !exactVersion.test(bunVersion || '') ||
        !existsSync(resolve(path, 'bun.lock')) || !manifest.scripts?.build || !manifest.scripts?.['plugin:check']) {
      throw new Error('source requires exact bun@ packageManager, bun.lock, build, and plugin:check');
    }
    return { mode: 'source', path, source: path, version: manifest.version, bunVersion };
  }
  if (!statSync(path).isFile() || !path.endsWith('.tgz')) throw new Error('local Agent System file must be an npm .tgz tarball');
  return { mode: 'tarball', path, source: path };
}

export function validateSetup(values) {
  if (/[\r\n\0]/.test(process.env.DBUS_SESSION_BUS_ADDRESS || '')) throw new Error('D-Bus address must be a single-line value');
  for (const name of setupInputs) {
    if (/[\r\n\0]/.test(values[name] || '')) throw new Error(`${name} must be a single-line value`);
  }
  for (const name of ['needs-secret-service', 'needs-ssh-key', 'yolo']) {
    if (values[name] && !['true', 'false'].includes(values[name])) throw new Error(`${name} must be true or false`);
  }
  if (values.profile && (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(values.profile) || values.profile === 'default')) {
    throw new Error('profile must name an isolated non-default profile');
  }
  for (const name of ['workspace', 'state-dir']) {
    if (values[name] && (!values[name].startsWith('/') || resolve(values[name]) === '/')) throw new Error(`${name} must be an absolute non-root path`);
  }
  if (values.model && (!/^openai\/[^\s]+$/.test(values.model) || !process.env.OPENAI_API_KEY)) {
    throw new Error('model requires an openai/model reference and OPENAI_API_KEY');
  }
  if (values['op-cache']) {
    if (!values['agent-system']) throw new Error('op-cache requires agent-system');
    const cache = JSON.parse(values['op-cache']);
    if (!cache || Array.isArray(cache) || typeof cache !== 'object') throw new Error('op-cache must be a JSON object');
  }
  return selectAgentSystem(values['agent-system']);
}
