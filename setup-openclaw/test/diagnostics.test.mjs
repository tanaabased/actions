import assert from 'node:assert/strict';
import { test } from 'node:test';

import { packFilename, parsePackResult } from '../../.lib/pack-result.cjs';
import { command, report } from '../scripts/lib/command.mjs';
import { redact } from '../scripts/lib/redact.mjs';

test('stdout-only failure and a broken diagnostic renderer cannot mask command status', async () => {
  const script =
    "require('node:fs').writeSync(1,('x'.repeat(1023)+'\\n').repeat(2400)+'\\npassword=hidden-value\\nlast stdout evidence');process.exit(37)";
  const reports = [];
  await assert.rejects(
    () =>
      command(process.execPath, ['-e', script], {
        diagnostics: (input) => report(input, { write: (text) => reports.push(text) }),
      }),
    (error) => error.exitCode === 37,
  );
  assert.match(reports.join('\n'), /last stdout evidence/);
  assert.ok(!reports.join('\n').includes('hidden-value'));
  for (const code of [0, 37]) {
    const run = () =>
      command(
        process.execPath,
        ['-e', `console.error('token=never-print');console.log('data');process.exit(${code})`],
        {
          capture: true,
          verbose: true,
          diagnostics: () => {
            throw new Error('renderer broken');
          },
        },
      );
    if (code) await assert.rejects(run, (error) => error.exitCode === code);
    else assert.equal(await run(), 'data');
  }
});

test('report redacts before clipping, bounds one huge line, and fails closed', () => {
  const reports = [];
  const write = (text) => reports.push(text);
  report('x'.repeat(2400000), { write });
  assert.ok(Buffer.byteLength(reports.pop()) <= 8192);
  report('raw secret', {
    write,
    sanitize: () => {
      throw new Error('redaction failed');
    },
  });
  assert.ok(!reports.join('').includes('raw secret'));
  assert.match(reports.join(''), /unavailable/);
  const key =
    '-----BEGIN OPENSSH PRIVATE KEY-----\n' +
    'hidden\n'.repeat(100) +
    '-----END OPENSSH PRIVATE KEY-----';
  report(key, { write });
  assert.ok(!reports.join('').includes('hidden'));
  assert.equal(redact('raw-known-value', { PRIVATE_KEY: 'raw-known-value' }), '[REDACTED]');
});

test('pack diagnostics redact npm output before reporting it', () => {
  const reports = [];
  const diagnostic = (text) => report(text, { write: (line) => reports.push(line) });
  assert.throws(() => parsePackResult('token=pack-secret', diagnostic), /invalid JSON/);
  assert.throws(
    () => packFilename({ filename: '../token=pack-secret' }, diagnostic),
    /unsafe archive filename/,
  );
  assert.equal(reports.length, 2);
  for (const line of reports) {
    assert.match(line, /REDACTED/);
    assert.ok(!line.includes('pack-secret'));
  }
});
