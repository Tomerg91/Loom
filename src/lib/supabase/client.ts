import { createBrowserClient } from '@supabase/ssr';

import { env } from '@/env';
import { createClientCache } from './clientCache';
import { validateClientEnv } from './validateClientEnv';
import { Database } from '@/types/supabase';

type SupabaseBrowserClient = ReturnType<typeof createBrowserClient<Database>>;

const clientCache = createClientCache<SupabaseBrowserClient>();

let tokenRefreshRetries = 0;
const MAX_REFRESH_RETRIES = 3;
const REFRESH_RETRY_DELAY = 1000;
let isHandlingSignOut = false;

function createSupabaseClientInstance(): SupabaseBrowserClient {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = env.client;
  return createBrowserClient<Database>(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY,
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
}

async function handleInvalidToken(client: SupabaseBrowserClient) {
  if (isHandlingSignOut) {
    return;
  }

  isHandlingSignOut = true;

  try {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Invalid or expired token detected. Signing out...');
    }

    await client.auth.signOut({ scope: 'local' });

    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('loom-auth');
        localStorage.removeItem('loom-auth-token');
        sessionStorage.removeItem('loom-auth');
      } catch (error) {
        console.warn('Unable to clear auth storage during sign out.', error);
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

async function retryTokenRefresh(client: SupabaseBrowserClient): Promise<boolean> {
  for (let attempt = 0; attempt < MAX_REFRESH_RETRIES; attempt++) {
    try {
      const { data, error } = await client.auth.refreshSession();

      if (error) {
        throw error;
      }

      if (data.session) {
        tokenRefreshRetries = 0;
        if (process.env.NODE_ENV === 'development') {
          console.log('Token refresh successful on attempt', attempt + 1);
        }
        return true;
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Token refresh attempt ${attempt + 1} failed:`, error);
      }

      if (attempt < MAX_REFRESH_RETRIES - 1) {
        await new Promise(resolve =>
          setTimeout(resolve, REFRESH_RETRY_DELAY * Math.pow(2, attempt))
        );
      }
    }
  }

  return false;
}

function attachBrowserSideEffects(client: SupabaseBrowserClient) {
  if (typeof window === 'undefined') {
    return;
  }

  client.auth.onAuthStateChange(async (event, session) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Auth state changed:', event);
    }

    switch (event) {
      case 'TOKEN_REFRESHED': {
        tokenRefreshRetries = 0;
        break;
      }
      case 'SIGNED_OUT': {
        tokenRefreshRetries = 0;
        break;
      }
      default: {
        if (!session && event !== 'SIGNED_OUT' && event !== 'INITIAL_SESSION') {
          if (tokenRefreshRetries < MAX_REFRESH_RETRIES) {
            tokenRefreshRetries++;
            const refreshed = await retryTokenRefresh(client);
            if (!refreshed) {
              await handleInvalidToken(client);
            }
          } else {
            await handleInvalidToken(client);
          }
        }
      }
    }
  });

  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);

    if (response.status === 401 && args[0]?.toString().includes('supabase')) {
      try {
        const clonedResponse = response.clone();
        const data = await clonedResponse.json();
        if (
          data.message?.includes('Invalid Refresh Token') ||
          data.message?.includes('Refresh Token Not Found') ||
          data.message?.includes('JWT expired')
        ) {
          if (tokenRefreshRetries < MAX_REFRESH_RETRIES) {
            tokenRefreshRetries++;
            const refreshed = await retryTokenRefresh(client);
            if (!refreshed) {
              await handleInvalidToken(client);
            }
          } else {
            await handleInvalidToken(client);
          }
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Failed to inspect Supabase auth error response', error);
        }
      }
    }

    return response;
  };
}

function ensureValidatedClientEnv() {
  try {
    validateClientEnv(env.client);
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export function createClient(): SupabaseBrowserClient {
  ensureValidatedClientEnv();

  const cached = clientCache.get();
  if (cached) {
    return cached;
  }

  const client = createSupabaseClientInstance();

  if (process.env.NODE_ENV === 'development') {
    console.log('Supabase URL:', env.client.NEXT_PUBLIC_SUPABASE_URL);
    console.log('Has Anon Key:', !!env.client.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  }

  attachBrowserSideEffects(client);
  clientCache.set(client);

  return client;
}

export function createRscClient(): SupabaseBrowserClient {
  ensureValidatedClientEnv();
  return createSupabaseClientInstance();
}

let lazyClient: SupabaseBrowserClient | null = null;

export const supabase = new Proxy({} as SupabaseBrowserClient, {
  get(_target, prop: keyof SupabaseBrowserClient) {
    if (!lazyClient) {
      lazyClient = createClient();
    }
    return lazyClient[prop];
  },
});
