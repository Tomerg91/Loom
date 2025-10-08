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
    alias: [
      {
        find: 'next-intl/middleware',
        replacement: path.resolve(
          __dirname,
          './src/test/mocks/next-intl-middleware.ts'
        ),
      },
      {
        find: 'next-intl/routing',
        replacement: path.resolve(
          __dirname,
          './src/test/mocks/next-intl-routing.ts'
        ),
      },
      {
        find: 'next-intl/navigation',
        replacement: path.resolve(
          __dirname,
          './src/test/mocks/next-intl-navigation.ts'
        ),
      },
      {
        find: 'next-intl',
        replacement: path.resolve(__dirname, './src/test/mocks/next-intl.ts'),
      },
      {
        find: 'next/navigation',
        replacement: path.resolve(
          __dirname,
          './src/test/mocks/next-navigation.ts'
        ),
      },
      { find: '@', replacement: path.resolve(__dirname, './src') },
    ],
  },
});
