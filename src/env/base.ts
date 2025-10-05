import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

const PLACEHOLDER_PREFIXES = ['MISSING_', 'INVALID_'] as const;

const supabaseUrlSchema = z
  .string()
  .min(1)
  .superRefine((value, ctx) => {
    const isPlaceholder = PLACEHOLDER_PREFIXES.some(prefix => value.startsWith(prefix));
    if (isPlaceholder) {
      return;
    }

    try {
      new URL(value);
    } catch (_error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'NEXT_PUBLIC_SUPABASE_URL must be a valid URL or placeholder value.',
      });
    }
  });

const withPlaceholderFallback = <T extends string | undefined>(
  value: T,
  placeholder: string,
) => value ?? placeholder;

const envResult = createEnv({
  server: {
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
    DATABASE_URL: z.string().url().optional(),
    SENTRY_DSN: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrlSchema,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  },
  runtimeEnv: {
    SUPABASE_SERVICE_ROLE_KEY:
      process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
    SENTRY_DSN: process.env.SENTRY_DSN,
    NEXT_PUBLIC_SUPABASE_URL: withPlaceholderFallback(
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
      'MISSING_NEXT_PUBLIC_SUPABASE_URL',
    ),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: withPlaceholderFallback(
      process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      'MISSING_NEXT_PUBLIC_SUPABASE_ANON_KEY',
    ),
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
});

const server = {
  SUPABASE_SERVICE_ROLE_KEY: envResult.SUPABASE_SERVICE_ROLE_KEY,
  DATABASE_URL: envResult.DATABASE_URL,
  SENTRY_DSN: envResult.SENTRY_DSN,
  NEXT_PUBLIC_SUPABASE_URL: envResult.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: envResult.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_URL: envResult.NEXT_PUBLIC_APP_URL,
} as const;

const client = {
  NEXT_PUBLIC_SUPABASE_URL: envResult.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: envResult.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_URL: envResult.NEXT_PUBLIC_APP_URL,
} as const;

export type ServerEnv = typeof server;
export type ClientEnv = typeof client;

// Ensure server-only secrets never leak to the client schema.
type _ServerSecretsNotInClient = Extract<
  keyof ClientEnv,
  'SUPABASE_SERVICE_ROLE_KEY' | 'DATABASE_URL'
> extends never
  ? true
  : never;

export const env = {
  server,
  client,
} as const;

export type Env = typeof env;
