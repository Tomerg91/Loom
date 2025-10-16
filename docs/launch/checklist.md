# Launch Checklist

A structured runbook to guide the team from staging sign-off through production release. Complete each section in order and capture owners plus timestamps as you progress.

## 1. Environment Promotion

- [ ] Confirm staging branch merged and tagged with release candidate (`vYYYY.MM.DD-rc1`).
- [ ] Validate `.env.production` matches Supabase project secrets via `npm run env:validate`.
- [ ] Trigger infrastructure provisioning (Vercel/Supabase) with maintenance window posted in #launch channel.
- [ ] Pause scheduled background jobs or cron tasks prior to migration window.

## 2. Database & Supabase

- [ ] Run `supabase db diff --linked` to confirm zero pending migrations.
- [ ] Execute production migrations via CI workflow or `supabase db push --linked` (record migration ID).
- [ ] Re-enable row level security guards by running `scripts/verify-security-migrations.sql` if not automated.
- [ ] Verify storage buckets, policies, and functions using `scripts/check-http-functions.js`.

## 3. Application Configuration

- [ ] Update Sentry environment to `production` release and ensure DSN is active.
- [ ] Rotate service role keys if staging testing shared credentials with production.
- [ ] Confirm third-party integrations (email, payments, analytics) have production API keys loaded.
- [ ] Double-check `NEXT_PUBLIC_SITE_URL` and marketing tracking IDs reflect the production domain.

## 4. Data Seeding

- [ ] Run `npm run seed:staging` (delegates to `scripts/seed/staging.ts`) with fresh auth tokens.
- [ ] Invite pilot coaches/clients and confirm welcome emails deliver successfully.
- [ ] Snapshot staging Supabase data for rollback reference before production promotion.

## 5. Quality Gates

- [ ] Execute `npm run test:production-readiness` against staging deployment.
- [ ] Run Playwright smoke suite (`npm run test:smoke`) pointing at staging URL.
- [ ] Capture Lighthouse performance report (mobile + desktop) and attach to launch doc.
- [ ] Review open GitHub issues labelled `launch-blocker`; ensure none remain.

## 6. Support & Observability

- [ ] Verify on-call rotation calendar has coverage for the first 72 hours post-launch.
- [ ] Create shared dashboard in analytics tool for activation and retention KPIs.
- [ ] Configure Sentry alert thresholds and Slack notifications per `docs/operations/observability.md`.
- [ ] Publish support escalation flow (Tier 1 → Tier 2 → Engineering) in #support channel.

## 7. Communications

- [ ] Send internal launch brief to marketing, sales, and leadership with go-live timeline.
- [ ] Draft customer announcement email and have it approved by marketing lead.
- [ ] Update status page or changelog with scheduled maintenance notice.
- [ ] Prepare FAQ responses for expected onboarding questions from coaches and clients.

## 8. Final Go/No-Go

- [ ] Hold go/no-go meeting with stakeholders, review outstanding risks, and record decision.
- [ ] If "Go": deploy to production, monitor rollout dashboards, and confirm 200 OK on health checks.
- [ ] If "No-Go": document blockers, assign owners, and schedule follow-up decision time.
- [ ] After launch, schedule 24-hour and 7-day retrospectives to collect feedback and next steps.

> ✅ Mark each item with initials/date when completed so the artifact doubles as a launch record.
