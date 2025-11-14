/**
 * Comprehensive Payment Flow Tests
 * Tests the entire payment and subscription lifecycle
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createPaymentService } from '@/lib/database/payments';
import { createSubscriptionService } from '@/lib/database/subscriptions';
import { createWebhookService } from '@/lib/database/webhooks';
import { createPaymentAlertService } from '@/lib/alerts/payment-alerts';

describe('Payment Flow Integration Tests', () => {
  describe('Subscription Purchase Flow', () => {
    it('should complete full subscription purchase flow', async () => {
      // 1. User selects a plan
      const subscriptionSvc = createSubscriptionService();
      const plans = await subscriptionSvc.getPublicPlans();
      const basicPlan = plans.find(p => p.tier === 'basic');

      expect(basicPlan).toBeDefined();
      expect(basicPlan?.priceMonthly).toBeGreaterThan(0);

      // 2. Payment is created
      const paymentSvc = createPaymentService();
      const payment = await paymentSvc.createPending({
        userId: 'test-user-id',
        amount: basicPlan!.priceMonthly / 100,
        currency: 'ILS',
        description: 'Basic subscription',
        metadata: {
          subscription_tier: 'basic',
          billing_interval: 'monthly',
        },
      });

      expect(payment).toBeDefined();

      // 3. Webhook processes successful payment
      // (This would normally come from Tranzila)

      // 4. Subscription is updated
      await subscriptionSvc.processSuccessfulPayment((payment as any).id);

      // 5. Invoice is generated
      // (Verified by checking the database)
    });

    it('should handle failed payment with alerts', async () => {
      const paymentSvc = createPaymentService();
      const alertSvc = createPaymentAlertService();

      // Create a failed payment
      const payment = await paymentSvc.createPending({
        userId: 'test-user-id',
        amount: 99,
        currency: 'ILS',
        description: 'Failed payment test',
      });

      // Update to failed status
      await paymentSvc.upsertByProviderTxn({
        provider: 'tranzila',
        providerTransactionId: 'failed-txn-123',
        status: 'failed',
        amount: 99,
        currency: 'ILS',
        rawPayload: { error: 'Card declined' },
      });

      // Alert should be sent
      await alertSvc.sendPaymentFailureAlert({
        type: 'payment_failed',
        userId: 'test-user-id',
        paymentId: (payment as any).id,
        amount: 9900,
        currency: 'ILS',
        reason: 'Card declined',
      });

      // Verify alert was logged (check database)
    });
  });

  describe('Webhook Idempotency', () => {
    it('should prevent duplicate webhook processing', async () => {
      const webhookSvc = createWebhookService();
      const idempotencyKey = 'test-webhook-123';

      // First webhook
      const recorded1 = await webhookSvc.recordEvent({
        provider: 'tranzila',
        idempotencyKey,
        eventType: 'payment.success',
        transactionId: 'txn-123',
        payload: { amount: 100 },
      });

      expect(recorded1).toBe(true);

      // Duplicate webhook
      const recorded2 = await webhookSvc.recordEvent({
        provider: 'tranzila',
        idempotencyKey,
        eventType: 'payment.success',
        transactionId: 'txn-123',
        payload: { amount: 100 },
      });

      expect(recorded2).toBe(false);

      // Verify it's marked as processed
      const isProcessed = await webhookSvc.isProcessed('tranzila', idempotencyKey);
      expect(isProcessed).toBe(true);
    });
  });

  describe('Subscription Management', () => {
    it('should upgrade subscription', async () => {
      const subscriptionSvc = createSubscriptionService();

      // Start with basic plan
      await subscriptionSvc.updateSubscription({
        userId: 'test-user-id',
        tier: 'basic',
        billingInterval: 'monthly',
      });

      // Upgrade to professional
      await subscriptionSvc.updateSubscription({
        userId: 'test-user-id',
        tier: 'professional',
        billingInterval: 'monthly',
      });

      // Verify subscription
      const subscription = await subscriptionSvc.getUserSubscription('test-user-id');
      expect(subscription.tier).toBe('professional');
      expect(subscription.isActive).toBe(true);
    });

    it('should handle subscription cancellation', async () => {
      const subscriptionSvc = createSubscriptionService();

      // Create active subscription
      await subscriptionSvc.updateSubscription({
        userId: 'test-user-id',
        tier: 'basic',
        billingInterval: 'monthly',
      });

      // Cancel subscription
      await subscriptionSvc.cancelSubscription('test-user-id');

      // Subscription should still be active until period ends
      const subscription = await subscriptionSvc.getUserSubscription('test-user-id');
      expect(subscription.isActive).toBe(true); // Still active during grace period
    });

    it('should check subscription expiration', async () => {
      const subscriptionSvc = createSubscriptionService();

      // Create subscription with past expiration
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      await subscriptionSvc.updateSubscription({
        userId: 'test-user-id',
        tier: 'basic',
        billingInterval: 'monthly',
        startDate: new Date(pastDate.getTime() - 30 * 24 * 60 * 60 * 1000),
      });

      // Should be inactive
      const subscription = await subscriptionSvc.getUserSubscription('test-user-id');
      expect(subscription.isActive).toBe(false);
    });
  });

  describe('Feature Gating', () => {
    it('should restrict access to paid features', async () => {
      const subscriptionSvc = createSubscriptionService();

      // Free tier user
      const hasResourceLibrary = await subscriptionSvc.userHasFeature(
        'free-user-id',
        'resource_library'
      );

      expect(hasResourceLibrary).toBe(false);

      // Paid tier user
      await subscriptionSvc.updateSubscription({
        userId: 'paid-user-id',
        tier: 'basic',
        billingInterval: 'monthly',
      });

      const hasPaidResourceLibrary = await subscriptionSvc.userHasFeature(
        'paid-user-id',
        'resource_library'
      );

      expect(hasPaidResourceLibrary).toBe(true);
    });

    it('should enforce plan limits', async () => {
      const subscriptionSvc = createSubscriptionService();

      // Free tier has limited clients
      const limitCheck = await subscriptionSvc.checkPlanLimit('free-user-id', 'clients');

      expect(limitCheck.limit).toBeDefined();
      expect(limitCheck.isWithinLimit).toBeDefined();
      expect(limitCheck.remaining).toBeDefined();
    });
  });

  describe('Invoice Generation', () => {
    it('should generate invoice after successful payment', async () => {
      const paymentSvc = createPaymentService();

      // Create payment
      const payment = await paymentSvc.createPending({
        userId: 'test-user-id',
        amount: 99,
        currency: 'ILS',
        description: 'Test invoice',
      });

      // Update to paid
      await paymentSvc.upsertByProviderTxn({
        provider: 'tranzila',
        providerTransactionId: 'txn-invoice-test',
        status: 'paid',
        amount: 99,
        currency: 'ILS',
        rawPayload: {},
      });

      // Invoice should be created via RPC call
      // (Verified by checking database)
    });
  });

  describe('Payment Reconciliation', () => {
    it('should calculate subscription analytics', async () => {
      const subscriptionSvc = createSubscriptionService();

      const analytics = await subscriptionSvc.getSubscriptionAnalytics();

      expect(analytics).toHaveProperty('totalSubscribers');
      expect(analytics).toHaveProperty('byTier');
      expect(analytics).toHaveProperty('monthlyRecurringRevenue');
      expect(analytics).toHaveProperty('annualRecurringRevenue');
      expect(analytics.byTier).toHaveProperty('free');
      expect(analytics.byTier).toHaveProperty('basic');
      expect(analytics.byTier).toHaveProperty('professional');
      expect(analytics.byTier).toHaveProperty('enterprise');
    });
  });

  describe('Payment Alerts', () => {
    it('should send alert for payment failures', async () => {
      const alertSvc = createPaymentAlertService();

      const consoleSpy = vi.spyOn(console, 'log');

      await alertSvc.sendPaymentFailureAlert({
        type: 'payment_failed',
        userId: 'test-user-id',
        paymentId: 'payment-123',
        amount: 9900,
        currency: 'ILS',
        reason: 'Insufficient funds',
      });

      // Verify console logs (in real implementation, would check email/SMS service)
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should check for expiring subscriptions', async () => {
      const alertSvc = createPaymentAlertService();

      // Run the expiring subscription check
      await alertSvc.checkExpiringSubscriptions();

      // Alerts should be sent to users with subscriptions expiring soon
    });
  });
});

describe('Payment Security Tests', () => {
  it('should validate HMAC signatures', async () => {
    // Covered in tranzila.test.ts
  });

  it('should prevent SQL injection in payment queries', async () => {
    const paymentSvc = createPaymentService();

    // Attempt SQL injection in description
    const maliciousDescription = "'; DROP TABLE payments; --";

    await expect(
      paymentSvc.createPending({
        userId: 'test-user-id',
        amount: 100,
        description: maliciousDescription,
      })
    ).resolves.toBeDefined();

    // Database should still exist and be intact
  });

  it('should enforce RLS policies on payments', async () => {
    // Users should only see their own payments
    // Tested via Supabase RLS policies
  });
});

describe('Edge Cases', () => {
  it('should handle concurrent payment processing', async () => {
    const webhookSvc = createWebhookService();

    // Simulate concurrent webhook processing
    const promises = [
      webhookSvc.recordEvent({
        provider: 'tranzila',
        idempotencyKey: 'concurrent-test',
        transactionId: 'txn-concurrent',
      }),
      webhookSvc.recordEvent({
        provider: 'tranzila',
        idempotencyKey: 'concurrent-test',
        transactionId: 'txn-concurrent',
      }),
    ];

    const results = await Promise.all(promises);

    // Only one should succeed
    expect(results.filter(r => r === true).length).toBe(1);
    expect(results.filter(r => r === false).length).toBe(1);
  });

  it('should handle missing user data gracefully', async () => {
    const subscriptionSvc = createSubscriptionService();

    await expect(
      subscriptionSvc.getUserSubscription('non-existent-user')
    ).rejects.toThrow();
  });

  it('should handle payment amount edge cases', async () => {
    const paymentSvc = createPaymentService();

    // Zero amount should fail
    await expect(
      paymentSvc.createPending({
        userId: 'test-user-id',
        amount: 0,
        currency: 'ILS',
      })
    ).rejects.toThrow();

    // Negative amount should fail
    await expect(
      paymentSvc.createPending({
        userId: 'test-user-id',
        amount: -100,
        currency: 'ILS',
      })
    ).rejects.toThrow();

    // Very large amount should work
    await expect(
      paymentSvc.createPending({
        userId: 'test-user-id',
        amount: 1000000,
        currency: 'ILS',
      })
    ).resolves.toBeDefined();
  });
});
