/**
 * Backwards-compatible entry point for server-side environment access.
 * Prefer importing from `@/env/server` or `@/env/client` directly in new code
 * to make intent explicit.
 */
export { serverEnv, env } from './server';
export type { ServerEnv } from './server';

export { clientEnv } from './client';
export type { ClientEnv } from './client';

export {
  PLACEHOLDER_SUPABASE_ANON_KEY,
  PLACEHOLDER_SUPABASE_URL,
  resolveSupabaseAnonKey,
  resolveSupabaseUrl,
} from './server';
