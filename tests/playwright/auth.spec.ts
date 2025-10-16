import { expect, test } from '@playwright/test';

const SIGN_IN_PATH = '/en/auth/signin';
const SIGN_UP_PATH = '/en/auth/signup';

/**
 * Lightweight smoke tests that confirm the authentication entry points render
 * critical form controls after the application boots in CI.
 */
test.describe('Authentication smoke tests', () => {
  test('sign-in page renders headline and form actions', async ({ page }) => {
    await page.goto(SIGN_IN_PATH);

    await expect(page.getByRole('heading', { level: 1 })).toContainText(/welcome/i);
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('sign-up link is available from sign-in view', async ({ page }) => {
    await page.goto(SIGN_IN_PATH);
    const createAccountLink = page.getByRole('link', { name: /sign up here/i });
    await expect(createAccountLink).toBeVisible();
    await createAccountLink.click();
    await expect(page).toHaveURL(/\/auth\/signup/);
  });

  test('sign-up page exposes required inputs', async ({ page }) => {
    await page.goto(SIGN_UP_PATH);

    await expect(page.getByRole('heading', { level: 1 })).toContainText(/join/i);
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /first name/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /last name/i })).toBeVisible();
  });
});
