import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts',
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    exclude: ['e2e/**', 'node_modules/**', 'dist/**', 'src/lib/env.test.ts'],
    css: false,

    // --- MEMORY LEAK FIX (Modern Vitest API) ---
    // Use isolated forks to completely flush RAM between files
    pool: 'forks',
    isolate: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.d.ts',
        'src/db/migrations/**',
        'src/db/seed*.ts',
        'src/components/ui/**',
        'src/types/**',
        // Test infrastructure, not application code.
        'src/test/**',
      ],
      // Floors sit just under the measured baseline so coverage ratchets rather
      // than drifts. Before this they were roughly half of actual coverage,
      // which allowed a ~22 point regression to pass unnoticed.
      // Measured 2026-08-18: 47.82 / 39.22 / 43.05 / 48.85.
      thresholds: {
        statements: 46,
        branches: 37,
        functions: 41,
        lines: 47,

        // Well-covered shared boundaries: hold the line here.
        'src/lib/api/**': {
          statements: 80,
          branches: 68,
          functions: 85,
          lines: 80,
        },
        // Authentication is under-covered relative to its risk. These floors
        // pin the current level; raise them as tests are added rather than
        // setting an aspirational number that fails the build today.
        'src/lib/auth/**': {
          statements: 30,
          branches: 26,
          functions: 42,
          lines: 30,
        },
      },
    },
  },
});
