import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Informational logging goes through `logInfo` in src/lib/latency.ts so it
    // can be silenced in production; warn/error stay available everywhere.
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  {
    // The logger itself, plus scripts and seeds that are meant to print.
    files: [
      'src/lib/latency.ts',
      'src/db/seed*.ts',
      'src/db/migrate-*.ts',
      'scripts/**/*',
      'e2e/**/*',
      '**/*.test.ts',
      '**/*.test.tsx',
    ],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['e2e/**/*'],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', 'vitest.setup.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@next/next/no-img-element': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'playwright-report/**',
    'test-results/**',
    'coverage/**',
    // Swagger UI bundles copied from node_modules by scripts/copy-swagger-ui.mjs.
    'public/api-docs/vendor/**',
  ]),
]);

export default eslintConfig;
