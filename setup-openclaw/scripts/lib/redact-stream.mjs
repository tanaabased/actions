import { redact } from './redact.mjs';

let input = '';
for await (const chunk of process.stdin) input += chunk;
process.stdout.write(redact(input));
