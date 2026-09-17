import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export function gitEnvironment(token, server, environment = process.env) {
  assert(token, 'Repository readback requires sync-token');
  const count = environment.GIT_CONFIG_COUNT ?? '0';
  assert(/^(0|[1-9][0-9]*)$/.test(count), 'Invalid Git configuration count');
  const offset = Number(count);
  const key = `http.${new URL(server).origin}/.extraheader`;
  // Reset inherited headers before adding one credential; never change caller config.
  return {
    ...environment,
    GIT_CONFIG_COUNT: String(offset + 2),
    [`GIT_CONFIG_KEY_${offset}`]: key,
    [`GIT_CONFIG_VALUE_${offset}`]: '',
    [`GIT_CONFIG_KEY_${offset + 1}`]: key,
    [`GIT_CONFIG_VALUE_${offset + 1}`]: `AUTHORIZATION: basic ${Buffer.from(`x-access-token:${token}`).toString('base64')}`,
  };
}

export function verifyPublication({ root, version, branch, tags, token, server = 'https://github.com' }, run = (args) =>
  execFileSync('git', args, {
    cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    env: gitEnvironment(token, server),
  }).trim()) {
  const refs = [`refs/heads/${branch.replace(/^refs\/heads\//, '')}`,
    ...new Set([version, ...tags.split(/\r?\n/).map((tag) => tag.trim()).filter(Boolean)]
      .map((tag) => `refs/tags/${tag}`))];
  for (const ref of refs) run(['check-ref-format', ref]);
  const commit = run(['rev-parse', 'HEAD^{commit}']);
  let listing;
  try {
    listing = run(['ls-remote', 'origin', ...refs, ...refs.slice(1).map((ref) => `${ref}^{}`)]);
  } catch (error) {
    const status = Number.isInteger(error.status) ? ` (git exit ${error.status})` : '';
    throw new Error(`Could not read published branch and tags from origin${status}`);
  }
  const remote = new Map(listing.split('\n').filter(Boolean).map((line) => {
    const [sha, ref] = line.split(/\s+/);
    return [ref, sha];
  }));
  for (const ref of refs) {
    assert.equal(remote.get(`${ref}^{}`) ?? remote.get(ref), commit,
      `Published ${ref} does not select the prepared commit`);
  }
  const manifest = JSON.parse(run(['show', `${commit}:package.json`]));
  assert.equal(manifest.version, version.replace(/^v/, ''), 'Published package version differs');
  console.log(`Verified ${refs.join(', ')} at ${commit}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  verifyPublication({
    root: process.env.REPOSITORY_ROOT,
    version: process.env.RESOLVED_VERSION,
    branch: process.env.SYNC_BRANCH,
    tags: process.env.SYNC_TAGS,
    token: process.env.SYNC_TOKEN,
    server: process.env.GITHUB_SERVER_URL,
  });
}
