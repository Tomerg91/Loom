import crypto from 'crypto';

export interface VerifyOptions {
  secret?: string;
  algo?: 'sha256' | 'sha1' | 'md5';
  fields?: string[]; // exact fields to include, in order
  signatureParam?: string; // where the signature arrives (default: sign | signature | hash)
}

function canonicalize(payload: Record<string, string>, fields?: string[], exclude: string[] = ['sign', 'signature', 'hash']) {
  const keys = fields && fields.length > 0
    ? fields
    : Object.keys(payload).filter(k => !exclude.includes(k));
  const ordered = fields && fields.length > 0 ? keys : keys.sort();
  return ordered.map(k => `${k}=${payload[k] ?? ''}`).join('&');
}

function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function verifyTranzilaSignature(payload: Record<string, string>, opts: VerifyOptions = {}): boolean {
  const secret = opts.secret || process.env.TRANZILA_SECRET || '';
  if (!secret) return true; // allow if not configured

  const signatureParam = opts.signatureParam || 'sign';
  const candidate = payload[signatureParam] || payload['signature'] || payload['hash'] || '';
  if (!candidate) return false;

  const fieldsEnv = (process.env.TRANZILA_SIGN_FIELDS || '').trim();
  const fields = opts.fields || (fieldsEnv ? fieldsEnv.split(',').map(s => s.trim()).filter(Boolean) : undefined);
  const algo = opts.algo || (process.env.TRANZILA_SIGN_ALGO as any) || 'sha256';

  const base = canonicalize(payload, fields);
  const hmac = crypto.createHmac(algo, secret).update(base, 'utf8').digest('hex');
  const hmacBase64 = crypto.createHmac(algo, secret).update(base, 'utf8').digest('base64');

  const cand = candidate.replace(/\s+/g, '').toLowerCase();
  const hex = hmac.replace(/\s+/g, '').toLowerCase();
  const b64 = hmacBase64.replace(/\s+/g, '').toLowerCase();

  return safeEqual(cand, hex) || safeEqual(cand, b64);
}

