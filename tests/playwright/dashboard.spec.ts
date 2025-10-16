import { expect, test } from '@playwright/test';

const CLIENT_DASHBOARD_PATH = '/en/client';
const COACH_DASHBOARD_PATH = '/en/coach';

/**
 * Dashboard smoke coverage verifies routing guards respond correctly for
 * unauthenticated sessions and that localized chrome renders once authenticated
 * fixtures are introduced.
 */
test.describe('Dashboard smoke tests', () => {
  test('unauthenticated visitors are redirected from client dashboard', async ({ page }) => {
    const response = await page.goto(CLIENT_DASHBOARD_PATH);
    expect(response?.status()).toBeLessThan(400);
    await page.waitForURL(/\/auth\/signin/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/welcome/i);
  });

  test('unauthenticated visitors are redirected from coach dashboard', async ({ page }) => {
    const response = await page.goto(COACH_DASHBOARD_PATH);
    expect(response?.status()).toBeLessThan(400);
    await page.waitForURL(/\/auth\/signin/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/welcome/i);
  });
});
