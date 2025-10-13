import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { applySecurityHeaders } from '@/lib/security/headers';
import { compose, withAuth, withRateLimit } from '@/lib/api/guard';
import { rateLimit } from '@/lib/security/rate-limit';
import { env } from '@/env';
import { createPaymentService } from '@/lib/database';
import { createAuthService } from '@/lib/auth/auth';

const bodySchema = z.object({
  amount: z.number().positive().max(100000),
  description: z.string().min(1).max(200).optional(),
  currency: z.enum(['ILS']).optional(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
  locale: z.enum(['he', 'en']).optional(),
  idempotencyKey: z.string().min(8).max(100).optional(),
});

function buildTranzilaUrl(params: {
  amount: number;
  description?: string;
  currency?: 'ILS';
  successUrl?: string;
  cancelUrl?: string;
  locale?: 'he' | 'en';
}) {
  const supplier = process.env.TRANZILA_SUPPLIER || process.env.NEXT_PUBLIC_TRANZILA_SUPPLIER;
  if (!supplier) {
    throw new Error('Missing TRANZILA_SUPPLIER environment variable');
  }

  // Tranzila currency code: 1 = NIS (ILS)
  const currencyCode = 1;
  const lang = params.locale === 'en' ? 'en' : 'he';

  const base = `https://secure5.tranzila.com/${encodeURIComponent(supplier)}/iframenew.php`;
  const usp = new URLSearchParams();
  usp.set('sum', params.amount.toFixed(2));
  usp.set('currency', String(currencyCode));
  usp.set('lang', lang);
  if (params.description) usp.set('product', params.description);

  // Return URLs
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const successUrl = params.successUrl || `${appUrl}/${lang}/payments/return?status=success`;
  const cancelUrl = params.cancelUrl || `${appUrl}/${lang}/payments/return?status=cancel`;
  usp.set('success_url', successUrl);
  usp.set('error_url', cancelUrl);

  return `${base}?${usp.toString()}`;
}

async function handler(req: NextRequest): Promise<NextResponse> {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return applySecurityHeaders(
        req,
        NextResponse.json(
          { success: false, error: parsed.error.flatten() },
          { status: 400 }
        )
      );
    }

    const { amount, description, currency, successUrl, cancelUrl, locale, idempotencyKey } = parsed.data;

    // Create pending payment record
    const auth = createAuthService(true);
    const user = await auth.getCurrentUser();
    const paymentSvc = createPaymentService();
    await paymentSvc.createPending({
      userId: user?.id || null,
      amount,
      currency: currency || 'ILS',
      description,
      idempotencyKey,
    });

    const url = buildTranzilaUrl({ amount, description, currency, successUrl, cancelUrl, locale });

    return applySecurityHeaders(
      req,
      NextResponse.json({ success: true, url }, { status: 200 })
    );
  } catch (e) {
    console.error('Tranzila session error', e);
    return applySecurityHeaders(
      req,
      NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
    );
  }
}

// Wrap handler with middleware
const wrappedHandler = (h: (req: NextRequest) => Promise<NextResponse>) =>
  rateLimit(10, 60_000)(h);

export const POST = compose(
  wrappedHandler(handler),
  withRateLimit(),
  withAuth
);
