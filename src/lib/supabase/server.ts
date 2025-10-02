// TODO: Re-add server-only after auth refactor
// import 'server-only';

import { AsyncLocalStorage } from 'async_hooks';
import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { type NextRequest, type NextResponse } from 'next/server';
import { type Database } from '@/types/supabase';
import { env } from '@/env';

// Singleton instances to prevent multiple GoTrueClient creation
let serverClientInstance: ReturnType<typeof createSupabaseServerClient<Database>> | null = null;
let adminClientInstance: ReturnType<typeof createSupabaseClient<Database>> | null = null;

type SupabaseCookie = {
  name: string;
  value: string;
  options?: {
    domain?: string;
    path?: string;
    expires?: Date;
    httpOnly?: boolean;
    maxAge?: number;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none' | boolean;
  };
};

type SameSiteOption = 'strict' | 'lax' | 'none' | boolean | undefined;

type CookieAdapter = {
  getAll: () => SupabaseCookie[];
  setAll: (cookies: SupabaseCookie[]) => void;
};

type CookieStoreLike = {
  getAll: () => SupabaseCookie[];
  set: (...args: any[]) => void;
};

const cookieContext = new AsyncLocalStorage<CookieAdapter>();

function normalizeSameSite(value: SameSiteOption) {
  if (value === true) {
    return 'strict';
  }
  if (value === false) {
    return 'none';
  }
  return value;
}

function createAdapterFromCookieStore(cookieStore: CookieStoreLike): CookieAdapter {
  return {
    getAll: () => {
      try {
        return cookieStore.getAll();
      } catch (error) {
        console.warn('Failed to read cookies for Supabase client:', error);
        return [];
      }
    },
    setAll: (cookies) => {
      cookies.forEach(({ name, value, options }) => {
        try {
          const sameSite = normalizeSameSite(options?.sameSite);
          const normalizedOptions = { ...options, sameSite };

          if (typeof cookieStore.set === 'function') {
            try {
              (cookieStore.set as (cookie: SupabaseCookie) => void)({
                name,
                value,
                ...normalizedOptions,
              });
            } catch (setError) {
              try {
                (cookieStore.set as (name: string, value: string, options?: SupabaseCookie['options']) => void)(
                  name,
                  value,
                  normalizedOptions
                );
              } catch (fallbackError) {
                console.warn('Failed to set cookie for Supabase client:', fallbackError);
              }
            }
          }
        } catch (error) {
          console.warn('Failed to set cookie for Supabase client:', error);
        }
      });
    },
  };
}

export const withSupabaseRouteHandler = async <T>(cookieStore: CookieStoreLike, callback: () => Promise<T>) => {
  const adapter = createAdapterFromCookieStore(cookieStore);
  return await cookieContext.run(adapter, callback);
};

export const setSupabaseCookieStore = (cookieStore: CookieStoreLike) => {
  const adapter = createAdapterFromCookieStore(cookieStore);
  cookieContext.enterWith(adapter);
};

function getCookieAdapter(): CookieAdapter | null {
  return cookieContext.getStore() ?? null;
}

// Validate required environment variables
function validateSupabaseEnv() {
  if (!env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL');
  }
  if (!env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  
  // Validate URL format
  if (env.NEXT_PUBLIC_SUPABASE_URL.startsWith('MISSING_') || env.NEXT_PUBLIC_SUPABASE_URL.startsWith('INVALID_')) {
    throw new Error(`Invalid Supabase URL configuration: ${env.NEXT_PUBLIC_SUPABASE_URL}`);
  }
  
  // Validate URL is actually a valid URL
  try {
    new URL(env.NEXT_PUBLIC_SUPABASE_URL);
  } catch (error) {
    throw new Error(`Invalid Supabase URL format: ${env.NEXT_PUBLIC_SUPABASE_URL}`);
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
  
  serverClientInstance = createSupabaseServerClient<Database>(
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
export const createServerClientWithRequest = (request: NextRequest, response: NextResponse) => {
  validateSupabaseEnv();
  
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  return createSupabaseServerClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) => {
            try {
              const sameSiteValue = options?.sameSite === true 
                ? 'strict' as const
                : (options?.sameSite === false 
                    ? 'none' as const 
                    : options?.sameSite as 'strict' | 'lax' | 'none' | undefined);
              
              response.cookies.set({
                name,
                value,
                ...options,
                sameSite: sameSiteValue
              });
            } catch (error) {
              console.warn('Failed to set cookie in middleware:', error);
            }
          });
        },
      },
    }
  );
};

// For route handlers and server components that have access to cookies
export const createClient = async () => {
  validateSupabaseEnv();

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const cookieAdapter = getCookieAdapter();

  if (!cookieAdapter) {
    console.warn('Supabase cookie context not found. Returning client without cookie persistence.');
  }

  return createSupabaseServerClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      cookies: cookieAdapter ?? {
        getAll: () => [],
        setAll: () => {},
      },
    }
  );
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
    throw new Error('Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY');
  }
  
  adminClientInstance = createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  
  return adminClientInstance;
};
