# Configuration and Environment Management

This document captures the environment variables that power the Loom
application and explains how the new runtime loaders validate them at build
and request time. Use it as the single source of truth when setting up local
machines, CI pipelines, or deployment targets.

## Runtime Loaders

Environment access is funneled through dedicated modules under `src/env/`:

- `src/env/client.ts` exposes `clientEnv` for browser-safe variables. Only
  `NEXT_PUBLIC_` prefixed values are available and they are validated with Zod
  during module evaluation.
- `src/env/server.ts` exposes `serverEnv` (and a backwards-compatible `env`
  alias) for server-only code paths. It delegates to the CommonJS runtime in
  `src/env/runtime.js` so that both TypeScript and Node tooling share the same
  validation logic.

Import paths should make intent explicit:

```ts
// Client bundles / shared UI
import { clientEnv } from '@/env/client';

// API routes, server components, background jobs
import { serverEnv } from '@/env/server';
```

## Required Environment Variables

| Variable | Scope | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Client/Server | URL of the Supabase project. Must match the `https://<project>.supabase.co` pattern. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client/Server | Publishable Supabase anon key. Accepts both legacy JWT and `sb_` prefixed keys. |
| `NEXT_PUBLIC_APP_URL` | Client/Server | Public origin for building absolute links (optional in local dev). |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Service role key used for privileged Supabase access. Only load on trusted infrastructure. |
| `DATABASE_URL` | Server | Connection string for Prisma/SQL access. Required when running background jobs. |
| `SENTRY_DSN` | Server | Enables Sentry error reporting when present. |
| `TASK_ATTACHMENTS_BUCKET` | Server | Supabase Storage bucket used for uploading homework/task files. |

The loaders provide helpful error messages when a variable is missing or
malformed so the application fails fast during startup rather than at runtime.

## Validation & Tooling

- `npm run validate:env` scans `.env*` files for missing or unsafe values.
- Runtime access (for example `serverEnv.TASK_ATTACHMENTS_BUCKET`) throws when
  accessed outside of a server context, helping catch accidental client leaks.
- Placeholder constants (`PLACEHOLDER_SUPABASE_URL` and
  `PLACEHOLDER_SUPABASE_ANON_KEY`) remain available for tests or skeleton UIs
  that need deterministic defaults.

## Setup Checklist

1. Copy `.env.example` to `.env.local` and populate the variables listed above.
2. For deployment environments, replicate the same keys in your hosting
   provider (Vercel, Supabase CLI secrets, etc.).
3. Re-run `npm run validate:env` and restart the dev server to ensure the new
   runtime loaders pick up fresh values.
