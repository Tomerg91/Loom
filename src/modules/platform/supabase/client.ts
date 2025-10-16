/**
 * @fileoverview Browser Supabase client factory used across the application layer.
 *
 * The implementation centralizes creation, validation, and lifecycle management
 * for the Supabase browser SDK so UI features can share a hardened, singleton
 * instance. The factory performs runtime environment validation, adds retry
 * policies around token refresh, and surfaces a proxy-based lazy accessor that
 * mirrors the historical `supabase` singleton used in legacy modules.
 */

import { createBrowserClient } from '@supabase/ssr';

import {
  clientEnv,
  PLACEHOLDER_SUPABASE_ANON_KEY,
  PLACEHOLDER_SUPABASE_URL,
} from '@/env/client';
import { Database } from '@/types/supabase';

/**
 * Shape of the browser Supabase client so downstream modules can reference a
 * stable type even as the underlying SDK evolves.
 */
export type BrowserSupabaseClient = ReturnType<
  typeof createBrowserClient<Database>
>;

type BrowserClientSingleton = {
  /** Cached singleton instance kept alive across HMR reloads. */
  __sbClient?: BrowserSupabaseClient;
};

const globalForSupabase = globalThis as unknown as BrowserClientSingleton;
let clientInstance: BrowserSupabaseClient | null =
  globalForSupabase.__sbClient ?? null;

/** Maximum number of refresh retries before forcing a sign-out. */
const MAX_REFRESH_RETRIES = 3;

/** Base delay in milliseconds used for exponential backoff when retrying. */
const REFRESH_RETRY_DELAY_MS = 1_000;

/** Tracks consecutive refresh retries to avoid infinite loops. */
let tokenRefreshRetries = 0;

/** Flag used to ensure we only execute one invalid-token sign-out at a time. */
let isHandlingSignOut = false;

/**
 * Validate that the browser environment variables are present and not
 * placeholder values. The checks intentionally run only in the browser to keep
 * Next.js builds fast while still surfacing configuration issues at runtime.
 */
function validateClientEnv(): void {
  if (typeof window === 'undefined') return;

  const url = clientEnv.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error(
      'Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL. ' +
        'Update your deployment configuration or .env.local file to include it.'
    );
  }

  if (!anonKey) {
    throw new Error(
      'Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
        'Update your deployment configuration or .env.local file to include it.'
    );
  }

  const placeholderPatterns = [
    'MISSING_',
    'INVALID_',
    'your-project-id',
    'your-supabase',
    'localhost:54321',
  ];

  if (
    url === PLACEHOLDER_SUPABASE_URL ||
    placeholderPatterns.some(pattern => url.includes(pattern))
  ) {
    throw new Error(
      `Invalid Supabase URL configuration: "${url}". ` +
        'Replace placeholder values with the project URL from the Supabase dashboard.'
    );
  }

  try {
    const parsed = new URL(url);
    const validPatterns = ['supabase.co', 'supabase.com', 'localhost'];
    const matchesPattern = validPatterns.some(pattern =>
      parsed.hostname.includes(pattern)
    );

    if (!matchesPattern) {
      console.warn(
        `Supabase URL "${url}" does not match expected patterns. Continuing anyway.`
      );
    }
  } catch (_error) {
    throw new Error(
      `Invalid Supabase URL format: "${url}". Expected a valid https://{project}.supabase.co URL.`
    );
  }

  const looksLegacyJwt = anonKey.startsWith('eyJ');
  const looksNewKey = anonKey.startsWith('sb_');
  if (!looksLegacyJwt && !looksNewKey) {
    throw new Error(
      `Invalid Supabase publishable key prefix: "${anonKey.substring(0, 8)}...". ` +
        'Expected a legacy JWT (eyJ...) or the newer sb_ prefixed key.'
    );
  }

  if (
    anonKey === PLACEHOLDER_SUPABASE_ANON_KEY ||
    anonKey.includes('your-supabase')
  ) {
    throw new Error(
      'Invalid Supabase anon key: appears to be a placeholder value. ' +
        'Replace it with the publishable key from the Supabase dashboard.'
    );
  }
}

/**
 * Forcefully clears local Supabase state and redirects to the sign-in screen.
 * Executed when refresh attempts exhaust all retries.
 */
async function handleInvalidToken(
  client: BrowserSupabaseClient
): Promise<void> {
  if (isHandlingSignOut) return;
  isHandlingSignOut = true;

  try {
    await client.auth.signOut({ scope: 'local' });

    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('loom-auth');
        localStorage.removeItem('loom-auth-token');
        sessionStorage.removeItem('loom-auth');
      } catch (storageError) {
        console.warn(
          'Failed to clear auth storage during forced sign-out:',
          storageError
        );
      }

      if (!window.location.pathname.includes('/signin')) {
        window.location.href = '/signin?expired=true';
      }
    }
  } catch (error) {
    console.error('Error during automatic sign-out:', error);
  } finally {
    isHandlingSignOut = false;
  }
}

/**
 * Attempts to refresh the Supabase session using exponential backoff. Returns
 * true when the refresh succeeds and false otherwise.
 */
async function retryTokenRefresh(
  client: BrowserSupabaseClient
): Promise<boolean> {
  for (let attempt = 0; attempt < MAX_REFRESH_RETRIES; attempt++) {
    try {
      const { data, error } = await client.auth.refreshSession();
      if (error) throw error;
      if (data.session) {
        tokenRefreshRetries = 0;
        return true;
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Token refresh attempt ${attempt + 1} failed:`, error);
      }

      if (attempt < MAX_REFRESH_RETRIES - 1) {
        await new Promise(resolve =>
          setTimeout(resolve, REFRESH_RETRY_DELAY_MS * 2 ** attempt)
        );
      }
    }
  }

  return false;
}

/**
 * Creates (or reuses) the singleton Supabase browser client. The instance is
 * cached across hot module reloads in development for stability.
 */
export const createClient = (): BrowserSupabaseClient => {
  if (typeof window !== 'undefined') {
    validateClientEnv();
  }

  if (clientInstance) {
    return clientInstance;
  }

  try {
    clientInstance = createBrowserClient<Database>(
      clientEnv.NEXT_PUBLIC_SUPABASE_URL,
      clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          storageKey: 'loom-auth',
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          flowType: 'pkce',
        },
      }
    );

    if (typeof window !== 'undefined') {
      clientInstance.auth.onAuthStateChange(async (event, session) => {
        switch (event) {
          case 'TOKEN_REFRESHED':
            tokenRefreshRetries = 0;
            break;
          case 'SIGNED_OUT':
            tokenRefreshRetries = 0;
            break;
          default:
            const eventName = event as string;

            if (
              !session &&
              eventName !== 'SIGNED_OUT' &&
              eventName !== 'INITIAL_SESSION'
            ) {
              if (tokenRefreshRetries < MAX_REFRESH_RETRIES) {
                tokenRefreshRetries++;
                const refreshed = await retryTokenRefresh(clientInstance!);
                if (!refreshed) {
                  await handleInvalidToken(clientInstance!);
                }
              } else {
                await handleInvalidToken(clientInstance!);
              }
            }
        }
      });

      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        const response = await originalFetch(...args);

        if (
          response.status === 401 &&
          args[0]?.toString().includes('supabase')
        ) {
          const cloned = response.clone();
          try {
            const data = await cloned.json();
            const message = data?.message as string | undefined;
            const isRefreshFailure =
              message?.includes('Invalid Refresh Token') ||
              message?.includes('Refresh Token Not Found') ||
              message?.includes('JWT expired');

            if (isRefreshFailure) {
              if (tokenRefreshRetries < MAX_REFRESH_RETRIES) {
                tokenRefreshRetries++;
                const refreshed = await retryTokenRefresh(clientInstance!);
                if (!refreshed) {
                  await handleInvalidToken(clientInstance!);
                }
              } else {
                await handleInvalidToken(clientInstance!);
              }
            }
          } catch (error) {
            // Non-JSON response – ignore.
            if (process.env.NODE_ENV === 'development') {
              console.warn(
                'Failed to parse Supabase auth error response:',
                error
              );
            }
          }
        }

        return response;
      };
    }

    if (process.env.NODE_ENV !== 'production') {
      globalForSupabase.__sbClient = clientInstance;
    }

    return clientInstance;
  } catch (error) {
    throw new Error(
      'Failed to initialize Supabase client. ' +
        'Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are configured. ' +
        `Original error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};

/**
 * Lazy proxy accessor that mirrors the legacy `supabase` singleton. This keeps
 * older modules working while new code can import the factory directly.
 */
export const supabase = new Proxy({} as BrowserSupabaseClient, {
  get(_target, prop) {
    if (!clientInstance) {
      clientInstance = createClient();
    }

    return clientInstance[prop as keyof BrowserSupabaseClient];
  },
});
