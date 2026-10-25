import { appendFileSync, cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { command as runCommand, report } from './command.mjs';
import { packFilename } from './pack-result.mjs';
import { exactVersion, selectAgentSystem } from './setup-inputs.mjs';
import { progress, stage } from './setup-progress.mjs';

const library = dirname(fileURLToPath(import.meta.url));
const [operation, selector, selectionFile] = process.argv.slice(2);
const verbose = process.env.SETUP_OPENCLAW_DEBUG === 'true';
const loglevel = verbose ? 'verbose' : 'error';
const temporary = [];
let artifactDirectory;
let succeeded = false;

function command(program, args, options = {}) {
  return runCommand(program, args, { verbose, ...options });
}

async function prepare() {
  progress('start', 'source-resolution', { requested: selector });
  report(`Agent System requested: ${selector}`);
  let selection = selectAgentSystem(selector);
  if (selection.mode === 'repository') {
    const checkout = mkdtempSync(join(process.env.RUNNER_TEMP, 'openclaw-source.'));
    temporary.push(checkout);
    await command('git', ['init', '--quiet', checkout]);
    await command('git', ['-C', checkout, 'fetch', '--quiet', '--depth=1', `https://github.com/${selection.repository}.git`, selection.ref]);
    await command('git', ['-C', checkout, 'checkout', '--quiet', '--detach', 'FETCH_HEAD']);
    const commit = await command('git', ['-C', checkout, 'rev-parse', 'HEAD'], { capture: true });
    const provenance = `github:${selection.repository}#${commit}`;
    progress('start', 'source-resolution', { resolved: provenance });
    report(`Agent System resolved: ${provenance}`);
    selection = { ...selectAgentSystem(checkout), source: provenance, checkout };
  }
  selection.selector = selector;
  progress('complete', 'source-resolution', { requested: selector, resolved: selection.source, version: selection.version });
  report(`Agent System selected: ${selection.source}; version: ${selection.version || 'from artifact'}`);
  writeFileSync(selectionFile, JSON.stringify(selection), { mode: 0o600 });
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `selection-file=${selectionFile}\nbun-version=${selection.bunVersion || ''}\n`);
  }
  // The installation phase owns a prepared repository checkout from here onward.
  temporary.length = 0;
}

async function install() {
  const selection = JSON.parse(readFileSync(selectionFile, 'utf8'));
  if (selection.selector !== selector || selection.mode === 'none') throw new Error('Agent System selection does not match the requested selector');
  if (selection.checkout) temporary.push(selection.checkout);
  progress('start', 'artifact-preparation');
  report(`toolchain: Node ${process.version}; npm ${await command('npm', ['--version'], { capture: true })}`);
  let artifact = selection.path;
  if (selection.mode !== 'tarball') {
    artifactDirectory = mkdtempSync(join(process.env.RUNNER_TEMP, 'openclaw-artifact.'));
    let packageSource = `@tanaab/openclaw-agent-system@${selection.version}`;
    let cwd;
    if (selection.mode === 'source') {
      const bunVersion = await command('bun', ['--version'], { capture: true });
      report(`source Bun: ${bunVersion}`);
      if (bunVersion !== selection.bunVersion) throw new Error(`source requires Bun ${selection.bunVersion}; use setup-bun with that version before invoking the helper`);
      cwd = mkdtempSync(join(process.env.RUNNER_TEMP, 'openclaw-build.'));
      temporary.push(cwd);
      cpSync(selection.path, cwd, {
        recursive: true,
        filter: path => !['.git', 'node_modules', 'dist'].includes(basename(path)),
      });
      await stage('dependencies', () => command('bun', ['install', '--frozen-lockfile', '--ignore-scripts', ...(verbose ? ['--verbose'] : [])], { cwd }));
      await stage('build', () => command('bun', ['run', 'build'], { cwd }));
      await stage('plugin-check', () => command('bun', ['run', 'plugin:check'], { cwd }));
      packageSource = '.';
    }
    artifact = await stage('pack', async () => {
      const archive = await command('npm', ['pack', '--json', '--loglevel', loglevel, '--pack-destination', artifactDirectory, packageSource], { cwd, capture: true });
      return join(artifactDirectory, packFilename(archive));
    });
  }
  progress('start', 'artifact-verification');
  const manifest = JSON.parse(await command('tar', ['-xOf', artifact, 'package/package.json'], { capture: true }));
  if (manifest.name !== '@tanaab/openclaw-agent-system' || !exactVersion.test(manifest.version || '') ||
      (selection.version && selection.version !== manifest.version)) throw new Error('packed Agent System identity or version does not match the selection');
  progress('complete', 'artifact-verification');
  const openclaw = (...args) => command('openclaw', ['--profile', process.env.OPENCLAW_PROFILE, ...args]);
  await stage('plugin-installation', () => openclaw('plugins', 'install', `npm-pack:${artifact}`, '--force', '--accept-capabilities'));
  progress('start', 'plugin-configuration');
  await openclaw('plugins', 'enable', 'agent-system');
  await openclaw('config', 'set', 'plugins.entries.agent-system.hooks.allowConversationAccess', 'true');
  await openclaw('config', 'set', 'plugins.entries.agent-system.config.opCache',
    process.env.SETUP_OP_CACHE || '{"mode":"process-lifetime","maxEntries":128}', '--strict-json');
  progress('complete', 'plugin-configuration');
  // Installation does not establish runtime loading; inspect it and obtain the output path.
  const pluginPath = await stage('runtime-verification', async () => command(process.execPath, [join(library, 'verify-runtime.mjs'), manifest.version], {
    capture: true,
    input: await command('openclaw', ['--profile', process.env.OPENCLAW_PROFILE, 'plugins', 'inspect', 'agent-system', '--runtime', '--json'], { capture: true }),
  }));
  const outputs = { 'agent-system-version': manifest.version, 'agent-system-source': selection.source,
    'agent-system-artifact-path': artifact, 'agent-system-plugin-path': pluginPath };
  for (const [key, value] of Object.entries(outputs)) {
    if (/[\r\n\0]/.test(value)) throw new Error('Agent System output must be a single-line value');
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
    appendFileSync(process.env.GITHUB_ENV, `${key.replaceAll('-', '_').toUpperCase()}=${value}\n`);
  }
  console.log(`Installed and verified Agent System ${manifest.version}`);
}

try {
  if (operation === 'prepare') await prepare();
  else if (operation === 'install') await install();
  else if (operation === 'cleanup') {
    const contents = readFileSync(selectionFile, 'utf8');
    const selection = contents ? JSON.parse(contents) : {};
    if (selection.checkout) temporary.push(selection.checkout);
    rmSync(selectionFile);
  } else throw new Error('expected prepare, install, or cleanup');
  succeeded = true;
} catch (error) {
  report(`error: ${error.message}`);
  process.exitCode = error.exitCode || 1;
} finally {
  for (const path of temporary) rmSync(path, { recursive: true, force: true });
  if (artifactDirectory && !succeeded) rmSync(artifactDirectory, { recursive: true, force: true });
}
