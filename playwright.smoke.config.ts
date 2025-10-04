import baseConfig from './playwright.config';
import { defineConfig, devices } from '@playwright/test';

const smokeProjects = (baseConfig.projects ?? [])
  .filter(project => project.name === 'chromium')
  .map(project => ({ ...project }));

const chromiumFallback = {
  name: 'chromium',
  use: {
    ...devices['Desktop Chrome'],
    storageState: { cookies: [], origins: [] },
  },
};

export default defineConfig({
  ...baseConfig,
  projects: smokeProjects.length > 0 ? smokeProjects : [chromiumFallback],
  testMatch: ['auth.spec.ts', 'client-dashboard.spec.ts'],
});
