import { env } from '@/env';

export function validateSupabaseEnv() {
  if (!env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL');
  }
  if (!env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  if (env.NEXT_PUBLIC_SUPABASE_URL.startsWith('MISSING_') || env.NEXT_PUBLIC_SUPABASE_URL.startsWith('INVALID_')) {
    throw new Error(`Invalid Supabase URL configuration: ${env.NEXT_PUBLIC_SUPABASE_URL}`);
  }

  try {
    new URL(env.NEXT_PUBLIC_SUPABASE_URL);
  } catch (error) {
    throw new Error(`Invalid Supabase URL format: ${env.NEXT_PUBLIC_SUPABASE_URL}`);
  }
}

export function getSupabaseUrl() {
  validateSupabaseEnv();
  return env.NEXT_PUBLIC_SUPABASE_URL!;
}

export function getSupabaseAnonKey() {
  validateSupabaseEnv();
  return env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
}

export function getSupabaseServiceRoleKey() {
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error('Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY');
  }
  return serviceRoleKey;
}
