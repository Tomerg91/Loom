import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/supabase';

// Direct access to client-safe environment variables
// Note: Only NEXT_PUBLIC_ prefixed variables are available on the client
const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Debug logging for production issues (only in development)
if (process.env.NODE_ENV === 'development') {
  console.log('Supabase URL:', NEXT_PUBLIC_SUPABASE_URL);
  console.log('Has Anon Key:', !!NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

// Singleton instance to prevent multiple GoTrueClient creation
let clientInstance: ReturnType<typeof createClientComponentClient<Database>> | null = null;

// Validate environment variables on client side
function validateClientEnv() {
  if (typeof window !== 'undefined') {
    // Check for missing environment variables
    if (!NEXT_PUBLIC_SUPABASE_URL) {
      throw new Error(
        'Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL. ' +
        'Please set this variable in your Vercel dashboard or deployment environment.'
      );
    }
    
    if (!NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      throw new Error(
        'Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
        'Please set this variable in your Vercel dashboard or deployment environment.'
      );
    }
    
    // Check for placeholder values that indicate environment variables weren't properly set
    if (NEXT_PUBLIC_SUPABASE_URL.startsWith('MISSING_') || 
        NEXT_PUBLIC_SUPABASE_URL.startsWith('INVALID_') ||
        NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id') ||
        NEXT_PUBLIC_SUPABASE_URL.includes('localhost')) {
      throw new Error(
        `Invalid Supabase URL configuration: "${NEXT_PUBLIC_SUPABASE_URL}". ` +
        'This appears to be a placeholder value. Please set the correct Supabase URL ' +
        'in your production environment variables. Expected format: https://your-project.supabase.co'
      );
    }
    
    // Validate URL format
    try {
      const url = new URL(NEXT_PUBLIC_SUPABASE_URL);
      if (!url.hostname.includes('supabase.co')) {
        console.warn('Warning: Supabase URL does not contain expected hostname pattern.');
      }
    } catch (error) {
      throw new Error(
        `Invalid Supabase URL format: "${NEXT_PUBLIC_SUPABASE_URL}". ` +
        'Expected a valid URL like: https://your-project.supabase.co'
      );
    }
    
    // Validate anon key format (should be a JWT)
    if (!NEXT_PUBLIC_SUPABASE_ANON_KEY.startsWith('eyJ')) {
      throw new Error(
        'Invalid Supabase anon key format. Expected a JWT token starting with "eyJ".'
      );
    }
  }
}

// Client-side Supabase client for use in React components
export const createClient = () => {
  validateClientEnv();
  
  if (clientInstance) {
    return clientInstance;
  }
  
  clientInstance = createClientComponentClient<Database>();
  return clientInstance;
};

// Singleton client for client-side usage
export const supabase = createClient();