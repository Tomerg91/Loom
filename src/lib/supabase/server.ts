// TODO: Re-add server-only after auth refactor
// import 'server-only';

import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies as getCookies } from 'next/headers';
import { type NextRequest, type NextResponse } from 'next/server';

import { env } from '@/env';
import { type Database } from '@/types/supabase';

// Singleton instances to prevent multiple GoTrueClient creation
let adminClientInstance: ReturnType<
  typeof createSupabaseClient<Database>
> | null = null;

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

type CookieStore = Awaited<ReturnType<typeof getCookies>>;

type SupabaseCookieOptions = {
  domain?: string;
  expires?: Date;
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: boolean | 'lax' | 'strict' | 'none';
  secure?: boolean;
};

// Normalize SameSite option values that Supabase might send as booleans
function normalizeSameSite(
  sameSite?: boolean | 'lax' | 'strict' | 'none'
): 'lax' | 'strict' | 'none' | undefined {
  if (sameSite === true) return 'strict';
  if (sameSite === false) return 'none';
  return sameSite;
}

function logCookieWarning(message: string, error: unknown) {
  const details = error instanceof Error ? error : new Error(String(error));
  console.warn(message, details);
}

function isPromiseLike<T>(value: unknown): value is PromiseLike<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'then' in value &&
    typeof (value as { then?: unknown }).then === 'function'
  );
}

function tryGetCookieStore(): CookieStore | null {
  try {
    const result = getCookies();
    if (isPromiseLike<CookieStore>(result)) {
      logCookieWarning(
        'Cookies API returned a promise, falling back to stateless Supabase client.',
        new Error('Unsupported cookies() result')
      );
      return null;
    }
    return result as unknown as CookieStore;
  } catch (error: unknown) {
    logCookieWarning(
      'Cookies not available in this context, using stateless Supabase client:',
      error
    );
    return null;
  }
}

function setCookie(
  cookieStore: CookieStore,
  name: string,
  value: string,
  options?: SupabaseCookieOptions
) {
  const storeWithSet = cookieStore as unknown as {
    set?: (
      name: string,
      value: string,
      options?: SupabaseCookieOptions
    ) => void;
  };

  if (typeof storeWithSet.set === 'function') {
    storeWithSet.set(name, value, {
      ...options,
      sameSite: normalizeSameSite(options?.sameSite),
    });
  }
}

function removeCookie(
  cookieStore: CookieStore,
  name: string,
  options?: SupabaseCookieOptions
) {
  const storeWithDelete = cookieStore as unknown as {
    delete?: (name: string, options?: SupabaseCookieOptions) => void;
    set?: (
      name: string,
      value: string,
      options?: SupabaseCookieOptions
    ) => void;
  };

  if (typeof storeWithDelete.delete === 'function') {
    storeWithDelete.delete(name, options);
    return;
  }

  if (typeof storeWithDelete.set === 'function') {
    storeWithDelete.set(name, '', { ...options, maxAge: 0 });
  }
}

// Server-side Supabase client aware of the current request cookies
export const createServerClient = () => {
  validateSupabaseEnv();

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const cookieStore = tryGetCookieStore();

  return createSupabaseServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      get: (name: string) => {
        if (!cookieStore) return undefined;
        try {
          return cookieStore.get(name)?.value;
        } catch (error: unknown) {
          logCookieWarning('Failed to read cookie:', error);
          return undefined;
        }
      },
      set: (name: string, value: string, options?: SupabaseCookieOptions) => {
        if (!cookieStore) return;
        try {
          setCookie(cookieStore, name, value, options);
        } catch (error: unknown) {
          logCookieWarning('Failed to set cookie:', error);
        }
      },
      remove: (name: string, options?: SupabaseCookieOptions) => {
        if (!cookieStore) return;
        try {
          removeCookie(cookieStore, name, options);
        } catch (error: unknown) {
          logCookieWarning('Failed to remove cookie:', error);
        }
      },
    },
  });
};

// Server-side Supabase client for middleware with request context
export const createServerClientWithRequest = (
  request: NextRequest,
  response: NextResponse
) => {
  validateSupabaseEnv();

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createSupabaseServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: cookies => {
        cookies.forEach(({ name, value, options }) => {
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
export const createClient = async () => {
  validateSupabaseEnv();

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Check if we're in a server context with cookies available
  try {
    // Dynamic import to avoid issues during build
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();

    return createSupabaseServerClient<Database>(supabaseUrl, supabaseKey, {
      cookies: {
        getAll: () => {
          try {
            return cookieStore.getAll();
          } catch (error) {
            console.warn('Failed to get cookies:', error);
            return [];
          }
        },
        setAll: cookies => {
          cookies.forEach(({ name, value, options }) => {
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

              cookieStore.set(name, value, {
                ...options,
                sameSite: sameSiteValue,
              });
            } catch (error) {
              console.warn('Failed to set cookie:', error);
            }
          });
        },
      },
    });
  } catch (error) {
    // Fallback for build-time or non-server contexts
    console.warn(
      'Cookies not available, falling back to cookieless client:',
      error
    );
    return createSupabaseServerClient<Database>(supabaseUrl, supabaseKey, {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    });
  }
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

  adminClientInstance = createSupabaseClient<Database>(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  return adminClientInstance;
};
