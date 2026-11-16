import { execFileSync } from 'node:child_process';

import { resolvePackageSpec } from '../../../.lib/resolve-package.mjs';

const [versionInput = '', packageJsonPath = '', packageField = ''] = process.argv.slice(2);

function fail(message) {
  process.stderr.write(`error: ${message}\n`);
  process.exit(1);
}

function npmView(spec, field) {
  try {
    const output = execFileSync('npm', ['view', `openclaw@${spec}`, field, '--json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return JSON.parse(output);
  } catch (error) {
    const detail = String(error.stderr ?? error.message)
      .trim()
      .split('\n')
      .at(-1);
    fail(`npm could not resolve openclaw@${spec}${detail ? `: ${detail}` : ''}`);
  }
}

let requestedSpec;
try {
  requestedSpec = resolvePackageSpec('openclaw', versionInput, packageJsonPath, packageField);
} catch (error) {
  fail(error.message);
}

const versionResult = npmView(requestedSpec, 'version');
const candidates = Array.isArray(versionResult) ? versionResult : [versionResult];
const resolvedVersion = candidates.at(-1);
if (
  typeof resolvedVersion !== 'string' ||
  !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(resolvedVersion)
) {
  fail(`npm returned no exact OpenClaw version for: ${requestedSpec}`);
}

const nodeRange = npmView(resolvedVersion, 'engines.node');
if (typeof nodeRange !== 'string' || !nodeRange.trim()) {
  fail(`openclaw@${resolvedVersion} does not declare engines.node`);
}

process.stdout.write(`${resolvedVersion}\n${nodeRange.trim()}\n`);
