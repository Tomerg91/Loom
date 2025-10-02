import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import type { NextRequest, NextResponse } from 'next/server';
import type { Database } from '@/types/supabase';
import { getSupabaseAnonKey, getSupabaseUrl, validateSupabaseEnv } from './config';

type SupabaseCookie = {
  name: string;
  value: string;
  options?: {
    domain?: string;
    path?: string;
    expires?: Date;
    httpOnly?: boolean;
    maxAge?: number;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none' | boolean;
  };
};

type SameSiteOption = 'strict' | 'lax' | 'none' | boolean | undefined;

type CookieStoreLike = {
  getAll: () => SupabaseCookie[];
  set?:
    | ((cookie: SupabaseCookie) => void)
    | ((name: string, value: string, options?: SupabaseCookie['options']) => void);
};

function normalizeSameSite(value: SameSiteOption) {
  if (value === true) {
    return 'strict';
  }
  if (value === false) {
    return 'none';
  }
  return value;
}

export function createAdapterFromCookieStore(cookieStore: CookieStoreLike) {
  return {
    getAll: () => {
      try {
        return cookieStore.getAll();
      } catch (error) {
        console.warn('Failed to read cookies for Supabase client:', error);
        return [];
      }
    },
    setAll: (cookies: SupabaseCookie[]) => {
      cookies.forEach(({ name, value, options }) => {
        try {
          const sameSite = normalizeSameSite(options?.sameSite);
          const normalizedOptions = { ...options, sameSite };

          if (typeof cookieStore.set === 'function') {
            try {
              (cookieStore.set as (cookie: SupabaseCookie) => void)({
                name,
                value,
                ...normalizedOptions,
              });
            } catch (setError) {
              try {
                (cookieStore.set as (
                  name: string,
                  value: string,
                  options?: SupabaseCookie['options']
                ) => void)(name, value, normalizedOptions);
              } catch (fallbackError) {
                console.warn('Failed to set cookie for Supabase client:', fallbackError);
              }
            }
          }
        } catch (error) {
          console.warn('Failed to set cookie for Supabase client:', error);
        }
      });
    },
  };
}

export const createServerClient = () => {
  validateSupabaseEnv();

  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabaseAnonKey();

  return createSupabaseServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      get: () => undefined,
      set: () => {},
      remove: () => {},
    },
  });
};

export const createServerClientWithRequest = (request: NextRequest, response: NextResponse) => {
  validateSupabaseEnv();

  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabaseAnonKey();

  return createSupabaseServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => {
        cookies.forEach(({ name, value, options }) => {
          try {
            const sameSiteValue =
              options?.sameSite === true
                ? ('strict' as const)
                : options?.sameSite === false
                ? ('none' as const)
                : (options?.sameSite as 'strict' | 'lax' | 'none' | undefined);

            response.cookies.set({
              name,
              value,
              ...options,
              sameSite: sameSiteValue,
            });
          } catch (error) {
            console.warn('Failed to set cookie in middleware:', error);
          }
        });
      },
    },
  });
};

export type { CookieStoreLike, SupabaseCookie };
