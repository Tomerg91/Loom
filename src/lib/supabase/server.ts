import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { type NextRequest, type NextResponse } from 'next/server';
import { type Database } from '@/types/supabase';

// Server-side Supabase client for middleware
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

// For route handlers and server components that have access to cookies
export const createClient = async () => {
  const { cookies } = await import('next/headers');
  const cookieStore = cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  return createSupabaseServerClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: any) => {
          try {
            cookieStore.set(name, value, options);
          } catch (error) {
            // Handle cookie setting errors
          }
        },
        remove: (name: string, options: any) => {
          try {
            cookieStore.set(name, '', { ...options, maxAge: 0 });
          } catch (error) {
            // Handle cookie removal errors
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