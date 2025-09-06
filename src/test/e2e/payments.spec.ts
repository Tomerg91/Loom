import { test, expect } from '@playwright/test';

test.describe('Payments', () => {
  test('Return page renders in he/en', async ({ page }) => {
    await page.goto('/he/payments/return?status=success');
    await expect(page.getByText('התשלום הושלם בהצלחה.')).toBeVisible();

    await page.goto('/en/payments/return?status=cancel');
    await expect(page.getByText('Payment was canceled.')).toBeVisible();
  });

  test('Tranzila notify endpoint accepts IPN payload', async ({ request }) => {
    const res = await request.post('/api/payments/tranzila/notify', {
      form: {
        TranID: 'test-tx-123',
        sum: '100.00',
        ApprovalCode: '123456',
        sign: 'dummy',
      },
    });
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.ok).toBeTruthy();
  });
});

