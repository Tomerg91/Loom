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
type LooseSupabaseClient = ReturnType<typeof createSupabaseServerClient<any>>;
type LooseAdminClient = ReturnType<typeof createSupabaseClient<any>>;

type SupabaseCookie = {
  name: string;
  value: string;
  options?: Record<string, unknown> & { sameSite?: 'strict' | 'lax' | 'none' | boolean };
};

let serverClientInstance: LooseSupabaseClient | null = null;
let adminClientInstance: LooseAdminClient | null = null;

function validateSupabaseEnv() {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = env.server;

  if (!NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL');
  }

  if (!NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  if (
    NEXT_PUBLIC_SUPABASE_URL.startsWith('MISSING_') ||
    NEXT_PUBLIC_SUPABASE_URL.startsWith('INVALID_')
  ) {
    throw new Error(`Invalid Supabase URL configuration: ${NEXT_PUBLIC_SUPABASE_URL}`);
  }

  try {
    new URL(env.NEXT_PUBLIC_SUPABASE_URL);
  } catch (_error) {
    throw new Error(`Invalid Supabase URL format: ${env.NEXT_PUBLIC_SUPABASE_URL}`);
  }
}

export const createServerClient = () => {
  validateSupabaseEnv();

  if (serverClientInstance) {
    return serverClientInstance;
  }
  
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  
  serverClientInstance = createSupabaseServerClient<any>(
    NEXT_PUBLIC_SUPABASE_URL!,
    NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

export const createServerClientWithRequest = (request: NextRequest, response: NextResponse) => {
  validateSupabaseEnv();
  
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  
  return createSupabaseServerClient<any>(
    NEXT_PUBLIC_SUPABASE_URL!,
    NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
                sameSite: sameSiteValue,
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

export const createClient = () => {
  validateSupabaseEnv();

  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = env.server;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cookieStore: any | null = null;
  try {
    const { cookies } = require('next/headers');
    cookieStore = cookies();
  } catch (_error) {
    // Cookies not available in client context - will fall back to cookieless client
  }

  const cookieAdapter = cookieStore
    ? {
        getAll: () => {
          try {
            return cookieStore!
              .getAll()
              .map(({ name, value }: { name: string; value: string }) => ({ name, value })) as SupabaseCookie[];
          } catch (error) {
            console.warn('Failed to read cookies:', error);
            return [] as SupabaseCookie[];
          }
        },
        setAll: (newCookies: SupabaseCookie[]) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createSupabaseServerClient<any>(supabaseUrl, supabaseKey, {
    cookies: cookieAdapter,
  });
};

export const createAdminClient = () => {
  validateSupabaseEnv();

  if (adminClientInstance) {
    return adminClientInstance;
  }

  const { NEXT_PUBLIC_SUPABASE_URL } = env.server;
  const serviceRoleKey = env.server.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error('Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY');
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
