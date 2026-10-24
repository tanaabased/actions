import { spawnSync } from 'node:child_process';

import { redact } from './redact.mjs';

export function report(input, { write = console.error, sanitize = redact } = {}) {
  try {
    const safe = sanitize(String(input));
    const tail = safe.split('\n').slice(-20).join('\n');
    const bytes = Buffer.from(tail);
    write(bytes.subarray(Math.max(0, bytes.length - 8192)).toString('utf8'));
  } catch {
    // No raw-output fallback. Reporting must not replace the command's result.
    try { write('diagnostic output unavailable'); } catch { /* The destination may also be closed. */ }
  }
}

export function command(program, args, { verbose = false, diagnostics = report, ...options } = {}) {
  const result = spawnSync(program, args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
    stdio: ['pipe', 'pipe', 'pipe'], ...options });
  const failed = result.error || result.status !== 0;
  if (failed || verbose) {
    try {
      if (result.stderr) diagnostics(result.stderr);
      if (failed && result.stdout) diagnostics(result.stdout);
      if (result.error) diagnostics(`command capture: ${result.error.code || 'launch error'}`);
    } catch { /* Optional diagnostics never change command success or status. */ }
  }
  if (failed) {
    throw Object.assign(new Error(`${program} failed (${result.status ?? result.signal ?? 'launch error'})`), {
      exitCode: result.status || 1,
    });
  }
  return result.stdout.trim();
}
