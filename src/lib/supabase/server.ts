import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { type NextRequest, type NextResponse } from 'next/server';
import { type Database } from '@/types/supabase';

// Server-side Supabase client for middleware (without cookie access)
export const createServerClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  return createSupabaseServerClient<Database>(
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
};

// Server-side Supabase client for middleware with request context
export const createServerClientWithRequest = (request: NextRequest, response: NextResponse) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  return createSupabaseServerClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        get: (name: string) => request.cookies.get(name)?.value,
        set: (name: string, value: string, options: { maxAge?: number; httpOnly?: boolean; secure?: boolean; sameSite?: 'strict' | 'lax' | 'none'; path?: string }) => {
          try {
            response.cookies.set({
              name,
              value,
              ...options,
            });
          } catch (error) {
            console.warn('Failed to set cookie in middleware:', error);
          }
        },
        remove: (name: string, options: { path?: string; domain?: string }) => {
          try {
            response.cookies.set({
              name,
              value: '',
              ...options,
              maxAge: 0,
            });
          } catch (error) {
            console.warn('Failed to remove cookie in middleware:', error);
          }
        },
      },
    }
  );
};

// For route handlers and server components that have access to cookies
export const createClient = async () => {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  return createSupabaseServerClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: { maxAge?: number; httpOnly?: boolean; secure?: boolean; sameSite?: 'strict' | 'lax' | 'none'; path?: string }) => {
          try {
            cookieStore.set(name, value, options);
          } catch (error) {
            // Handle cookie setting errors in read-only contexts
            console.warn('Failed to set cookie:', error);
          }
        },
        remove: (name: string, options: { path?: string; domain?: string }) => {
          try {
            cookieStore.set(name, '', { ...options, maxAge: 0 });
          } catch (error) {
            // Handle cookie removal errors in read-only contexts
            console.warn('Failed to remove cookie:', error);
          }
        },
      },
    }
  );
};

// Admin client with service role key for administrative operations
export const createAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  return createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};