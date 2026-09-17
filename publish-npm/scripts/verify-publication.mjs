import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

const npm = (args) => JSON.parse(execFileSync('npm', args, {
  encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 16 * 1024 * 1024,
  timeout: args[0] === 'view' ? 30_000 : undefined,
}));

export async function verifyPublication({ tarball, registry, channels }, read = npm, wait = setTimeout) {
  const [local] = read(['pack', tarball, '--dry-run', '--ignore-scripts', '--offline', '--json']);
  assert(local?.name && local.version && local.integrity, 'Tarball metadata is incomplete');
  const options = ['--json', '--registry', registry, '--fetch-retries=0', '--fetch-timeout=10000'];
  for (let attempt = 1; attempt <= 12; attempt++) {
    try {
      const remote = read(['view', `${local.name}@${local.version}`,
        'name', 'version', 'dist.integrity', 'dist.tarball', ...options]);
      const tags = read(['view', local.name, 'dist-tags', ...options]);
      assert(remote.name === local.name && remote.version === local.version, 'Package identity differs');
      assert(remote['dist.integrity'] === local.integrity && remote['dist.tarball'], 'Artifact differs');
      assert(channels.every((channel) => tags[channel] === local.version), 'Channel differs');
      console.log(`Verified ${local.name}@${local.version} on ${channels.join(', ')}`);
      return;
    } catch {
      if (attempt === 12) {
        throw new Error('Registry readback did not confirm the published artifact and channels. '
          + 'The version may already exist; inspect registry state before retrying publication.');
      }
      await wait(5000);
    }
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await verifyPublication({
    tarball: process.env.TARBALL_PATH,
    registry: process.env.REGISTRY_URL,
    channels: [process.env.CHANNEL, process.env.EXTRA_CHANNEL].filter(Boolean),
  });
}
