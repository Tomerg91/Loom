/* eslint-disable @typescript-eslint/no-require-imports */
const { createEnv } = require('@t3-oss/env-nextjs');
const { z } = require('zod');

const PLACEHOLDER_SUPABASE_URL = 'https://placeholder.supabase.co';
const PLACEHOLDER_SUPABASE_ANON_KEY = 'sb_placeholder_supabase_key';

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL')
    .default(PLACEHOLDER_SUPABASE_URL),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required')
    .default(PLACEHOLDER_SUPABASE_ANON_KEY),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url('NEXT_PUBLIC_APP_URL must be a valid URL')
    .optional(),
  NEXT_PUBLIC_SENTRY_DSN: z
    .string()
    .url('NEXT_PUBLIC_SENTRY_DSN must be a valid DSN URL')
    .optional(),
});

const resolveSupabaseUrl = () =>
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  PLACEHOLDER_SUPABASE_URL;

const resolveSupabaseAnonKey = () =>
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  PLACEHOLDER_SUPABASE_ANON_KEY;

const rawClientEnv = {
  NEXT_PUBLIC_SUPABASE_URL: resolveSupabaseUrl(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: resolveSupabaseAnonKey(),
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SENTRY_DSN:
    process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,
};

const parsedClientEnv = clientEnvSchema.safeParse(rawClientEnv);

if (!parsedClientEnv.success) {
  const flattened = parsedClientEnv.error.flatten();
  const formattedErrors = Object.entries(flattened.fieldErrors)
    .map(([key, messages]) => `${key}: ${(messages || []).join(', ')}`)
    .join('\n');

  throw new Error(
    `Failed to load client environment variables.\n${formattedErrors}`
  );
}

const clientEnv = parsedClientEnv.data;

const serverEnv = createEnv({
  server: {
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
    DATABASE_URL: z.string().url().optional(),
    SENTRY_DSN: z.string().optional(),
    TASK_ATTACHMENTS_BUCKET: z.string().min(1).optional(),
  },
  client: clientEnvSchema.shape,
  runtimeEnv: {
    SUPABASE_SERVICE_ROLE_KEY:
      process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
    SENTRY_DSN: process.env.SENTRY_DSN,
    TASK_ATTACHMENTS_BUCKET: process.env.TASK_ATTACHMENTS_BUCKET,
    NEXT_PUBLIC_SUPABASE_URL: clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: clientEnv.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SENTRY_DSN: clientEnv.NEXT_PUBLIC_SENTRY_DSN,
  },
  emptyStringAsUndefined: true,
});

module.exports = {
  clientEnv,
  serverEnv,
  env: serverEnv,
  PLACEHOLDER_SUPABASE_ANON_KEY,
  PLACEHOLDER_SUPABASE_URL,
  resolveSupabaseAnonKey,
  resolveSupabaseUrl,
};
