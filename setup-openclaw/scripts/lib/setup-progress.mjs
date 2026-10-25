import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { report } from './command.mjs';
import { redact } from './redact.mjs';

export function progress(operation, stage, details = {}) {
  const directory = process.env.SETUP_OPENCLAW_STATE_DIR;
  if (!directory) return;
  const path = join(directory, 'setup-progress.json');
  try {
    const prior = operation !== 'reset' && existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {};
    const next = { ...prior, ...details, ...(operation === 'complete' ? { completed: stage, current: '' } : { current: stage }) };
    mkdirSync(directory, { recursive: true });
    const safe = Object.fromEntries(Object.entries(next).map(([key, value]) => [key, redact(String(value)).slice(0, 2048)]));
    writeFileSync(path, JSON.stringify(safe), { mode: 0o600 });
  } catch { report('setup progress unavailable'); }
}

export async function stage(name, run) {
  progress('start', name);
  const result = await run();
  progress('complete', name);
  return result;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === 'report') {
    try {
      const saved = JSON.parse(readFileSync(join(process.env.SETUP_OPENCLAW_STATE_DIR, 'setup-progress.json'), 'utf8'));
      report(`last completed stage: ${saved.completed || 'none'}\ncurrent stage: ${saved.current || 'none'}\nrequested: ${saved.requested || 'unavailable'}\nresolved: ${saved.resolved || 'unavailable'}`);
    } catch { report('setup progress: unavailable'); }
  } else progress(...process.argv.slice(2));
}
