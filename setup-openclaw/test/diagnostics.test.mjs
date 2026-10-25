import assert from 'node:assert/strict';
import { test } from 'node:test';

import { command, report } from '../scripts/lib/command.mjs';
import { packFilename } from '../scripts/lib/pack-result.mjs';
import { redact } from '../scripts/lib/redact.mjs';

test('large command diagnostics preserve data, status, redaction and byte bounds', async () => {
  const secret = 'sentinel-credential-never-print';
  const script = `const fs=require('node:fs');fs.writeSync(2,('x'.repeat(1023)+'\\n').repeat(2400)+'\\ntoken=${secret}\\nlast evidence\\n');fs.writeSync(1,'machine data');process.exit(Number(process.argv[1]));`;
  for (const verbose of [false, true]) {
    for (const code of [0, 23]) {
      const reports = [];
      const diagnostics = input => report(input, { write: text => reports.push(text) });
      if (code) await assert.rejects(() => command(process.execPath, ['-e', script, String(code)], { verbose, diagnostics }), error => error.exitCode === code);
      else assert.equal(await command(process.execPath, ['-e', script, '0'], { verbose, diagnostics, capture: true }), 'machine data');
      const output = reports.join('\n');
      if (!verbose) assert.ok(Buffer.byteLength(output) <= 16400);
      assert.ok(!output.includes(secret));
      if (code || verbose) {
        assert.match(output, /last evidence/);
        assert.match(output, /REDACTED/);
      } else assert.equal(output, '');
    }
  }
});

test('stdout-only failure and a broken diagnostic renderer cannot mask command status', async () => {
  const script = "require('node:fs').writeSync(1,('x'.repeat(1023)+'\\n').repeat(2400)+'\\npassword=hidden-value\\nlast stdout evidence');process.exit(37)";
  const reports = [];
  await assert.rejects(() => command(process.execPath, ['-e', script], {
    diagnostics: input => report(input, { write: text => reports.push(text) }),
  }), error => error.exitCode === 37);
  assert.match(reports.join('\n'), /last stdout evidence/);
  assert.ok(!reports.join('\n').includes('hidden-value'));
  for (const code of [0, 37]) {
    const run = () => command(process.execPath, ['-e', `console.error('token=never-print');console.log('data');process.exit(${code})`], {
      capture: true, verbose: true, diagnostics: () => { throw new Error('renderer broken'); },
    });
    if (code) await assert.rejects(run, error => error.exitCode === code);
    else assert.equal(await run(), 'data');
  }
});

test('report redacts before clipping, bounds one huge line, and fails closed', () => {
  const reports = [];
  const write = text => reports.push(text);
  report('x'.repeat(2400000), { write });
  assert.ok(Buffer.byteLength(reports.pop()) <= 8192);
  report('raw secret', { write, sanitize: () => { throw new Error('redaction failed'); } });
  assert.ok(!reports.join('').includes('raw secret'));
  assert.match(reports.join(''), /unavailable/);
  const key = '-----BEGIN OPENSSH PRIVATE KEY-----\n' + 'hidden\n'.repeat(100) + '-----END OPENSSH PRIVATE KEY-----';
  report(key, { write });
  assert.ok(!reports.join('').includes('hidden'));
  assert.equal(redact('raw-known-value', { PRIVATE_KEY: 'raw-known-value' }), '[REDACTED]');
});

test('pack results distinguish malformed JSON, shape, count and unsafe paths', () => {
  for (const filename of ['tanaab-openclaw-agent-system-9.8.7.tgz', 'another-safe-artifact.tgz']) {
    assert.equal(packFilename(JSON.stringify([{ filename }])), filename);
    assert.equal(packFilename(JSON.stringify({'@example/plugin': {name:'@example/plugin', filename}})), filename);
  }
  const oldError = console.error;
  const reports = [];
  console.error = text => reports.push(text);
  try {
    assert.throws(() => packFilename('token=pack-secret'), /invalid JSON/);
    for (const value of [null, 'text', 3, {filename:'flat.tgz'}, {one: {name:'different', filename:'one.tgz'}}]) assert.throws(() => packFilename(JSON.stringify(value)), /result shape/);
    for (const value of [[], {}, [{}, {}], {one:{name:'one',filename:'one.tgz'},two:{name:'two',filename:'two.tgz'}}]) assert.throws(() => packFilename(JSON.stringify(value)), /archive count/);
    for (const value of [null, [], {}, {filename: 7}, {filename: ''}]) assert.throws(() => packFilename(JSON.stringify([value])), /archive shape/);
    for (const filename of ['/tmp/escape.tgz', '../escape.tgz', 'sub/file.tgz', 'sub\\file.tgz', '..', '.', 'bad\nname.tgz']) {
      assert.throws(() => packFilename(JSON.stringify([{ filename }])), /unsafe archive filename/);
      assert.throws(() => packFilename(JSON.stringify({'@example/plugin':{name:'@example/plugin',filename}})), /unsafe archive filename/);
    }
    assert.ok(!reports.join('\n').includes('pack-secret'));
    assert.match(reports.join('\n'), /REDACTED/);
  } finally { console.error = oldError; }
});
