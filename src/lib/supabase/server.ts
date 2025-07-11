import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { type NextRequest, type NextResponse } from 'next/server';
import { type Database } from '@/types/supabase';
import { env } from '@/env.mjs';

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
              response.cookies.set({
                name,
                value,
                ...options,
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
  
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  return createSupabaseServerClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) => {
            try {
              cookieStore.set(name, value, options);
            } catch (error) {
              console.warn('Failed to set cookie:', error);
            }
          });
        },
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