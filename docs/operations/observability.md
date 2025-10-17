# Observability & Security Guardrails

This document tracks the minimum configuration required before inviting
customers into staging or production. It pairs code-level guardrails with the
operational tasks engineers need to complete in Sentry, analytics tooling, and
Supabase.

## 1. Sentry Telemetry

- **DSN configuration**
  - Set `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` in every deployed environment.
  - The Sentry client/server configs validate the values on boot and log a
    warning if telemetry is disabled, so missing keys must be treated as a
    deployment blocker.
- **Environment metadata**
  - `VERCEL_ENV` or `NODE_ENV` drive the sampling strategy. Production
    environments use reduced trace/replay sample rates (30%/10%) to balance cost
    and signal quality.
  - Releases are versioned through `VERCEL_GIT_COMMIT_SHA` when available. Tag
    deploys in Sentry so alerts map back to the correct commit.
- **Alert routing**
  - Configure project alerts for `error` and `warning` level events. The shared
    logger captures `logger_message`, `context`, and `feature` tags that can be
    used to scope notifications to the responsible team.

## 2. Application Logging

- Use `createLogger` from `@/modules/platform/logging/logger` to create scoped
  loggers inside API routes, server actions, and background jobs.
- The helper fans out to both `console` and Sentry so production observability
  stays consistent without duplicating instrumentation code.
- Always pass the caught `error` instance to preserve stack traces and context.

## 3. Analytics (Optional but Recommended)

- The marketing site should continue to use the existing analytics provider
  (`NEXT_PUBLIC_POSTHOG_KEY` or equivalent) once credentials are available.
- Record adoption metrics for the dashboard (logins, session scheduling, task
  completions) so product-market fit signals are visible during the beta.
- Ensure analytics scripts are deferred or loaded via a consent banner to
  maintain performance and privacy compliance.

## 4. Supabase HTTP Function Guard

- Never allow payloads to reference `net.http_*` functions. These built-in
  Supabase helpers can issue outbound HTTP requests and are globally accessible
  in many environments.
- `ensureNoSupabaseHttpUsage` is now applied to session, task, and attachment
  APIs. Extend the guard to additional endpoints when introducing new service
  role queries.
- Keep the accompanying Vitest suite (`tests/platform/security/httpGuard.test.ts`)
  in CI so regressions are caught automatically.

## 5. Operational Checklist

1. Provision Sentry projects for client and server telemetry with alert rules
   targeting on-call channels.
2. Store DSNs and analytics keys in the team secret manager; grant least
   privilege access to rotation owners.
3. Run `npm run build` or the production pipeline after updating environment
   variables to confirm no observability warnings remain in the logs.
4. Review SLO dashboards weekly and tune sampling rates once real traffic
   arrives.
