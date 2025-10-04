import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

const envResult = createEnv({
  server: {
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
    DATABASE_URL: z.string().url().optional(),
    SENTRY_DSN: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  },
  runtimeEnv: {
    SUPABASE_SERVICE_ROLE_KEY:
      process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
    SENTRY_DSN: process.env.SENTRY_DSN,
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
});

const server = {
  ...envResult.server,
  ...envResult.client,
} as const;

export type ServerEnv = Readonly<typeof server>;
export type ClientEnv = Readonly<typeof envResult.client>;

// Ensure server-only secrets never leak to the client schema.
type _ServerSecretsNotInClient = Extract<
  keyof ClientEnv,
  'SUPABASE_SERVICE_ROLE_KEY' | 'DATABASE_URL'
> extends never
  ? true
  : never;

export const env = {
  server,
  client: envResult.client,
} as const;

export type Env = typeof env;
