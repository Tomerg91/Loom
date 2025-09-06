import { NextRequest, NextResponse } from 'next/server';
import { applySecurityHeaders } from '@/lib/security/headers';
import { rateLimit } from '@/lib/security/rate-limit';
import { createPaymentService } from '@/lib/database';

// Simple in-memory idempotency (replace with DB persistence in production)
const seen = new Set<string>();

function formDataToObject(fd: FormData) {
  const obj: Record<string, string> = {};
  fd.forEach((v, k) => {
    obj[k] = String(v);
  });
  return obj;
}

function canonicalize(payload: Record<string, string>, excludeKeys: string[] = ['sign', 'signature']) {
  const keys = Object.keys(payload)
    .filter(k => !excludeKeys.includes(k))
    .sort();
  return keys.map(k => `${k}=${payload[k]}`).join('&');
}

function verifySignature(payload: Record<string, string>): boolean {
  const secret = process.env.TRANZILA_SECRET;
  if (!secret) return true; // Allow if not configured (staging)
  try {
    // Placeholder HMAC verification; replace with Tranzila official algorithm
    const candidate = payload.sign || payload.signature || '';
    if (!candidate) return false;
    const text = canonicalize(payload);
    const enc = new TextEncoder();
    const keyData = enc.encode(secret);
    const msgData = enc.encode(text);
    // Use Web Crypto subtle API if available; fallback to pass-through
    // Note: Next API route runs in Node 18+/Edge where subtle is available
    // but signature algorithm is illustrative only.
    return candidate.length > 0;
  } catch {
    return false;
  }
}

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
