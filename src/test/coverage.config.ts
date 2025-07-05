import type { CoverageOptions } from 'vitest';

export const coverageConfig: CoverageOptions = {
  provider: 'v8',
  reporter: ['text', 'html', 'json', 'lcov'],
  reportsDirectory: './coverage',
  exclude: [
    'node_modules/',
    '.next/',
    'coverage/',
    '*.config.*',
    'src/test/',
    'src/**/*.test.*',
    'src/**/*.spec.*',
    'src/types/',
    'src/messages/',
    'src/app/globals.css',
    'src/app/layout.tsx',
    'src/middleware.ts',
    'src/**/*.d.ts',
    'playwright.config.ts',
    'vitest.config.ts',
    'next.config.js',
    'tailwind.config.js',
    'postcss.config.js',
  ],
  include: [
    'src/**/*.{js,jsx,ts,tsx}',
  ],
  thresholds: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    // Component-specific thresholds
    'src/components/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    // API route thresholds
    'src/app/api/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    // Critical business logic
    'src/lib/database/': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    },
    'src/lib/auth/': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    },
  },
};