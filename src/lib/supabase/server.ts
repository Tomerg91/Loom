import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { type NextRequest, type NextResponse } from 'next/server';
import { type Database } from '@/types/supabase';
import { env } from '@/env.mjs';
import { serverEnv } from '@/env-server.mjs';

// Singleton instances to prevent multiple GoTrueClient creation
let serverClientInstance: ReturnType<typeof createSupabaseServerClient<Database>> | null = null;
let adminClientInstance: ReturnType<typeof createSupabaseClient<Database>> | null = null;

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
  
  // Check if we're in a server context with cookies available
  try {
    // Dynamic import to avoid issues during build
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    
    return createSupabaseServerClient<Database>(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          getAll: () => {
            try {
              return cookieStore.getAll();
            } catch (error) {
              console.warn('Failed to get cookies:', error);
              return [];
            }
          },
          setAll: (cookies) => {
            cookies.forEach(({ name, value, options }) => {
              try {
                const sameSiteValue = options?.sameSite === true 
                  ? 'strict' as const
                  : (options?.sameSite === false 
                      ? 'none' as const 
                      : options?.sameSite as 'strict' | 'lax' | 'none' | undefined);
                
                cookieStore.set(name, value, {
                  ...options,
                  sameSite: sameSiteValue
                });
              } catch (error) {
                console.warn('Failed to set cookie:', error);
              }
            });
          },
        },
      }
    );
  } catch (error) {
    // Fallback for build-time or non-server contexts
    console.warn('Cookies not available, falling back to cookieless client:', error);
    return createSupabaseServerClient<Database>(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          getAll: () => [],
          setAll: () => {},
        },
      }
    );
  }
};

// Admin client with service role key for administrative operations
export const createAdminClient = () => {
  validateSupabaseEnv();
  
  if (adminClientInstance) {
    return adminClientInstance;
  }
  
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = serverEnv.SUPABASE_SERVICE_ROLE_KEY;
  
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