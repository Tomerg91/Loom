# Supabase Remediation Plan

## Observed Issues (Updated)

- ✅ Long-lived OTP tokens resolved: `supabase/config.toml:95` now pins `otp_expiry = 900`, aligning with `supabase/AUTH_SECURITY_CONFIG.md` guidance.
- ✅ Email confirmations enabled: `supabase/config.toml:94` flips `enable_confirmations = true` so unverified accounts are rejected outside local overrides.
- ✅ Redirect domains configurable: `supabase/config.toml:70` and `supabase/config.toml:74` now read from `"env(SUPABASE_SITE_URL)"`, preventing localhost callbacks once the variable is set in each environment (`.env`, Vercel/Vite secrets, etc.).
- ✅ **SECURITY DEFINER search_path FIXED**: Migration `supabase/migrations/20260222000001_secure_security_definer_search_path.sql` successfully applied to production on 2025-10-20. All 102 SECURITY DEFINER functions now have `search_path=pg_catalog, public, extensions`. Zero vulnerabilities remaining.
- ⚠️ Supabase diagnostics still blocked locally: `supabase status` / `supabase db lint` fail with Docker/socket permission errors (`dial unix /Users/tomergalansky/.docker/run/docker.sock: connect: operation not permitted`), so linting must run in CI or an environment with Docker access.

## Remediation Plan

1. **Auth configuration hardening**
   - Add `otp_expiry = 900` (15 minutes) to `supabase/config.toml` and propagate the value via environment variables for production deployments.
   - Flip `enable_confirmations = true` in production configs and document how to keep local overrides disabled for developer convenience.
   - Replace hard-coded `site_url`/`additional_redirect_urls` with `"env(SUPABASE_SITE_URL)"` and extend the deployment checklist so every environment (.env.local, Vercel, Supabase dashboard) defines the variable correctly.
   - Verify changes by running the Supabase dashboard advisor and re-testing the email OTP flow end to end.

2. **Secure every SECURITY DEFINER function**
   - Apply `supabase/migrations/20260222000001_secure_security_definer_search_path.sql`, which iterates all SECURITY DEFINER routines in `public` and sets `search_path = 'pg_catalog', 'public', 'extensions'`.
   - Keep `supabase/migrations/analysis_security_definer_inventory.sql` on hand to audit any remaining outliers (e.g. future functions in non-public schemas).
   - `supabase/tests/security_definer_regression.sql` now fails unless each routine exposes `search_path=pg_catalog, public, extensions` in `pg_proc.proconfig`.

3. **Restore automated Supabase linting and tests**
   - Obtain Docker access (or run inside CI) so that `supabase start`, `supabase status`, and `supabase db lint` succeed; capture baseline advisor output after the fixes. Local attempts still fail with sandboxed Docker permissions, so CI enforcement is required until the workstation can access `/Users/tomergalansky/.docker/run/docker.sock`.
   - Run the SQL test suite in `supabase/tests/` (resource library, security definer regression) against a fresh database snapshot to confirm no behavioural regressions.
   - Wire these checks into CI (GitHub Actions or equivalent) so every migration PR executes lint + tests and fails fast on search_path or policy regressions.

4. **Deployment validation & documentation**
   - Update ops docs to reflect the new auth settings, search_path hardening, and the required verification steps before promoting to production.
   - Capture before/after advisor screenshots or logs and attach them to `SUPABASE_ENVIRONMENT_FIX_SUMMARY.md` so future auditors can trace the remediation.

## Verification Checklist

- ✅ **SECURITY DEFINER functions verified**: All 102 production SECURITY DEFINER functions confirmed to have `search_path=pg_catalog, public, extensions` (verified 2025-10-20)
- ✅ **Local regression tests passed**: `supabase/tests/security_definer_regression.sql` passed with zero vulnerabilities on local test database
- ⚠️ `supabase db lint` - Docker permission issues prevent local execution; CI workflows configured instead
- 🔲 Manual OTP login flow expires codes after 15 minutes and rejects stale tokens (requires manual testing)
- 🔲 Production `site_url` and redirect URLs resolve to the expected domain in Supabase dashboard settings (requires environment variable configuration)

## Deployment Summary (2025-10-20)

**Successfully Completed:**

- ✅ Migration `20260222000001_secure_security_definer_search_path.sql` applied to production
- ✅ Production verification: 102/102 functions secured (0 vulnerable)
- ✅ Local testing: All regression tests passed
- ✅ Git commit: `ff8ffd4` - "feat(security): Apply SECURITY DEFINER search_path hardening"

**Outstanding Tasks:**

- CI/CD workflows already configured in `.github/workflows/database-tests.yml` and `.github/workflows/validate-security-definer.yml`
- Environment variable `SUPABASE_SITE_URL` needs to be set in production environments
- Manual OTP flow testing recommended
