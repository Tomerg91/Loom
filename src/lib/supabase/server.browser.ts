import { env } from '@/env';

/**
 * Browser-safe stubs for server-only Supabase helpers.
 *
 * These exports allow shared modules to import the server helpers without
 * pulling Next.js server APIs like `next/headers` into client bundles.
 * Any direct invocation of these stubs at runtime will throw so issues can be
 * detected quickly during development.
 */
function createBrowserOnlyError(helperName: string): never {
  throw new Error(
    `${helperName} is only available in server contexts. ` +
      'Ensure you are using the client Supabase helper in the browser.'
  );
}

export const createServerClient = () => {
  createBrowserOnlyError('createServerClient');
};

export const createServerClientWithRequest = () => {
  createBrowserOnlyError('createServerClientWithRequest');
};

export const createClient = async () => {
  createBrowserOnlyError('createClient (server helper)');
};

export const createAdminClient = () => {
  createBrowserOnlyError('createAdminClient');
};

// Re-exporting env here ensures the module keeps parity with the server helper
// dependencies, which helps bundlers apply the correct tree-shaking behaviour.
export const __supabaseEnv = {
  url: env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
};
