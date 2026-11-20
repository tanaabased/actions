import assert from 'node:assert/strict';
import { test } from 'node:test';

import { packFilename, parsePackResult } from '../pack-result.cjs';

test('selects one complete package record from either npm pack JSON format', () => {
  const pack = { name: '@fixture/plugin', version: '1.2.3', filename: 'fixture-plugin-1.2.3.tgz' };
  for (const result of [[pack], { [pack.name]: pack }]) {
    const record = parsePackResult(JSON.stringify(result));
    assert.deepEqual(record, pack);
    assert.equal(packFilename(record), pack.filename);
  }
});

test('rejects malformed pack output, mismatched package keys, and ambiguous results', () => {
  assert.throws(() => parsePackResult('invalid JSON'), /invalid JSON/);
  for (const invalid of [null, 'text', 3, { filename: 'flat.tgz' }, { one: { name: 'other' } }])
    assert.throws(() => parsePackResult(JSON.stringify(invalid)), /result shape/);
  for (const invalid of [[], {}, [{}, {}], { one: { name: 'one' }, two: { name: 'two' } }])
    assert.throws(() => parsePackResult(JSON.stringify(invalid)), /archive count/);
  for (const invalid of [null, [], 3])
    assert.throws(() => parsePackResult(JSON.stringify([invalid])), /archive shape/);
});

test('requires a single safe filename when locating a packed archive', () => {
  for (const filename of [undefined, 7, ''])
    assert.throws(() => packFilename({ filename }), /archive shape/);
  for (const filename of [
    '/tmp/file.tgz',
    '../file.tgz',
    'sub/file',
    'sub\\file',
    '..',
    '.',
    'bad\nname',
  ])
    assert.throws(() => packFilename({ filename }), /unsafe archive filename/);
});
