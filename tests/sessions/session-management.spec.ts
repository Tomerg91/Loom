import { test, expect } from '@playwright/test';

import { createAuthHelper, testConstants } from '../helpers';

test.describe('Session management flows', () => {
  test('client can explore sessions page and booking dialog', async ({
    page,
  }) => {
    const authHelper = createAuthHelper(page);

    await authHelper.signInUserByRole('client');

    await page.goto('/sessions');

    const bookSessionButton = page.locator(
      '[data-testid="book-session-button"]'
    );
    await expect(bookSessionButton).toBeVisible();

    const searchInput = page.locator('[data-testid="session-search"]');
    await expect(searchInput).toBeVisible();

    await bookSessionButton.click();
    const bookingDialog = page.getByRole('dialog');
    await expect(bookingDialog).toContainText('Book New Session');
    await expect(bookingDialog).toContainText(
      'Choose your preferred coach and an available time slot for your session'
    );

    await page.keyboard.press('Escape');
    await expect(bookingDialog).toBeHidden({
      timeout: testConstants.SHORT_TIMEOUT,
    });

    const listTab = page.getByRole('tab', { name: 'List View' });
    const calendarTab = page.getByRole('tab', { name: 'Calendar View' });

    await expect(listTab).toHaveAttribute('data-state', 'active');

    await calendarTab.click();
    await expect(calendarTab).toHaveAttribute('data-state', 'active');
    await expect(listTab).toHaveAttribute('data-state', 'inactive');

    await listTab.click();
    await expect(listTab).toHaveAttribute('data-state', 'active');
  });
});
