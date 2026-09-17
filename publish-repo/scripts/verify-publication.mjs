import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export function verifyPublication({ root, version, branch, tags }, run = (args) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()) {
  const refs = [`refs/heads/${branch.replace(/^refs\/heads\//, '')}`,
    ...new Set([version, ...tags.split(/\r?\n/).map((tag) => tag.trim()).filter(Boolean)]
      .map((tag) => `refs/tags/${tag}`))];
  for (const ref of refs) run(['check-ref-format', ref]);
  const commit = run(['rev-parse', 'HEAD^{commit}']);
  let listing;
  try {
    listing = run(['ls-remote', 'origin', ...refs, ...refs.slice(1).map((ref) => `${ref}^{}`)]);
  } catch {
    throw new Error('Could not read published branch and tags from origin');
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
  });
}
