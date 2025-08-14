import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/supabase';

// Direct access to client-safe environment variables
// Note: Only NEXT_PUBLIC_ prefixed variables are available on the client
const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Singleton instance to prevent multiple GoTrueClient creation
let clientInstance: ReturnType<typeof createClientComponentClient<Database>> | null = null;

// Validate environment variables on client side
function validateClientEnv() {
  if (typeof window !== 'undefined') {
    if (!NEXT_PUBLIC_SUPABASE_URL) {
      throw new Error('Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL');
    }
    if (!NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      throw new Error('Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY');
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