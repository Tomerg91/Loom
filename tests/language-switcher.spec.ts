import { test, expect } from '@playwright/test';

const DEPLOYED_URL =
  'https://loom-7b0e1dx5a-tomer-s-projects-bcd27563.vercel.app';
const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test.describe('Language switching user journey', () => {
  test('allows switching between English and Hebrew via dropdown menu', async ({
    page,
  }) => {
    await page.goto(`${DEPLOYED_URL}/en`);
    await page.waitForLoadState('networkidle');

    const trigger = page.getByRole('button', { name: /change language/i });
    await expect(trigger).toBeVisible();

    await trigger.click();

    const hebrewOption = page.getByRole('menuitem', { name: /Hebrew/ });
    await expect(hebrewOption).toBeVisible();

    await hebrewOption.click();

    await expect(page).toHaveURL(
      new RegExp(`${escapeRegex(DEPLOYED_URL)}/he(?:/|$)`)
    );
    await page.waitForLoadState('networkidle');

    await expect
      .poll(() => page.evaluate(() => document.documentElement.dir || 'ltr'))
      .toBe('rtl');

    // Switch back to English to ensure toggle works both ways
    const triggerAfterSwitch = page.getByRole('button', {
      name: /change language/i,
    });
    await triggerAfterSwitch.click();

    const englishOption = page.getByRole('menuitem', { name: /English/ });
    await englishOption.click();

    await expect(page).toHaveURL(
      new RegExp(`${escapeRegex(DEPLOYED_URL)}/en(?:/|$)`)
    );
  });
});
