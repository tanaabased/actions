import { execFileSync, spawnSync } from 'node:child_process';
import { appendFileSync, cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exactVersion, selectAgentSystem } from './setup-inputs.mjs';

const library = dirname(fileURLToPath(import.meta.url));
const [operation, selector, selectionFile] = process.argv.slice(2);
const verbose = process.env.SETUP_OPENCLAW_DEBUG === 'true';
const loglevel = verbose ? 'verbose' : 'error';
const temporary = [];
let artifactDirectory;
let succeeded = false;

function command(program, args, options = {}) {
  try {
    const result = spawnSync(program, args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
      stdio: ['pipe', 'pipe', 'pipe'], ...options });
    if (result.error || result.status !== 0) throw Object.assign(result.error || new Error('command failed'), result);
    if (verbose && result.stderr) {
      const report = execFileSync(process.execPath, [join(library, 'redact-stream.mjs')], { input: result.stderr, encoding: 'utf8' });
      console.error(report.split('\n').slice(-20).join('\n'));
    }
    return result.stdout.trim();
  } catch (error) {
    const report = execFileSync(process.execPath, [join(library, 'redact-stream.mjs')], {
      input: String(error.stderr || error.stdout || error.message), encoding: 'utf8',
    });
    console.error(report.split('\n').slice(-20).join('\n'));
    throw Object.assign(new Error(`${program} failed (${error.status ?? 'launch error'})`), { exitCode: error.status || 1 });
  }
}

function prepare() {
  let selection = selectAgentSystem(selector);
  if (selection.mode === 'repository') {
    const checkout = mkdtempSync(join(process.env.RUNNER_TEMP, 'openclaw-source.'));
    temporary.push(checkout);
    command('git', ['init', '--quiet', checkout]);
    command('git', ['-C', checkout, 'fetch', '--quiet', '--depth=1', `https://github.com/${selection.repository}.git`, selection.ref]);
    command('git', ['-C', checkout, 'checkout', '--quiet', '--detach', 'FETCH_HEAD']);
    const commit = command('git', ['-C', checkout, 'rev-parse', 'HEAD']);
    const provenance = `github:${selection.repository}#${commit}`;
    selection = { ...selectAgentSystem(checkout), source: provenance, checkout };
  }
  selection.selector = selector;
  writeFileSync(selectionFile, JSON.stringify(selection), { mode: 0o600 });
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `selection-file=${selectionFile}\nbun-version=${selection.bunVersion || ''}\n`);
  }
  // The installation phase owns a prepared repository checkout from here onward.
  temporary.length = 0;
}

function install() {
  const selection = JSON.parse(readFileSync(selectionFile, 'utf8'));
  if (selection.selector !== selector || selection.mode === 'none') throw new Error('Agent System selection does not match the requested selector');
  if (selection.checkout) temporary.push(selection.checkout);
  let artifact = selection.path;
  if (selection.mode !== 'tarball') {
    artifactDirectory = mkdtempSync(join(process.env.RUNNER_TEMP, 'openclaw-artifact.'));
    let packageSource = `@tanaab/openclaw-agent-system@${selection.version}`;
    let cwd;
    if (selection.mode === 'source') {
      const bunVersion = command('bun', ['--version']);
      if (bunVersion !== selection.bunVersion) throw new Error(`source requires Bun ${selection.bunVersion}; use setup-bun with that version before invoking the helper`);
      cwd = mkdtempSync(join(process.env.RUNNER_TEMP, 'openclaw-build.'));
      temporary.push(cwd);
      cpSync(selection.path, cwd, {
        recursive: true,
        filter: path => !['.git', 'node_modules', 'dist'].includes(basename(path)),
      });
      command('bun', ['install', '--frozen-lockfile', '--ignore-scripts', ...(verbose ? ['--verbose'] : [])], { cwd });
      command('bun', ['run', 'build'], { cwd });
      command('bun', ['run', 'plugin:check'], { cwd });
      packageSource = '.';
    }
    const archive = command('npm', ['pack', '--json', '--loglevel', loglevel, '--pack-destination', artifactDirectory, packageSource], { cwd });
    const packs = JSON.parse(archive);
    if (packs.length !== 1 || basename(packs[0].filename) !== packs[0].filename) throw new Error('npm pack must produce one archive');
    artifact = join(artifactDirectory, packs[0].filename);
  }
  const manifest = JSON.parse(command('tar', ['-xOf', artifact, 'package/package.json']));
  if (manifest.name !== '@tanaab/openclaw-agent-system' || !exactVersion.test(manifest.version || '') ||
      (selection.version && selection.version !== manifest.version)) throw new Error('packed Agent System identity or version does not match the selection');
  const openclaw = (...args) => command('openclaw', ['--profile', process.env.OPENCLAW_PROFILE, ...args]);
  openclaw('plugins', 'install', `npm-pack:${artifact}`, '--force', '--accept-capabilities');
  openclaw('plugins', 'enable', 'agent-system');
  openclaw('config', 'set', 'plugins.entries.agent-system.hooks.allowConversationAccess', 'true');
  openclaw('config', 'set', 'plugins.entries.agent-system.config.opCache',
    process.env.SETUP_OP_CACHE || '{"mode":"process-lifetime","maxEntries":128}', '--strict-json');
  // Installation does not establish runtime loading; inspect it and obtain the output path.
  const pluginPath = command(process.execPath, [join(library, 'verify-runtime.mjs'), manifest.version], {
    input: openclaw('plugins', 'inspect', 'agent-system', '--runtime', '--json'),
  });
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
  if (operation === 'prepare') prepare();
  else if (operation === 'install') install();
  else if (operation === 'cleanup') {
    const contents = readFileSync(selectionFile, 'utf8');
    const selection = contents ? JSON.parse(contents) : {};
    if (selection.checkout) temporary.push(selection.checkout);
    rmSync(selectionFile);
  } else throw new Error('expected prepare, install, or cleanup');
  succeeded = true;
} catch (error) {
  console.error(`error: ${error.message}`);
  process.exitCode = error.exitCode || 1;
} finally {
  for (const path of temporary) rmSync(path, { recursive: true, force: true });
  if (artifactDirectory && !succeeded) rmSync(artifactDirectory, { recursive: true, force: true });
}
