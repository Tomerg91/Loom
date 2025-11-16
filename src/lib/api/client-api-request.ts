'use client';

import { supabase } from '@/modules/platform/supabase/client';
import { CSRF_TOKEN_HEADER } from '@/lib/security/csrf';
import { fetchWithRetry, RETRY_PRESETS, type RetryConfig } from './retry';

/**
 * Get CSRF token from meta tag (set by layout/middleware)
 */
function getCSRFToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  // Try to get from meta tag first
  const metaTag = document.querySelector('meta[name="csrf-token"]');
  if (metaTag) {
    return metaTag.getAttribute('content');
  }

  // Try to get from last response header (stored in sessionStorage)
  return sessionStorage.getItem('csrf-token');
}

/**
 * Store CSRF token from response for future requests
 */
function storeCSRFToken(response: Response) {
  const csrfToken = response.headers.get(CSRF_TOKEN_HEADER);
  if (csrfToken && typeof window !== 'undefined') {
    sessionStorage.setItem('csrf-token', csrfToken);
  }
}

export interface ApiRequestOptions extends RequestInit {
  /** Custom retry configuration (default: 'default' preset) */
  retry?: RetryConfig | keyof typeof RETRY_PRESETS | false;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
}

/**
 * Fetches from the API with automatic Bearer token authentication, CSRF protection, and retry logic.
 * This bypasses cookie-based authentication and uses explicit Authorization headers.
 *
 * Features:
 * - Automatic authentication via Supabase session
 * - CSRF token inclusion for state-changing requests
 * - Automatic retry with exponential backoff on network errors and 5xx responses
 * - Request timeout handling
 *
 * Usage:
 *   const response = await apiRequest('/api/coach/stats');
 *   const response = await apiRequest('/api/sessions', { method: 'POST', body: JSON.stringify(data) });
 *   const response = await apiRequest('/api/data', { retry: 'aggressive' });
 *   const response = await apiRequest('/api/critical', { retry: false }); // No retries
 */
export async function apiRequest(
  input: RequestInfo | URL,
  options?: ApiRequestOptions
): Promise<Response> {
  const { retry = 'default', timeout = 30000, ...init } = options || {};

  try {
    // Get the current session and access token
    // First, try to get the cached session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !sessionData.session) {
      console.error('[API-REQUEST] No session available:', sessionError?.message);
      throw new Error('Authentication required');
    }

    let accessToken = sessionData.session.access_token;

    // Check if the token is expired or about to expire (within 60 seconds)
    const expiresAt = sessionData.session.expires_at;
    const now = Math.floor(Date.now() / 1000);
    const isExpired = expiresAt ? (expiresAt - now) < 60 : false;

    // If token is expired or about to expire, refresh it
    if (isExpired) {
      console.log('[API-REQUEST] Access token expired or expiring soon, refreshing...');
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

      if (refreshError || !refreshData.session?.access_token) {
        console.error('[API-REQUEST] Failed to refresh session:', refreshError?.message);
        throw new Error('Session expired. Please sign in again.');
      }

      accessToken = refreshData.session.access_token;
      console.log('[API-REQUEST] Session refreshed successfully');
    }

    // Create or merge headers
    const headers = new Headers(init?.headers || {});
    headers.set('Authorization', `Bearer ${accessToken}`);

    // Add CSRF token for state-changing requests
    const method = init?.method?.toUpperCase() || 'GET';
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const csrfToken = getCSRFToken();
      if (csrfToken) {
        headers.set(CSRF_TOKEN_HEADER, csrfToken);
      } else {
        console.warn('[API-REQUEST] No CSRF token available for state-changing request');
      }
    }

    // Log the request for debugging (redact the full token)
    console.log('[API-REQUEST] Making authenticated request:', {
      url: typeof input === 'string' ? input : input instanceof URL ? input.toString() : 'Request object',
      method,
      hasAuthHeader: headers.has('Authorization'),
      tokenPrefix: accessToken.substring(0, 20) + '...',
      timestamp: new Date().toISOString()
    });

    const fetchOptions: RequestInit = {
      ...init,
      headers,
    };

    // Determine retry configuration
    let retryConfig: RetryConfig | undefined;
    if (retry === false) {
      retryConfig = RETRY_PRESETS.none;
    } else if (typeof retry === 'string') {
      retryConfig = RETRY_PRESETS[retry];
    } else if (retry) {
      retryConfig = retry;
    } else {
      retryConfig = RETRY_PRESETS.default;
    }

    // Add timeout to retry config
    if (timeout) {
      retryConfig = { ...retryConfig, timeout };
    }

    // Make the request with retry logic
    const response = await fetchWithRetry(input, fetchOptions, retryConfig);

    // Store CSRF token from response for future requests
    storeCSRFToken(response);

    return response;
  } catch (error) {
    console.error('[API-REQUEST] Error making authenticated request:', error);
    throw error;
  }
}

/**
 * GET request with automatic authentication and retry
 */
export async function apiGet<T = unknown>(url: string, options?: ApiRequestOptions): Promise<T> {
  const response = await apiRequest(url, { ...options, method: 'GET' });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error(`[API-GET] Request failed:`, {
      url,
      status: response.status,
      statusText: response.statusText,
      error: errorData
    });
    throw new Error(`API Error: ${response.status} - ${JSON.stringify(errorData)}`);
  }
  return response.json();
}

/**
 * POST request with automatic authentication and retry
 */
export async function apiPost<T = unknown>(
  url: string,
  body?: unknown,
  options?: ApiRequestOptions
): Promise<T> {
  const response = await apiRequest(url, {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`API Error: ${response.status} - ${JSON.stringify(errorData)}`);
  }
  return response.json();
}

/**
 * PUT request with automatic authentication and retry
 */
export async function apiPut<T = unknown>(
  url: string,
  body?: unknown,
  options?: ApiRequestOptions
): Promise<T> {
  const response = await apiRequest(url, {
    ...options,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`API Error: ${response.status} - ${JSON.stringify(errorData)}`);
  }
  return response.json();
}

/**
 * DELETE request with automatic authentication and retry
 */
export async function apiDelete<T = unknown>(url: string, options?: ApiRequestOptions): Promise<T> {
  const response = await apiRequest(url, { ...options, method: 'DELETE' });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`API Error: ${response.status} - ${JSON.stringify(errorData)}`);
  }
  return response.json();
}

/**
 * PATCH request with automatic authentication and retry
 */
export async function apiPatch<T = unknown>(
  url: string,
  body?: unknown,
  options?: ApiRequestOptions
): Promise<T> {
  const response = await apiRequest(url, {
    ...options,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`API Error: ${response.status} - ${JSON.stringify(errorData)}`);
  }
  return response.json();
}
