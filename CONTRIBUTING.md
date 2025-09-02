# Contributing to Loom App

Thank you for contributing! This guide covers local setup, environment, workflows, and quality gates.

## Prerequisites
- Node.js 20+ and pnpm/npm
- Supabase CLI (optional for local DB)
- Vercel CLI (optional for preview deploys)

## Setup
- Install deps: `npm install`
- Copy env: `.env.example` → `.env.local` and fill required values
- Run dev: `npm run dev`

## Environment
- Unified env module: import `env` from `@/env`
- Required client vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Optional server vars: `SUPABASE_SERVICE_ROLE_KEY`, `SENTRY_DSN`

## Scripts
- Lint/format: `npm run lint`, `npm run format:check`
- Type check: `npm run type-check`
- Tests: `npm run test:run` (unit), `npm run test:integration`, `npm run test:e2e`
- Bundle analyze: `npm run analyze:size-check`

## Code Style
- Use module imports: `@/lib/...`, barrels preferred
- Keep server/client separation; server-only code behind `server-only`
- Add/extend tests for high-risk changes (middleware, guards, env, headers)

## Git
- Small, focused PRs; link to plan sections when applicable
- Include before/after notes for perf/security changes

Happy hacking!
