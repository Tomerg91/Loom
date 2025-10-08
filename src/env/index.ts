import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

// Unified environment module.
// Use env.server.* in server contexts and env.client.* in client contexts.
// Replace imports of '@/env.mjs' and '@/env-server.mjs' progressively with '@/env'.

export const env = createEnv({
  server: {
    // Make server key optional at build time; specific code paths will throw if truly required at runtime
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
    DATABASE_URL: z.string().url().optional(),
    SENTRY_DSN: z.string().optional(),
    TASK_ATTACHMENTS_BUCKET: z.string().min(1).optional(),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  },
  runtimeEnv: {
    // Prefer new Supabase key names if present
    SUPABASE_SERVICE_ROLE_KEY:
      process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
    SENTRY_DSN: process.env.SENTRY_DSN,
    TASK_ATTACHMENTS_BUCKET: process.env.TASK_ATTACHMENTS_BUCKET,
    // Allow SUPABASE_URL (new naming) to satisfy NEXT_PUBLIC_SUPABASE_URL
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
});

export const serverEnv = env;
export const clientEnv = env;
