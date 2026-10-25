import { redactedLines } from './redact.mjs';

for await (const line of redactedLines(process.stdin)) {
  await new Promise(resolve => process.stdout.write(`${line}\n`, () => resolve()));
}
