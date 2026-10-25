import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { test } from 'node:test';

import { command } from '../scripts/lib/command.mjs';
import { redact, redactedLines } from '../scripts/lib/redact.mjs';

const outputScript = `
const fs = require('node:fs');
const line = 'safe output '.repeat(300) + '\\n';
for (let i = 0; i < 5000; i++) { fs.writeSync(1, line); fs.writeSync(2, line); }
fs.writeSync(2, 'token=private-value\\nlast evidence\\n');
process.exit(Number(process.argv[1]));`;

test('both log streams exceed 16 mib without capture failure; quiet errors retain a bounded safe tail', async () => {
  for (const verbose of [false, true]) {
    for (const status of [0, 23]) {
      let bytes = 0;
      let last = '';
      let leaked = false;
      const run = () => command(process.execPath, ['-e', outputScript, String(status)], {
        verbose,
        diagnostics: text => { bytes += Buffer.byteLength(text); last = text; leaked ||= text.includes('private-value'); },
      });
      if (status) await assert.rejects(run, error => error.exitCode === status);
      else assert.equal(await run(), '');
      assert.equal(leaked, false);
      if (verbose) assert.ok(bytes > 32 * 1024 * 1024);
      else assert.ok(bytes <= 16384);
      if (status && !verbose) assert.match(last, /last evidence/);
    }
  }
});

test('debug output is consumed before the command exits', async () => {
  const root = mkdtempSync(join(tmpdir(), 'stream-before-exit-'));
  const marker = join(root, 'finished');
  const ack = join(root, 'ack');
  let seenBeforeExit = false;
  try {
    const script = `const fs=require('node:fs');console.error('ready');
const timeout=setTimeout(()=>process.exit(99),5000);
const poll=setInterval(()=>{if(fs.existsSync(process.argv[1])){
fs.writeFileSync(process.argv[2],'done');clearInterval(poll);clearTimeout(timeout);}},10);`;
    await command(process.execPath, ['-e', script, ack, marker], {
      verbose: true,
      diagnostics: () => { seenBeforeExit = !existsSync(marker); writeFileSync(ack, 'received'); },
    });
    assert.equal(seenBeforeExit, true);
    assert.equal(existsSync(marker), true);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('machine output larger than 16 mib stays separate from logs and is returned completely', async () => {
  let reports = '';
  const result = await command(process.execPath, ['-e', `require('node:fs').writeSync(1,JSON.stringify({data:'z'.repeat(18*1024*1024)}));console.error('token=structured-secret');`], {
    capture: true, verbose: true, diagnostics: text => { reports += text; },
  });
  assert.equal(JSON.parse(result).data.length, 18 * 1024 * 1024);
  assert.ok(!reports.includes('structured-secret'));
  assert.ok(!reports.includes('zzzz'));
  await assert.rejects(() => command('/nonexistent/command', [], { capture: true, diagnostics: () => {} }), error => error.exitCode === 1);
});

test('redaction spans chunks, utf8 characters, private keys and multiline credentials', async () => {
  const text = 'safe 🌿\nBearer abcdefghijklmnop\ntoken="okay" password="first words\nsecond"\n-----BEGIN OPENSSH PRIVATE KEY-----\nprivate-body\n-----END OPENSSH PRIVATE KEY-----\nknown-first\nknown-second\nend';
  const source = Readable.from([...Buffer.from(text)].map(byte => Buffer.from([byte])));
  const lines = [];
  for await (const line of redactedLines(source, { API_KEY: 'known-first\nknown-second' })) lines.push(line);
  const output = lines.join('\n');
  assert.match(output, /safe 🌿/);
  assert.match(output, /end$/);
  assert.equal(redact('password="escaped\\" still-secret" tail', {}), 'password=[REDACTED] tail');
  for (const secret of ['abcdefghijklmnop', 'first', 'second', 'private-body', 'known-first', 'known-second']) assert.ok(!output.includes(secret), secret);
});

test('unbounded diagnostic lines are omitted without stopping commands or disclosing later private material', async () => {
  const reports = [];
  await command(process.execPath, ['-e', `require('node:fs').writeSync(2,'x'.repeat(18*1024*1024)+'\\nprivate remainder');`], {
    verbose: true, diagnostics: text => reports.push(text),
  });
  assert.deepEqual(reports, ['diagnostic stream omitted after an oversized line']);
});
