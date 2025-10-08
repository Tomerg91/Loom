import type { ClientEnv } from '@/env';

export interface ValidateClientEnvOptions {
  allowPlaceholders?: boolean;
}

export function validateClientEnv(
  env: ClientEnv,
  { allowPlaceholders = false }: ValidateClientEnvOptions = {}
) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error(
      'Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL. Please set this variable in your deployment environment (Vercel dashboard, .env.local, etc.).'
    );
  }

  if (!anonKey) {
    throw new Error(
      'Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY. Please set this variable in your deployment environment (Vercel dashboard, .env.local, etc.).'
    );
  }

  const placeholderPatterns = [
    'MISSING_',
    'INVALID_',
    'your-project-id',
    'your-supabase',
    'localhost:54321',
  ];

  if (!allowPlaceholders && placeholderPatterns.some(pattern => url.includes(pattern))) {
    throw new Error(
      `Invalid Supabase URL configuration: "${url}". This appears to be a placeholder value. Please set the correct Supabase URL in your environment variables. Expected format: https://your-project-ref.supabase.co`
    );
  }

  try {
    const parsedUrl = new URL(url);
    const validPatterns = ['supabase.co', 'supabase.com', 'localhost'];
    const isValidPattern = validPatterns.some(pattern => parsedUrl.hostname.includes(pattern));
    if (!isValidPattern && process.env.NODE_ENV === 'development') {
      console.warn(`Warning: Supabase URL "${url}" does not match expected patterns.`);
    }
  } catch (_error) {
    throw new Error(
      `Invalid Supabase URL format: "${url}". Expected a valid URL like: https://your-project-ref.supabase.co`
    );
  }

  const looksLegacyJwt = anonKey.startsWith('eyJ');
  const looksNewKey = anonKey.startsWith('sb_');
  if (!looksLegacyJwt && !looksNewKey) {
    const prefix = anonKey.substring(0, 8);
    throw new Error(
      `Invalid Supabase publishable/anon key prefix: "${prefix}...". Expected a legacy JWT (eyJ...) or a new publishable key (sb_...).`
    );
  }

  if (!allowPlaceholders && anonKey.includes('your-supabase')) {
    throw new Error(
      'Invalid Supabase key: appears to be a placeholder value. Please set the correct publishable key from your Supabase dashboard.'
    );
  }
}
