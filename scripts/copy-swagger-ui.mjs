/**
 * Copies the Swagger UI assets out of node_modules and into
 * `public/api-docs/vendor/` so the docs page can load them same-origin.
 *
 * They used to come straight from unpkg.com, which the enforced
 * Content-Security-Policy in next.config.ts blocks: `script-src` and
 * `style-src` only ever list 'self', so the bundle never executed and the
 * page rendered as an empty <div>. Serving the files ourselves keeps the
 * policy tight instead of widening it for a third-party CDN.
 *
 * Runs from `prebuild`/`predev`; the output directory is git-ignored.
 */
import { createRequire } from 'node:module';
import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const ASSETS = [
  'swagger-ui.css',
  'swagger-ui-bundle.js',
  'swagger-ui-standalone-preset.js',
];

const require = createRequire(import.meta.url);
const sourceDir = dirname(require.resolve('swagger-ui-dist/package.json'));
const targetDir = join(process.cwd(), 'public', 'api-docs', 'vendor');

await mkdir(targetDir, { recursive: true });

await Promise.all(
  ASSETS.map((asset) =>
    copyFile(join(sourceDir, asset), join(targetDir, asset))
  )
);

const { version } = require('swagger-ui-dist/package.json');
console.log(
  `[copy-swagger-ui] copied ${ASSETS.length} swagger-ui-dist@${version} assets to public/api-docs/vendor/`
);
