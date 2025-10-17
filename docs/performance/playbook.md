# Performance Playbook

This playbook documents the default caching and rendering strategy introduced in Phase 5, Step 13 of the implementation plan.

## Marketing & Legal Pages

- Privacy and Terms pages now live inside the `src/app/[locale]/(marketing)` route group and export:
  - `dynamic = 'error'` to prevent accidental dynamic rendering in production.
  - `revalidate = 60 * 60 * 6` (6 hours) so that updates propagate without forcing a redeploy.
- `next.config.js` sets `Cache-Control` headers for `/:locale/privacy` and `/:locale/terms` so the Vercel/Next CDN can cache the response for up to 6 hours with `stale-while-revalidate` support.
- Content teams should continue to author copy via the CMS JSON. After publishing, allow up to 6 hours for the CDN cache to refresh or trigger an on-demand revalidation if urgent.

## Dashboard Data Fetching

- All dashboard React Query hooks now share `dashboardQueryOptions` which defines:
  - `staleTime` of 2 minutes to avoid repetitive network calls when navigating.
  - `gcTime` of 30 minutes to keep hydrated data around for subsequent visits.
  - `refetchOnWindowFocus` disabled to reduce noisy refetches during sessions.
  - `refetchOnReconnect` set to `always` so offline users recover fresh data.
  - `retry` limited to 1 attempt to avoid hammering APIs during outages.
- When adding new dashboard queries, wrap them with `dashboardQueryOptions(...)` to inherit these defaults.

## Benchmarking Guidance

1. Run the Lighthouse CI script (`npm run test:lighthouse`) against the marketing pages before and after significant changes.
2. Capture Web Vitals in Vercel (CLS, LCP, FID) after deploys to ensure caching remains effective.
3. Review React Query Devtools in development to verify that query caches reuse the shared configuration.
4. Document any performance regressions or exceptions to the caching rules in this playbook to keep the team aligned.
