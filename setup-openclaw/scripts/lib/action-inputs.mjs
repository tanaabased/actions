import { appendFileSync } from 'node:fs';
import { setupInputs, validateSetup } from './setup-inputs.mjs';

try {
  const values = Object.fromEntries(setupInputs.map(name => [name, process.env[`SETUP_${name.replaceAll('-', '_').toUpperCase()}`] || '']));
  const hasSetup = Object.values(values).some(value => value !== '');
  const hasRun = (process.env.SETUP_RUN || '').trim() !== '';
  if (hasRun && hasSetup) throw new Error('run and setup inputs are mutually exclusive');
  validateSetup(values);
  appendFileSync(process.env.GITHUB_OUTPUT, `mode=${hasRun ? 'run' : hasSetup ? 'setup' : 'install'}\n`);
} catch (error) {
  console.error(`error: ${error.message}`);
  process.exit(2);
}
