import { basename } from 'node:path';

import { report } from './command.mjs';

export function packFilename(output) {
  let packs;
  try { packs = JSON.parse(output); } catch {
    report(`npm pack invalid JSON (${Buffer.byteLength(output)} bytes): ${output}`);
    throw new Error('npm pack returned invalid JSON');
  }
  // npm emits either an archive array or a map keyed by package name.
  if (!Array.isArray(packs) && packs && typeof packs === 'object') {
    const entries = Object.entries(packs);
    if (!entries.every(([name, pack]) => pack && typeof pack === 'object' && !Array.isArray(pack) && pack.name === name)) {
      throw new Error('npm pack invalid result shape: expected a package-keyed archive map');
    }
    packs = entries.map(([, pack]) => pack);
  }
  if (!Array.isArray(packs)) throw new Error(`npm pack invalid result shape: expected archive array or package-keyed object, received ${packs === null ? 'null' : typeof packs}`);
  if (packs.length !== 1) throw new Error(`npm pack archive count: expected 1, received ${packs.length}`);
  const pack = packs[0];
  if (!pack || typeof pack !== 'object' || Array.isArray(pack) || typeof pack.filename !== 'string' || !pack.filename) {
    throw new Error('npm pack invalid archive shape: expected an object with a nonempty filename');
  }
  if (basename(pack.filename) !== pack.filename || /[\\\r\n\0]/.test(pack.filename) || ['.', '..'].includes(pack.filename)) {
    report(`npm pack unsafe filename: ${JSON.stringify(pack.filename)}`);
    throw new Error('npm pack returned an unsafe archive filename');
  }
  return pack.filename;
}
