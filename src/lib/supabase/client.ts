import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/supabase';

// Client-side Supabase client for use in React components
export const createClient = () => {
  return createClientComponentClient<Database>();
};

// Singleton client for client-side usage
export const supabase = createClient();