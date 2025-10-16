import { createBrowserClient } from '@supabase/ssr';

import {
  clientEnv,
  PLACEHOLDER_SUPABASE_ANON_KEY,
  PLACEHOLDER_SUPABASE_URL,
} from '@/env/client';
import { Database } from '@/types/supabase';

// Direct access to client-safe environment variables
// Note: Only NEXT_PUBLIC_ prefixed variables are available on the client
const NEXT_PUBLIC_SUPABASE_URL = clientEnv.NEXT_PUBLIC_SUPABASE_URL;
const NEXT_PUBLIC_SUPABASE_ANON_KEY = clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Debug logging for production issues (only in development)
if (process.env.NODE_ENV === 'development') {
  console.log('Supabase URL:', NEXT_PUBLIC_SUPABASE_URL);
  console.log('Has Anon Key:', !!NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

// Singleton instance to prevent multiple client creation
// Keep a single client across HMR to avoid multiple GoTrue instances
type SBClient = ReturnType<typeof createBrowserClient<Database>>;
const globalForSupabase = globalThis as unknown as { __sbClient?: SBClient };
let clientInstance: SBClient | null = globalForSupabase.__sbClient ?? null;

// Validate environment variables on client side
function validateClientEnv() {
  if (typeof window !== 'undefined') {
    // Check for missing environment variables
    if (!NEXT_PUBLIC_SUPABASE_URL) {
      const errorMsg =
        'Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL. ' +
        'Please set this variable in your deployment environment (Vercel dashboard, .env.local, etc.).';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    if (!NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const errorMsg =
        'Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
        'Please set this variable in your deployment environment (Vercel dashboard, .env.local, etc.).';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    // Check for placeholder values that indicate environment variables weren't properly set
    const placeholderPatterns = [
      'MISSING_',
      'INVALID_',
      'your-project-id',
      'your-supabase',
      'localhost:54321', // Common local dev URL
    ];

    if (
      NEXT_PUBLIC_SUPABASE_URL === PLACEHOLDER_SUPABASE_URL ||
      placeholderPatterns.some(pattern =>
        NEXT_PUBLIC_SUPABASE_URL.includes(pattern)
      )
    ) {
      const errorMsg =
        `Invalid Supabase URL configuration: "${NEXT_PUBLIC_SUPABASE_URL}". ` +
        'This appears to be a placeholder value. Please set the correct Supabase URL ' +
        'in your environment variables. Expected format: https://your-project-ref.supabase.co';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    // Validate URL format
    try {
      const url = new URL(NEXT_PUBLIC_SUPABASE_URL);

      // Check for valid Supabase hostname patterns
      const validPatterns = [
        'supabase.co',
        'supabase.com',
        'localhost', // Allow localhost for development
      ];

      const isValidPattern = validPatterns.some(pattern =>
        url.hostname.includes(pattern)
      );
      if (!isValidPattern) {
        console.warn(
          `Warning: Supabase URL "${NEXT_PUBLIC_SUPABASE_URL}" does not match expected patterns.`
        );
      }
    } catch (_error) {
      const errorMsg =
        `Invalid Supabase URL format: "${NEXT_PUBLIC_SUPABASE_URL}". ` +
        'Expected a valid URL like: https://your-project-ref.supabase.co';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    // Validate publishable key format: allow legacy JWT (eyJ...) and new keys (sb_...)
    const looksLegacyJwt = NEXT_PUBLIC_SUPABASE_ANON_KEY.startsWith('eyJ');
    const looksNewKey = NEXT_PUBLIC_SUPABASE_ANON_KEY.startsWith('sb_');
    if (!looksLegacyJwt && !looksNewKey) {
      const prefix = NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 8);
      const errorMsg =
        `Invalid Supabase publishable/anon key prefix: "${prefix}...". ` +
        'Expected a legacy JWT (eyJ...) or a new publishable key (sb_...).';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    // Additional placeholder detection
    if (
      NEXT_PUBLIC_SUPABASE_ANON_KEY === PLACEHOLDER_SUPABASE_ANON_KEY ||
      NEXT_PUBLIC_SUPABASE_ANON_KEY.includes('your-supabase')
    ) {
      const errorMsg =
        'Invalid Supabase key: appears to be a placeholder value. ' +
        'Please set the correct publishable key from your Supabase dashboard.';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
  }
}

// Enhanced error handling and retry logic for token refresh
let tokenRefreshRetries = 0;
const MAX_REFRESH_RETRIES = 3;
const REFRESH_RETRY_DELAY = 1000; // 1 second

// Track if we're currently handling a sign-out to prevent multiple attempts
let isHandlingSignOut = false;

// Graceful sign-out with cleanup
async function handleInvalidToken(client: SBClient) {
  if (isHandlingSignOut) {
    return; // Prevent concurrent sign-out attempts
  }

  isHandlingSignOut = true;

  try {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Invalid or expired token detected. Signing out...');
    }

    // Clear the session
    await client.auth.signOut({ scope: 'local' });

    // Clear all auth-related storage
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('loom-auth');
        localStorage.removeItem('loom-auth-token');
        sessionStorage.removeItem('loom-auth');
      } catch (_error) {
        // Storage might be unavailable
      }
    }

    // Redirect to sign-in page
    if (
      typeof window !== 'undefined' &&
      !window.location.pathname.includes('/signin')
    ) {
      window.location.href = '/signin?expired=true';
    }
  } catch (error) {
    console.error('Error during automatic sign-out:', error);
  } finally {
    isHandlingSignOut = false;
  }
}

// Retry token refresh with exponential backoff
async function retryTokenRefresh(client: SBClient): Promise<boolean> {
  for (let attempt = 0; attempt < MAX_REFRESH_RETRIES; attempt++) {
    try {
      const { data, error } = await client.auth.refreshSession();

      if (error) {
        throw error;
      }

      if (data.session) {
        tokenRefreshRetries = 0; // Reset on success
        if (process.env.NODE_ENV === 'development') {
          console.log('Token refresh successful on attempt', attempt + 1);
        }
        return true;
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Token refresh attempt ${attempt + 1} failed:`, error);
      }

      // Wait before retrying (exponential backoff)
      if (attempt < MAX_REFRESH_RETRIES - 1) {
        await new Promise(resolve =>
          setTimeout(resolve, REFRESH_RETRY_DELAY * Math.pow(2, attempt))
        );
      }
    }
  }

  return false; // All retries failed
}

// Client-side Supabase client for use in React components
export const createClient = () => {
  // Only validate on the client side to avoid build-time errors
  if (typeof window !== 'undefined') {
    validateClientEnv();
  }

  if (clientInstance) {
    return clientInstance;
  }

  try {
    clientInstance = createBrowserClient<Database>(
      NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          // Use a stable storage key and defaults suitable for SPA
          storageKey: 'loom-auth',
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          // Add retry options for better resilience
          flowType: 'pkce', // Use PKCE flow for better security
        },
      }
    );

    // Set up auth state change listeners for better error handling
    if (typeof window !== 'undefined') {
      clientInstance.auth.onAuthStateChange(async (event, session) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('Auth state changed:', event);
        }

        // Handle different auth events
        switch (event) {
          case 'TOKEN_REFRESHED':
            tokenRefreshRetries = 0;
            break;

          case 'SIGNED_OUT':
            // Clear local state on sign out
            tokenRefreshRetries = 0;
            break;

          case 'USER_UPDATED':
            // Session was updated successfully
            break;

          default:
            // Check if session is still valid
            const eventName = event as string;

            if (
              !session &&
              eventName !== 'SIGNED_OUT' &&
              eventName !== 'INITIAL_SESSION'
            ) {
              // Session is invalid, try to refresh
              if (tokenRefreshRetries < MAX_REFRESH_RETRIES) {
                tokenRefreshRetries++;
                const refreshed = await retryTokenRefresh(clientInstance!);

                if (!refreshed) {
                  // All refresh attempts failed
                  await handleInvalidToken(clientInstance!);
                }
              } else {
                // Max retries exceeded
                await handleInvalidToken(clientInstance!);
              }
            }
        }
      });

      // Global error handler for auth errors
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        try {
          const response = await originalFetch(...args);

          // Check for auth errors in responses
          if (
            response.status === 401 &&
            args[0]?.toString().includes('supabase')
          ) {
            const clonedResponse = response.clone();
            try {
              const data = await clonedResponse.json();

              // Check for specific auth errors
              if (
                data.message?.includes('Invalid Refresh Token') ||
                data.message?.includes('Refresh Token Not Found') ||
                data.message?.includes('JWT expired')
              ) {
                // Try to refresh the token
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
            } catch (_error) {
              // Response might not be JSON
            }
          }

          return response;
        } catch (error) {
          throw error;
        }
      };
    }

    // Persist across HMR in development
    if (process.env.NODE_ENV !== 'production') {
      globalForSupabase.__sbClient = clientInstance;
    }

    return clientInstance;
  } catch (error) {
    console.error('Failed to create Supabase client:', error);

    // Re-throw with more context
    throw new Error(
      `Failed to initialize Supabase client. This typically indicates missing or invalid environment variables. ` +
        `Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are properly set. ` +
        `Original error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};

// Lazy singleton client for client-side usage - only created when first accessed
let _lazyClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export const supabase = new Proxy(
  {} as ReturnType<typeof createBrowserClient<Database>>,
  {
    get(target, prop) {
      if (!_lazyClient) {
        _lazyClient = createClient();
      }
      return _lazyClient[prop as keyof typeof _lazyClient];
    },
  }
);
