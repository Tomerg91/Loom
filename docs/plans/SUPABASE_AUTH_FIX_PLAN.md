# Supabase + Auth Production Fix Plan (Agent Playbook)

This is a step‑by‑step, agent‑friendly playbook to diagnose and fix Supabase database issues and authentication flows, safely and repeatably. It is written for an agentic AI code‑writer operating via GitHub Actions + Supabase CLI, with minimal human intervention.

---

## Objectives

- Eliminate signup/signin failures related to DB triggers, permissions, and migrations.
- Reduce Supabase Advisor warnings (security + performance) to an acceptable baseline.
- Enforce safe, idempotent migrations across environments with robust fallbacks.
- Harden authentication UX and server behavior (validation, error surfacing, logs).

---

## Prerequisites

- Secrets available (repo or environment):
  - `SUPABASE_ACCESS_TOKEN`: Supabase personal access token (required for remote link/push).
  - One of `DATABASE_URL` | `REPO_DATABASE_URL` | `PRODUCTION_DATABASE_URL` | `DB_URL`:
    - `postgresql://postgres:<PWD>@db.<REF>.supabase.co:5432/postgres?sslmode=require`
  - Optionally `SUPABASE_PROJECT_REF` (or derive from `DATABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL`).
  - `NEXT_PUBLIC_SUPABASE_URL` (optional; used for auto‑deriving project ref).
- Supabase project has standard schemas (`public`, `auth`), RLS enabled by default (table‑specific may vary).

---

## High‑Level Phases

1) Inventory & Diagnostics
- Run DB audit workflow (lists RLS/PK/FK/PUBLIC grants/SECDEF issues):
  - Actions → “Supabase DB Audit” → choose environment
- Validate app env & Supabase connectivity:
  - `GET /api/debug/environment?force=true`
  - `GET /api/admin/system/db-checks` (admin only)
- Export Supabase Advisor “issues” (optional) for cross‑reference.

2) Migration Strategy (Idempotent + Safe)
- Avoid re‑applying legacy migrations on established DBs (prevents type/table duplicates).
- Maintain new “delta” migrations for current fixes only (tagged with current yyyymmdd*).
- Apply migrations using robust workflow:
  - Direct DB (psql) with IPv4 → if fails → Supabase `link` + `db push` with token.
  - Auto‑derive project ref from `DATABASE_URL`/`NEXT_PUBLIC_SUPABASE_URL` if missing.

3) Database Fixes (Current)
- Signup trigger:
  - `handle_new_user()` defined in `public`, trigger `on_auth_user_created` on `auth.users`.
  - Tolerate duplicate profile rows: `ON CONFLICT(email) DO NOTHING`.
  - Wrap `COMMENT ON TRIGGER` in DO block; catch `insufficient_privilege`.
- Payments table & RLS policies:
  - Create `public.payments` with safe default policies.
- Performance: Missing FK indexes:
  - Create indexes on all FK columns in `public` if missing (loop with system catalog checks).

4) Security Hardening
- RLS: Ensure all application tables in `public` enforce RLS; create allow policies by resource type (owner‑based or role‑based) and add admin overrides as needed.
- PUBLIC grants: Revoke PUBLIC on `public.*` unless required; grant minimal roles.
- SECURITY DEFINER functions: Audit and minimize; validate inputs; prefer SECURITY INVOKER where possible.
- JWT claims: Keep role claims current; ensure `auth.jwt()` custom claims align with policy expectations.

5) Auth UX & API Hardening
- Validation: Allow Unicode names (Hebrew), normalize Israeli phone to E.164, show first field error.
- Error surfacing: On signup/signin, surface upstream Supabase error message (safely trimmed) to speed triage.
- MFA / email confirmation: Ensure flows align with Supabase settings; whitelist redirect URLs.
- Logging: Toggle `LOG_REQUESTS=true` in Vercel for request/response correlation; use `withRequestLogging` for APIs.

6) Observability & Runbooks
- Admin DB checks: `GET /api/admin/system/db-checks` to verify trigger presence + RLS flags.
- Manual audit: “Supabase DB Audit” workflow reports common misconfigurations regularly.
- Oncall playbook: If signup fails, check API error message → DB checks endpoint → Action audit logs → run migration.

7) Testing & Rollout
- E2E: Signup (Hebrew), Signin, Payments session/IPN, messages (auth context), localized settings.
- Staged rollout: Apply to staging first; run DB audit; compare to production; then prod.
- Rollback: Migrations are additive; trigger can be reverted by replacing function/trigger.

---

## Detailed Agent Steps

### Phase 1: Inventory & Diagnostics
1. Run DB audit workflow:
   - `gh workflow run db-audit.yml -f environment=production`
   - Inspect logs for:
     - `NO_RLS`, `NO_PK`, `FK_NO_INDEX`, `PUBLIC_GRANT`, `SECDEF_FUNC`.
2. Verify app env:
   - `GET /api/debug/environment?force=true`
   - Expect valid `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
3. Verify DB health:
   - `GET /api/admin/system/db-checks` as admin.
   - Expect `{ has_handle_new_user: true, users_rls_enabled: true }`.

### Phase 2: Migrations (Apply Current Fixes Only)
1. Ensure secrets:
   - `SUPABASE_ACCESS_TOKEN`, plus `DATABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`.
2. Run migration:
   - Actions → “Migrate Database (Manual)” → env=production.
   - If direct DB connect fails, workflow links Supabase project and pushes only 202509* migrations.
3. Confirm logs show:
   - Payments table created (or already exists) + policies applied.
   - `fix_user_signup_trigger` applied without COMMENT privilege failure.
   - `fix_handle_new_user_conflict` applied.

### Phase 3: Security & Performance Baseline
1. RLS enablement (targeted):
   - From audit results, add migrations per table to `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` and policy skeletons.
   - Pattern: owner‑based `using (owner_id = auth.uid())`, plus admin read/write overrides.
2. PUBLIC grants removal:
   - Generate migration to `REVOKE ALL ON public.<table> FROM PUBLIC;` then grant minimal roles.
3. SECURITY DEFINER review:
   - For each function in audit, validate necessity and inputs; switch to SECURITY INVOKER when possible.

### Phase 4: Auth Hardening
1. Client + API validation updates (implemented already):
   - Unicode names, E.164 phone normalization, first error surfaced.
2. MFA/email confirmation alignment:
   - Confirm Supabase Auth Settings (email confirmation on/off) match expected UX.
   - Whitelist redirect URLs.
3. Logging toggles:
   - Set `LOG_REQUESTS=true` in Vercel; review [API REQ]/[API RES] logs for auth flows.

### Phase 5: Observability & Acceptance
1. Run DB audit → zero or accepted warnings for RLS/PK/INDEX/PUBLIC/SECDEF.
2. E2E tests passing: signup/signin/payments/messages/settings.
3. Admin DB checks endpoint returns healthy values.

---

## Commands & Endpoints (Quick Reference)

- Dispatch audit workflow:
  - `gh workflow run db-audit.yml -f environment=production`
- Dispatch migration workflow:
  - `gh workflow run migrate-only.yml -f environment=production`
- Local migration (fallback):
  - `supabase login --token $SUPABASE_ACCESS_TOKEN`
  - `supabase db push --db-url "$DATABASE_URL"`
- Health endpoints:
  - `GET /api/debug/environment?force=true`
  - `GET /api/admin/system/db-checks` (admin only)

---

## Acceptance Criteria

- Signup no longer fails with “Database error saving new user”.
- Payments table exists; policies applied; no FK index warnings remain.
- RLS enabled on all application tables (or documented exceptions); PUBLIC grants removed.
- Admin DB checks endpoint reports trigger presence and RLS flags true.
- Supabase Advisor warnings reduced to a small, documented backlog.
- E2E for auth/session/messages/payments pass reliably.

---

## Risks & Mitigations

- Reapplying legacy migrations on a live DB → Avoided with pruning during fallback and idempotent SQL (IF NOT EXISTS).
- Privilege issues on auth schema → Commenting on triggers wrapped in DO block catching `insufficient_privilege`.
- Runner IPv6/egress issues → IPv4 resolution, PGHOSTADDR, and remote link fallback via Supabase CLI.
- RLS enforcement breaking jobs → Enable per table with explicit policies; test in staging.

---

## Backlog (Optional Enhancements)

- Auto‑generate RLS policies per table using a schema‑aware generator.
- Scheduled DB audit workflow with artifact output + Slack/Email summary.
- Add a UI dashboard (admin‑only) aggregating `/api/admin/system/db-checks` + advisor highlights.

