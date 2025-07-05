import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { coverageConfig } from './src/test/coverage.config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    css: true,
    coverage: coverageConfig,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    exclude: [
      'node_modules/**',
      'dist/**',
      '.next/**',
      'coverage/**',
      '**/*.e2e.spec.*',
      '**/e2e/**',
      'src/test/e2e/**',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});