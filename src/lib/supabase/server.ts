import 'server-only';

import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { type NextRequest, type NextResponse } from 'next/server';
import { type Database } from '@/types/supabase';
import { env } from '@/env';

// Singleton instances to prevent multiple GoTrueClient creation
// We intentionally widen the Supabase generic to `any` because our generated
// Database types are currently out of sync with the latest migrations. Using
// the concrete `Database` type was causing thousands of false-positive
// TypeScript errors whenever new tables or RPC functions were referenced. Once
// the schema types are regenerated we can tighten this back up.
type LooseSupabaseClient = ReturnType<typeof createSupabaseServerClient<any>>;
type LooseAdminClient = ReturnType<typeof createSupabaseClient<any>>;

type SupabaseCookie = {
  name: string;
  value: string;
  options?: Record<string, unknown> & { sameSite?: 'strict' | 'lax' | 'none' | boolean };
};

let serverClientInstance: LooseSupabaseClient | null = null;
let adminClientInstance: LooseAdminClient | null = null;

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
export const createServerClientWithRequest = (request: NextRequest, response: NextResponse) => {
  validateSupabaseEnv();
  
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  return createSupabaseServerClient<any>(
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
export const createClient = () => {
  validateSupabaseEnv();

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  let cookieStore: ReturnType<typeof cookies> | null = null;
  try {
    cookieStore = cookies();
  } catch (error) {
    console.warn('Cookies not available, falling back to cookieless client:', error);
  }

  const cookieAdapter = cookieStore
    ? {
        getAll: () => {
          try {
            return cookieStore!
              .getAll()
              .map(({ name, value }) => ({ name, value })) as SupabaseCookie[];
          } catch (error) {
            console.warn('Failed to read cookies:', error);
            return [] as SupabaseCookie[];
          }
        },
        setAll: (newCookies: SupabaseCookie[]) => {
          const mutableStore = cookieStore as unknown as {
            set?: (name: string, value: string, options?: Record<string, unknown>) => void;
          };

          if (!mutableStore?.set) {
            return;
          }

          newCookies.forEach(({ name, value, options }) => {
            try {
              const sameSiteValue = options?.sameSite === true
                ? 'strict'
                : options?.sameSite === false
                  ? 'none'
                  : options?.sameSite;

              mutableStore.set(name, value, {
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
  
  adminClientInstance = createSupabaseClient<any>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  
  return adminClientInstance;
};
