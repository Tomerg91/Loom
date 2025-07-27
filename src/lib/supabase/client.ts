import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/supabase';
import { env } from '@/env.mjs';

// Singleton instance to prevent multiple GoTrueClient creation
let clientInstance: ReturnType<typeof createClientComponentClient<Database>> | null = null;

// Validate environment variables on client side using centralized env
function validateClientEnv() {
  if (typeof window !== 'undefined') {
    if (!env.NEXT_PUBLIC_SUPABASE_URL) {
      throw new Error('Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL');
    }
    if (!env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
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