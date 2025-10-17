/**
 * @fileoverview Thin client for interacting with MFA API routes.
 *
 * The exported helpers wrap `fetch` calls with consistent error handling so UI
 * components and hooks can work with typed data rather than manually parsing
 * JSON responses. This keeps the React layer agnostic of transport details and
 * centralises retry/error messaging.
 */

import type {
  MfaEnablePayload,
  MfaEnableResponse,
  MfaSetupResponse,
  MfaStatusResponse,
  MfaVerifyPayload,
  MfaVerifyResponse,
} from '@/modules/auth/types';

/** Base path shared by MFA API handlers. */
const MFA_API_BASE = '/api/auth/mfa';

/**
 * Parses a JSON response and throws a typed error when the API indicates
 * failure. All MFA fetch helpers delegate to this function.
 */
async function parseResponse<T>(
  response: Response,
  fallbackMessage: string
): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    const message = payload?.error ?? fallbackMessage;
    const error = new Error(message) as Error & {
      status?: number;
      details?: unknown;
    };
    error.status = response.status;
    error.details = payload?.details;
    throw error;
  }
  return (payload?.data ?? payload) as T;
}

/**
 * Initiates MFA setup for the currently authenticated user.
 */
export async function requestMfaSetup(): Promise<MfaSetupResponse> {
  const response = await fetch(`${MFA_API_BASE}/setup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({}),
  });

  return parseResponse<MfaSetupResponse>(response, 'Unable to start MFA setup');
}

/**
 * Completes MFA enablement once the user verifies their authenticator code.
 */
export async function enableMfa(
  payload: MfaEnablePayload
): Promise<MfaEnableResponse> {
  const response = await fetch(`${MFA_API_BASE}/enable`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  return parseResponse<MfaEnableResponse>(response, 'Unable to enable MFA');
}

/**
 * Verifies the MFA challenge during sign-in using either TOTP or a backup code.
 */
export async function verifyMfa(
  payload: MfaVerifyPayload
): Promise<MfaVerifyResponse> {
  const response = await fetch(`${MFA_API_BASE}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  return parseResponse<MfaVerifyResponse>(
    response,
    'Unable to verify MFA code'
  );
}

/**
 * Fetches the logged-in user's MFA status to power gating and messaging.
 */
export async function fetchMfaStatus(): Promise<MfaStatusResponse> {
  const response = await fetch(`${MFA_API_BASE}/status`, {
    method: 'GET',
    credentials: 'include',
  });

  return parseResponse<MfaStatusResponse>(
    response,
    'Unable to fetch MFA status'
  );
}
