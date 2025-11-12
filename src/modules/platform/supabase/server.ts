/**
 * @fileoverview Server-side Supabase factories and guards used by API routes,
 * middleware, and background jobs. The module centralizes cookie-aware client
 * creation and protects service-role access behind explicit helpers so we can
 * safely share the logic across the platform module.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { NextRequest, NextResponse } from 'next/server';

import {
  PLACEHOLDER_SUPABASE_ANON_KEY,
  PLACEHOLDER_SUPABASE_URL,
  serverEnv,
} from '@/env/server';
import {
  ensureValidAuthEnvironment,
  retryWithBackoff,
  trackForceSignOut,
} from './server-auth-utils';

/**
 * Broad Supabase client type. We intentionally keep it loose until the
 * generated database types are refreshed to cover the full schema.
 */
export type ServerSupabaseClient = ReturnType<
  typeof createSupabaseServerClient<any>
>;
export type AdminSupabaseClient = ReturnType<typeof createSupabaseClient<any>>;

type SupabaseCookie = {
  name: string;
  value: string;
  options?: Record<string, unknown> & {
    sameSite?: 'strict' | 'lax' | 'none' | boolean;
  };
};

let serverClientInstance: ServerSupabaseClient | null = null;
let adminClientInstance: AdminSupabaseClient | null = null;

type NextCookieStore = {
  getAll: () => { name: string; value: string }[];
  set?: (
    name: string,
    value: string,
    options?: Record<string, unknown>
  ) => void;
};

/**
 * Validates the required server-side environment variables.
 * Uses comprehensive validation from server-auth-utils.
 * @deprecated Use ensureValidAuthEnvironment() directly for better error messages
 */
function validateSupabaseEnv(): void {
  ensureValidAuthEnvironment();
}

/**
 * Creates (or reuses) a server-side Supabase client without cookie context.
 * Useful for scripts or modules that operate outside an HTTP request.
 */
export const createServerClient = (): ServerSupabaseClient => {
  validateSupabaseEnv();

  if (serverClientInstance) {
    return serverClientInstance;
  }

  // Use process.env directly to work in Edge Runtime (Vercel)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;


  serverClientInstance = createSupabaseServerClient<any>(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        get: () => undefined,
        set: () => {},
        remove: () => {},
      },
    }
  );

  return serverClientInstance;
};

/**
 * Creates a cookie-aware Supabase server client tied to the incoming request
 * and outgoing response. Middleware and API routes should use this so token
 * rotation can set cookies on the fly.
 *
 * Uses process.env directly to work in Vercel's Edge Runtime
 */
export const createServerClientWithRequest = (
  request: NextRequest,
  response: NextResponse
): ServerSupabaseClient => {
  validateSupabaseEnv();

  // Use process.env directly instead of serverEnv wrapper to avoid
  // ENVIRONMENT_FALLBACK errors in Vercel's Edge Runtime
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;


  return createSupabaseServerClient<any>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies: SupabaseCookie[]) => {
        cookies.forEach(cookie => {
          const { name, value, options } = cookie;
          try {
            const sameSiteValue =
              options?.sameSite === true
                ? ('strict' as const)
                : options?.sameSite === false
                  ? ('none' as const)
                  : (options?.sameSite as
                      | 'strict'
                      | 'lax'
                      | 'none'
                      | undefined);

            response.cookies.set({
              name,
              value,
              ...options,
              sameSite: sameSiteValue,
            });
          } catch (error) {
            console.warn('Failed to set cookie in middleware:', error);
          }
        });
      },
    },
  });
};

/**
 * Creates a Supabase client that leverages Next.js' `cookies()` helper when
 * available. Falls back to a stateless client when not running on the server.
 */
export const createClient = (): ServerSupabaseClient => {
  validateSupabaseEnv();

  const supabaseUrl = serverEnv.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = serverEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  let cookieStore: NextCookieStore | null = null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { cookies } = require('next/headers') as {
      cookies: () => NextCookieStore;
    };
    cookieStore = cookies();
  } catch (_error) {
    // Not in a server context; fall back to a stateless adapter.
  }

  const cookieAdapter = cookieStore
    ? {
        getAll: () => {
          try {
            return cookieStore
              .getAll()
              .map(({ name, value }: { name: string; value: string }) => ({
                name,
                value,
              })) as SupabaseCookie[];
          } catch (error) {
            console.warn('Failed to read cookies:', error);
            return [] as SupabaseCookie[];
          }
        },
        setAll: (newCookies: SupabaseCookie[]) => {
          newCookies.forEach(cookie => {
            const { name, value, options } = cookie;
            try {
              const sameSiteValue =
                options?.sameSite === true
                  ? 'strict'
                  : options?.sameSite === false
                    ? 'none'
                    : options?.sameSite;

              cookieStore.set?.(name, value, {
                ...options,
                sameSite: sameSiteValue,
              });
            } catch (error) {
              console.warn('Failed to set cookie:', error);
            }
          });
        },
      }
    : {
        getAll: () => [] as SupabaseCookie[],
        setAll: () => {},
      };

   
  return createSupabaseServerClient<any>(supabaseUrl, supabaseKey, {
    cookies: cookieAdapter,
  });
};

/**
 * Creates a Supabase admin client using the service role key. Access is tightly
 * controlled and the key is never exposed to the browser.
 */
export const createAdminClient = (): AdminSupabaseClient => {
  validateSupabaseEnv();

  if (adminClientInstance) {
    return adminClientInstance;
  }

  const supabaseUrl = serverEnv.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = serverEnv.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      'Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY'
    );
  }

   
  adminClientInstance = createSupabaseClient<any>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClientInstance;
};

// ============================================================================
// SERVER-SIDE AUTH OPERATIONS WITH RETRY
// ============================================================================

/**
 * Refreshes the user session with retry logic and telemetry.
 * Use this in API routes that need to ensure valid session tokens.
 */
export async function refreshSessionWithRetry(
  client: ServerSupabaseClient
): Promise<{
  session: any | null;
  error: Error | null;
}> {
  try {
    const result = await retryWithBackoff(
      async () => {
        const { data, error } = await client.auth.refreshSession();
        if (error) throw error;
        return data;
      },
      {
        operation: 'session_refresh',
        maxRetries: 3,
        useCircuitBreaker: true,
        shouldRetry: (error: unknown) => {
          // Retry on network errors, not on auth errors
          if (error instanceof Error) {
            const message = error.message.toLowerCase();
            if (message.includes('unauthorized') || message.includes('invalid')) {
              return false;
            }
          }
          return true;
        }
      }
    );

    return { session: result.session, error: null };
  } catch (error) {
    return { session: null, error: error as Error };
  }
}

/**
 * Gets the current user with retry logic and telemetry.
 */
export async function getUserWithRetry(
  client: ServerSupabaseClient
): Promise<{
  user: any | null;
  error: Error | null;
}> {
  try {
    const result = await retryWithBackoff(
      async () => {
        const { data, error } = await client.auth.getUser();
        if (error) throw error;
        return data;
      },
      {
        operation: 'get_user',
        maxRetries: 2,
        useCircuitBreaker: true
      }
    );

    return { user: result.user, error: null };
  } catch (error) {
    return { user: null, error: error as Error };
  }
}

/**
 * Signs out the user with retry logic and telemetry.
 * Tracks forced sign-out events when called programmatically.
 */
export async function signOutWithRetry(
  client: ServerSupabaseClient,
  options?: {
    reason?: 'token_expired' | 'invalid_session' | 'security_violation' | 'mfa_required' | 'manual';
    userId?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<{ error: Error | null }> {
  try {
    // Track the sign-out event
    if (options?.reason) {
      trackForceSignOut({
        reason: options.reason,
        userId: options.userId,
        metadata: options.metadata
      });
    }

    await retryWithBackoff(
      async () => {
        const { error } = await client.auth.signOut();
        if (error) throw error;
      },
      {
        operation: 'sign_out',
        maxRetries: 2,
        useCircuitBreaker: false // Don't use circuit breaker for sign-out
      }
    );

    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

// Export the utilities for use in other modules
export { ensureValidAuthEnvironment, retryWithBackoff, trackForceSignOut };
