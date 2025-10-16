import 'server-only';

/**
 * Server-side environment loader that proxies to the shared runtime module. The
 * runtime is implemented in CommonJS so that Node-based tooling (Next config,
 * scripts) can consume the same validation logic without a TypeScript build
 * step.
 */
import {
  env as runtimeEnv,
  serverEnv as runtimeServerEnv,
  PLACEHOLDER_SUPABASE_ANON_KEY,
  PLACEHOLDER_SUPABASE_URL,
  resolveSupabaseAnonKey,
  resolveSupabaseUrl,
} from './runtime';

export const serverEnv = runtimeServerEnv;
export const env = runtimeEnv;

export type ServerEnv = typeof runtimeServerEnv;

export {
  PLACEHOLDER_SUPABASE_ANON_KEY,
  PLACEHOLDER_SUPABASE_URL,
  resolveSupabaseAnonKey,
  resolveSupabaseUrl,
} from './runtime';

