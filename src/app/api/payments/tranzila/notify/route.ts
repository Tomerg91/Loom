import { NextRequest, NextResponse } from 'next/server';

import { createPaymentService } from '@/lib/database';
import { createWebhookService } from '@/lib/database/webhooks';
import { verifyTranzilaSignature } from '@/lib/payments/tranzila';
import { applySecurityHeaders } from '@/lib/security/headers';
import { rateLimit } from '@/lib/security/rate-limit';

function formDataToObject(fd: FormData) {
  const obj: Record<string, string> = {};
  fd.forEach((v, k) => {
    obj[k] = String(v);
  });
  return obj;
}

const verifySignature = (payload: Record<string, string>): boolean => verifyTranzilaSignature(payload);

async function handler(req: NextRequest): Promise<NextResponse> {
  try {
    const contentType = req.headers.get('content-type') || '';
    let data: Record<string, string> = {};
    if (contentType.includes('application/json')) {
      data = await req.json();
    } else {
      const fd = await req.formData();
      data = formDataToObject(fd);
    }

    const txId = data.TranID || data.tran_id || data.index || data.orderid || 'unknown';
    const timestamp = new Date().getTime();
    const idemKey = `${txId}:${data.sum || data.Amount || ''}:${timestamp}`;

    // Database-based idempotency check
    const webhookSvc = createWebhookService();
    const alreadyProcessed = await webhookSvc.isProcessed('tranzila', idemKey);

    if (alreadyProcessed) {
      console.log(`Duplicate webhook detected: ${idemKey}`);
      return applySecurityHeaders(req, NextResponse.json({ ok: true, idempotent: true }, { status: 200 }));
    }

    // Verify signature
    const ok = verifySignature(data);
    if (!ok) {
      console.error('Invalid signature for webhook', { txId });
      return applySecurityHeaders(req, NextResponse.json({ ok: false, error: 'invalid signature' }, { status: 400 }));
    }

    // Record webhook event for idempotency
    const recorded = await webhookSvc.recordEvent({
      provider: 'tranzila',
      idempotencyKey: idemKey,
      eventType: 'payment.notification',
      transactionId: txId,
      payload: data,
    });

    if (!recorded) {
      // Race condition: another instance processed this webhook
      console.log(`Webhook already processed by another instance: ${idemKey}`);
      return applySecurityHeaders(req, NextResponse.json({ ok: true, idempotent: true }, { status: 200 }));
    }

    // Process payment
    const paymentSvc = createPaymentService();
    const status = (data.ApprovalCode || data.approval || '').toString().length > 0 ? 'paid' : 'failed';

    const payment = await paymentSvc.upsertByProviderTxn({
      provider: 'tranzila',
      providerTransactionId: txId,
      status: status as unknown,
      amount: data.sum ? Number(data.sum) : undefined,
      currency: 'ILS',
      rawPayload: data,
    });

    // If payment is successful and has subscription metadata, update user subscription
    if (status === 'paid' && payment) {
      try {
        const { createSubscriptionService } = await import('@/lib/database/subscriptions');
        const subscriptionSvc = createSubscriptionService();
        await subscriptionSvc.processSuccessfulPayment((payment as any).id);
        console.log(`Subscription updated for payment: ${txId}`);
      } catch (subscriptionError) {
        console.error('Error updating subscription:', subscriptionError);
        // Don't fail the webhook if subscription update fails
        // We can retry this later or handle manually
      }
    }

    // Send alert if payment failed
    if (status === 'failed' && payment) {
      try {
        const { createPaymentAlertService } = await import('@/lib/alerts/payment-alerts');
        const alertSvc = createPaymentAlertService();
        await alertSvc.sendPaymentFailureAlert({
          type: 'payment_failed',
          userId: (payment as any).user_id,
          paymentId: (payment as any).id,
          amount: (payment as any).amount_cents,
          currency: (payment as any).currency,
          reason: data.errorMessage || data.error || 'Payment declined',
        });
        console.log(`Payment failure alert sent for: ${txId}`);
      } catch (alertError) {
        console.error('Error sending payment alert:', alertError);
        // Don't fail the webhook if alert fails
      }
    }

    console.log(`Webhook processed successfully: ${txId}, status: ${status}`);

    return applySecurityHeaders(req, NextResponse.json({ ok: true, payment }, { status: 200 }));
  } catch (e) {
    console.error('Tranzila IPN error', e);
    return applySecurityHeaders(req, NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 }));
  }
}

export const POST = rateLimit(60, 60_000)(handler);
