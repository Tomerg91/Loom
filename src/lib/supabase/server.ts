// TODO: Re-add server-only after auth refactor
// import 'server-only';

import { AsyncLocalStorage } from 'async_hooks';
import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import { type Database } from '@/types/supabase';
import {
  createAdapterFromCookieStore,
  type CookieStoreLike,
} from './clients';
import {
  getSupabaseAnonKey,
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
  validateSupabaseEnv,
} from './config';

export { createServerClient, createServerClientWithRequest } from './clients';

// Singleton instance for the admin client to prevent multiple GoTrueClient creation
let adminClientInstance: SupabaseClient<Database> | null = null;

type CookieAdapter = ReturnType<typeof createAdapterFromCookieStore>;

const cookieContext = new AsyncLocalStorage<CookieAdapter>();

export const withSupabaseRouteHandler = async <T>(cookieStore: CookieStoreLike, callback: () => Promise<T>) => {
  const adapter = createAdapterFromCookieStore(cookieStore);
  return await cookieContext.run(adapter, callback);
};

export const setSupabaseCookieStore = (cookieStore: CookieStoreLike) => {
  const adapter = createAdapterFromCookieStore(cookieStore);
  cookieContext.enterWith(adapter);
};

function getCookieAdapter(): CookieAdapter | null {
  return cookieContext.getStore() ?? null;
}

// For route handlers and server components that have access to cookies
export const createClient = async () => {
  validateSupabaseEnv();

  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabaseAnonKey();

  const cookieAdapter = getCookieAdapter();

  if (!cookieAdapter) {
    console.warn('Supabase cookie context not found. Returning client without cookie persistence.');
  }

  return createSupabaseServerClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      cookies: cookieAdapter ?? {
        getAll: () => [],
        setAll: () => {},
      },
    }
  );
};

// Admin client with service role key for administrative operations
export const createAdminClient = () => {
  validateSupabaseEnv();

  if (adminClientInstance) {
    return adminClientInstance;
  }

  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  adminClientInstance = createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  
  return adminClientInstance;
};
