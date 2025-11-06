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

import { logger } from '@/lib/logger';
import {
  PLACEHOLDER_SUPABASE_ANON_KEY,
  PLACEHOLDER_SUPABASE_URL,
  serverEnv,
} from '@/env/server';

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
 * Uses process.env directly to work in Edge Runtime (Vercel)
 */
function validateSupabaseEnv(): void {
  // Use process.env directly instead of serverEnv wrapper to avoid
  // ENVIRONMENT_FALLBACK errors in Vercel's Edge Runtime
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (
    !url ||
    url === PLACEHOLDER_SUPABASE_URL ||
    url.startsWith('MISSING_') ||
    url.startsWith('INVALID_')
  ) {
    throw new Error(
      'Missing or invalid NEXT_PUBLIC_SUPABASE_URL. Set the project URL before starting the server.'
    );
  }

  try {
    new URL(url);
  } catch (_error) {
    throw new Error(`Invalid Supabase URL format: ${url}`);
  }

  if (!anonKey || anonKey === PLACEHOLDER_SUPABASE_ANON_KEY) {
    throw new Error(
      'Missing or invalid NEXT_PUBLIC_SUPABASE_ANON_KEY. Set the publishable key before starting the server.'
    );
  }
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
            logger.warn('Failed to set cookie in middleware:', error);
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
            logger.warn('Failed to read cookies:', error);
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
              logger.warn('Failed to set cookie:', error);
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
