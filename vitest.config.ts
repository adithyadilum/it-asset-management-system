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
  },
});