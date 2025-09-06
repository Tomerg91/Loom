import { NextRequest, NextResponse } from 'next/server';
import { applySecurityHeaders } from '@/lib/security/headers';
import { rateLimit } from '@/lib/security/rate-limit';
import { createPaymentService } from '@/lib/database';
import { verifyTranzilaSignature } from '@/lib/payments/tranzila';

// Simple in-memory idempotency (replace with DB persistence in production)
const seen = new Set<string>();

function formDataToObject(fd: FormData) {
  const obj: Record<string, string> = {};
  fd.forEach((v, k) => {
    obj[k] = String(v);
  });
  return obj;
}

const verifySignature = (payload: Record<string, string>): boolean => verifyTranzilaSignature(payload);

async function handler(req: NextRequest): Promise<Response> {
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
    const idemKey = `${txId}:${data.sum || data.Amount || ''}`;

    if (seen.has(idemKey)) {
      return applySecurityHeaders(req, NextResponse.json({ ok: true, idempotent: true }, { status: 200 }));
    }

    const ok = verifySignature(data);
    if (!ok) {
      return applySecurityHeaders(req, NextResponse.json({ ok: false, error: 'invalid signature' }, { status: 400 }));
    }

    seen.add(idemKey);
    // Persist/update payment by provider transaction id
    const paymentSvc = createPaymentService();
    const status = (data.ApprovalCode || data.approval || '').toString().length > 0 ? 'paid' : 'failed';
    await paymentSvc.upsertByProviderTxn({
      provider: 'tranzila',
      providerTransactionId: txId,
      status: status as any,
      amount: data.sum ? Number(data.sum) : undefined,
      currency: 'ILS',
      rawPayload: data,
    });

    return applySecurityHeaders(req, NextResponse.json({ ok: true }, { status: 200 }));
  } catch (e) {
    console.error('Tranzila IPN error', e);
    return applySecurityHeaders(req, NextResponse.json({ ok: false }, { status: 500 }));
  }
}

export const POST = rateLimit(60, 60_000)(handler);
