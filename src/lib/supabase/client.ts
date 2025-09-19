import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/supabase';
import { env } from '@/env';

// Direct access to client-safe environment variables
// Note: Only NEXT_PUBLIC_ prefixed variables are available on the client
const NEXT_PUBLIC_SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const NEXT_PUBLIC_SUPABASE_ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
      const errorMsg = 'Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL. ' +
        'Please set this variable in your deployment environment (Vercel dashboard, .env.local, etc.).';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
    
    if (!NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const errorMsg = 'Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
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
      'localhost:54321' // Common local dev URL
    ];
    
    if (placeholderPatterns.some(pattern => NEXT_PUBLIC_SUPABASE_URL.includes(pattern))) {
      const errorMsg = `Invalid Supabase URL configuration: "${NEXT_PUBLIC_SUPABASE_URL}". ` +
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
        'localhost' // Allow localhost for development
      ];
      
      const isValidPattern = validPatterns.some(pattern => url.hostname.includes(pattern));
      if (!isValidPattern) {
        console.warn(`Warning: Supabase URL "${NEXT_PUBLIC_SUPABASE_URL}" does not match expected patterns.`);
      }
    } catch (error) {
      const errorMsg = `Invalid Supabase URL format: "${NEXT_PUBLIC_SUPABASE_URL}". ` +
        'Expected a valid URL like: https://your-project-ref.supabase.co';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
    
    // Validate publishable key format: allow legacy JWT (eyJ...) and new keys (sb_...)
    const looksLegacyJwt = NEXT_PUBLIC_SUPABASE_ANON_KEY.startsWith('eyJ');
    const looksNewKey = NEXT_PUBLIC_SUPABASE_ANON_KEY.startsWith('sb_');
    if (!looksLegacyJwt && !looksNewKey) {
      const prefix = NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 8);
      const errorMsg = `Invalid Supabase publishable/anon key prefix: "${prefix}...". ` +
        'Expected a legacy JWT (eyJ...) or a new publishable key (sb_...).';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
    
    // Additional placeholder detection
    if (NEXT_PUBLIC_SUPABASE_ANON_KEY.includes('your-supabase')) {
      const errorMsg = 'Invalid Supabase key: appears to be a placeholder value. ' +
        'Please set the correct publishable key from your Supabase dashboard.';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
  }
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
        },
      }
    );
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

export const supabase = new Proxy({} as ReturnType<typeof createBrowserClient<Database>>, {
  get(target, prop) {
    if (!_lazyClient) {
      _lazyClient = createClient();
    }
    return _lazyClient[prop as keyof typeof _lazyClient];
  }
});
