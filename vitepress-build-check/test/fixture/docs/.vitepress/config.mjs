import { existsSync } from 'node:fs';

if (!existsSync(new URL('./prepared', import.meta.url))) {
  throw new Error('The VitePress preparation command did not create its marker.');
}

export default {
  title: 'VitePress build-check fixture',
};
