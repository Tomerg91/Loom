/**
 * Browser-safe environment loader. This wrapper re-exports the validated
 * client configuration from the shared runtime module so that TypeScript
 * consumers receive proper typing information.
 */
import {
  clientEnv as runtimeClientEnv,
  PLACEHOLDER_SUPABASE_ANON_KEY,
  PLACEHOLDER_SUPABASE_URL,
} from './runtime';

export const clientEnv = runtimeClientEnv;

export type ClientEnv = typeof runtimeClientEnv;

export { PLACEHOLDER_SUPABASE_ANON_KEY, PLACEHOLDER_SUPABASE_URL } from './runtime';

