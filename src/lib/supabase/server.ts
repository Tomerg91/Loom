// Note: Server-only imports are lazy-loaded to prevent webpack bundling issues
// This file can be imported in client code, but the server-only functions
// (createServerClient, createAdminClient) will only work on the server.

import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { type NextRequest, type NextResponse } from 'next/server';

import { env } from '@/env';

// Singleton instances to prevent multiple GoTrueClient creation
// We intentionally widen the Supabase generic to `any` because our generated
// Database types are currently out of sync with the latest migrations. Using
// the concrete `Database` type was causing thousands of false-positive
// TypeScript errors whenever new tables or RPC functions were referenced. Once
// the schema types are regenerated we can tighten this back up.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseSupabaseClient = ReturnType<typeof createSupabaseServerClient<any>>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseAdminClient = ReturnType<typeof createSupabaseClient<any>>;

type SupabaseCookie = {
  name: string;
  value: string;
  options?: Record<string, unknown> & {
    sameSite?: 'strict' | 'lax' | 'none' | boolean;
  };
};

let serverClientInstance: LooseSupabaseClient | null = null;
let adminClientInstance: LooseAdminClient | null = null;

// Validate required environment variables
function validateSupabaseEnv() {
  if (!env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error(
      'Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL'
    );
  }
  if (!env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error(
      'Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  // Validate URL format
  if (
    env.NEXT_PUBLIC_SUPABASE_URL.startsWith('MISSING_') ||
    env.NEXT_PUBLIC_SUPABASE_URL.startsWith('INVALID_')
  ) {
    throw new Error(
      `Invalid Supabase URL configuration: ${env.NEXT_PUBLIC_SUPABASE_URL}`
    );
  }

  // Validate URL is actually a valid URL
  try {
    new URL(env.NEXT_PUBLIC_SUPABASE_URL);
  } catch (_error) {
    throw new Error(
      `Invalid Supabase URL format: ${env.NEXT_PUBLIC_SUPABASE_URL}`
    );
  }
}

// Server-side Supabase client for middleware (without cookie access)
export const createServerClient = () => {
  validateSupabaseEnv();

  if (serverClientInstance) {
    return serverClientInstance;
  }

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// Server-side Supabase client for middleware with request context
export const createServerClientWithRequest = (
  request: NextRequest,
  response: NextResponse
) => {
  validateSupabaseEnv();

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createSupabaseServerClient<any>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies: SupabaseCookie[]) => {
        cookies.forEach((cookie: SupabaseCookie) => {
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

// For route handlers and server components that have access to cookies
export const createClient = () => {
  validateSupabaseEnv();

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getCookieStore = () => {
    try {
      // Dynamic import to avoid bundling next/headers in client code
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { cookies } = require('next/headers');
      return cookies();
    } catch (_error) {
      // Cookies not available in client context
      return null;
    }
  };

  const cookieAdapter = {
    getAll: async () => {
      const cookieStorePromise = getCookieStore();
      if (!cookieStorePromise) return [] as SupabaseCookie[];

      try {
        const cookieStore = await cookieStorePromise;
        const allCookies = await cookieStore.getAll();
        return allCookies.map(({ name, value }: { name: string; value: string }) => ({
          name,
          value,
        })) as SupabaseCookie[];
      } catch (error) {
        console.warn('Failed to read cookies:', error);
        return [] as SupabaseCookie[];
      }
    },
    setAll: async (newCookies: SupabaseCookie[]) => {
      const cookieStorePromise = getCookieStore();
      if (!cookieStorePromise) return;

      try {
        const cookieStore = await cookieStorePromise;
        const mutableStore = cookieStore as unknown as {
          set?: (
            name: string,
            value: string,
            options?: Record<string, unknown>
          ) => void;
        };

        newCookies.forEach((cookie: SupabaseCookie) => {
          const { name, value, options } = cookie;
          try {
            const sameSiteValue =
              options?.sameSite === true
                ? 'strict'
                : options?.sameSite === false
                  ? 'none'
                  : options?.sameSite;

            mutableStore.set?.(name, value, {
              ...options,
              sameSite: sameSiteValue,
            });
          } catch (error) {
            console.warn('Failed to set cookie:', error);
          }
        });
      } catch (error) {
        console.warn('Failed to set cookies:', error);
      }
    },
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createSupabaseServerClient<any>(supabaseUrl, supabaseKey, {
    cookies: cookieAdapter,
  });
};

// Admin client with service role key for administrative operations
export const createAdminClient = () => {
  validateSupabaseEnv();

  if (adminClientInstance) {
    return adminClientInstance;
  }

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      'Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY'
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminClientInstance = createSupabaseClient<any>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClientInstance;
};
