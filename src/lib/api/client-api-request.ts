'use client';

import { supabase } from '@/modules/platform/supabase/client';

/**
 * Fetches from the API with automatic Bearer token authentication.
 * This bypasses cookie-based authentication and uses explicit Authorization headers.
 *
 * Usage:
 *   const response = await apiRequest('/api/coach/stats');
 *   const data = await response.json();
 */
export async function apiRequest(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  try {
    // Get the current session and access token
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session?.access_token) {
      logger.error('[API-REQUEST] No access token available');
      throw new Error('Authentication required');
    }

    const accessToken = data.session.access_token;

    // Create or merge headers
    const headers = new Headers(init?.headers || {});
    headers.set('Authorization', `Bearer ${accessToken}`);

    // Make the request
    const response = await fetch(input, {
      ...init,
      headers,
    });

    return response;
  } catch (error) {
    logger.error('[API-REQUEST] Error making authenticated request:', error);
    throw error;
  }
}

/**
 * GET request with automatic authentication
 */
export async function apiGet<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const response = await apiRequest(url, { ...init, method: 'GET' });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`API Error: ${response.status} - ${JSON.stringify(errorData)}`);
  }
  return response.json();
}

/**
 * POST request with automatic authentication
 */
export async function apiPost<T = unknown>(
  url: string,
  body?: unknown,
  init?: RequestInit
): Promise<T> {
  const response = await apiRequest(url, {
    ...init,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
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
 * PUT request with automatic authentication
 */
export async function apiPut<T = unknown>(
  url: string,
  body?: unknown,
  init?: RequestInit
): Promise<T> {
  const response = await apiRequest(url, {
    ...init,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
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
 * DELETE request with automatic authentication
 */
export async function apiDelete<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const response = await apiRequest(url, { ...init, method: 'DELETE' });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`API Error: ${response.status} - ${JSON.stringify(errorData)}`);
  }
  return response.json();
}

/**
 * PATCH request with automatic authentication
 */
export async function apiPatch<T = unknown>(
  url: string,
  body?: unknown,
  init?: RequestInit
): Promise<T> {
  const response = await apiRequest(url, {
    ...init,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`API Error: ${response.status} - ${JSON.stringify(errorData)}`);
  }
  return response.json();
}
