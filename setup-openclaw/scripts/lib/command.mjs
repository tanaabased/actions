import { spawn } from 'node:child_process';
import { closeSync, mkdtempSync, openSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { redact, redactedLines } from './redact.mjs';

export function report(input, { write = console.error, sanitize = redact } = {}) {
  try {
    const safe = sanitize(String(input));
    const tail = safe.split('\n').slice(-20).join('\n');
    const bytes = Buffer.from(tail);
    write(bytes.subarray(Math.max(0, bytes.length - 8192)).toString('utf8'));
  } catch {
    try { write('diagnostic output unavailable'); } catch { /* Reporting cannot change the command result. */ }
  }
}

function writeDiagnostic(text) {
  return new Promise(resolve => process.stderr.write(`${text}\n`, () => resolve()));
}

/** Logs are drained continuously; only explicitly selected machine output is captured. */
export async function command(program, args, { verbose = false, capture = false, diagnostics = writeDiagnostic, input, ...options } = {}) {
  const directory = capture ? mkdtempSync(join(tmpdir(), 'openclaw-command-')) : undefined;
  const output = directory && join(directory, 'stdout');
  let descriptor;
  const tails = [];
  const emit = async text => { try { await diagnostics(text); } catch { /* Optional diagnostics preserve status. */ } };
  const consume = async stream => {
    const index = verbose ? undefined : tails.push(Buffer.alloc(0)) - 1;
    try {
      for await (const line of redactedLines(stream, options.env ?? process.env)) {
        if (verbose) await emit(line);
        else {
          const bytes = Buffer.concat([tails[index], Buffer.from(`${line}\n`)]);
          tails[index] = bytes.subarray(Math.max(0, bytes.length - 8192));
        }
      }
    } catch { await emit('diagnostic output unavailable'); }
  };
  try {
    if (output) descriptor = openSync(output, 'wx', 0o600);
    const child = spawn(program, args, { ...options, stdio: ['pipe', descriptor ?? 'pipe', 'pipe'] });
    const completed = new Promise(resolve => {
      let error;
      child.once('error', value => { error = value; });
      child.once('close', (status, signal) => resolve({ status, signal, error }));
    });
    child.stdin.on('error', () => { /* A child may close stdin without consuming all input. */ });
    child.stdin.end(input);
    const drains = [...(child.stdout ? [consume(child.stdout)] : []), consume(child.stderr)];
    const result = await completed;
    await Promise.all(drains);
    if (result.error || result.status !== 0) {
      if (!verbose) for (const tail of tails) if (tail.length) await emit(tail.toString('utf8').trimEnd());
      if (result.error) await emit(`command launch: ${result.error.code || 'error'}`);
      throw Object.assign(new Error(`${program} failed (${result.status ?? result.signal ?? 'launch error'})`), { exitCode: result.status > 0 ? result.status : 1 });
    }
    return output ? readFileSync(output, 'utf8').trim() : '';
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
    if (directory) rmSync(directory, { recursive: true, force: true });
  }
}
