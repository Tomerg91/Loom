# Authentication Redirect Matrix

This document captures the middleware-level redirect rules introduced in the
Phase 1 hardening work. Keeping the behaviour documented here ensures future
changes to auth flows consider locale prefixes, MFA enforcement, and
role-specific dashboards.

## Overview

- Middleware now validates locale prefixes via `next-intl` before any custom
  auth logic runs. Invalid locales are redirected by the framework to the
  default locale.
- Authentication gating is enabled by default unless `MIDDLEWARE_AUTH_ENABLED`
  is explicitly set to `false`.
- Supabase sessions are read through `getSessionContext`, which extracts the
  user role and MFA flags from the request without leaking Supabase wiring into
  downstream modules.
- Final responses always receive security headers and a Supabase token refresh
  to keep rotating cookies in sync.

## Redirect Rules

| Scenario                                                              | Redirect Behaviour                                              |
| --------------------------------------------------------------------- | --------------------------------------------------------------- |
| Unauthenticated visitor hits protected route (e.g. `/en/dashboard`)   | Redirect to `/<locale>/auth/signin?redirectTo=<attempted>`      |
| Authenticated user visits auth route (signin/signup/reset)            | Redirect to the role home route (`/coach`, `/client`, `/admin`) |
| Authenticated user with pending MFA hits any page except verification | Redirect to `/<locale>/auth/mfa-verify?redirectTo=<attempted>`  |
| Authenticated coach tries to load `/admin`                            | Redirect to `/<locale>/coach`                                   |
| Authenticated client tries to load `/coach`                           | Redirect to `/<locale>/client`                                  |
| Authenticated admin visits `/dashboard`                               | Redirect to `/<locale>/admin`                                   |

The helper utilities in `src/modules/auth/utils/redirect.ts` power the locale
and role-aware path resolution described above.

## Testing

`tests/auth/middleware.test.ts` provides Vitest coverage for the primary
scenarios, ensuring redirects continue to behave as described even as the
middleware evolves.
