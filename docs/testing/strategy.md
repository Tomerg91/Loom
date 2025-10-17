# Testing Strategy

This document explains how the expanded automated test suites are structured and
when each layer should run during day-to-day development and CI.

## Vitest Suites

- **Unit & Integration (`npm run test:run`, `npm run test:integration`)** – Run on
  every pull request. The suites live under `src/test` and `tests`, share the
  global `jsdom` setup, and focus on deterministic component and hook behavior.
- **Production Readiness (`npm run test:production-readiness`)** – Targets
  runtime configuration, Supabase guards, and middleware flows. CI runs the
  suite after unit/integration to block regressions before deployment builds.
- **Accessibility Smoke (`npm run test:accessibility`)** – New Vitest checks in
  `tests/accessibility.test.tsx` verify that the marketing hero and locale
  direction context expose semantic landmarks and locale metadata.
- **Performance Budget (`npm run test:performance`)** – Exercises the synthetic
  performance assertions defined in `src/test/performance.test.ts` to keep bundle
  and web vital targets visible during CI.
- **Quality Aggregator (`npm run test:qa`)** – Convenience script that runs the
  production readiness, accessibility, and performance suites locally before a
  release branch is cut.

## Playwright Coverage

- **Full E2E (`npm run test:e2e`)** – Comprehensive browser tests that require a
  running build and seeded data. Executed in CI after the smoke suite.
- **Smoke E2E (`npm run test:e2e:smoke`)** – Runs against the lightweight specs
  in `tests/playwright` to assert that authentication and dashboard routing work
  before the costlier E2E workflow.

> ℹ️  Developers should run `npm run test:qa` locally before tagging a release to
>  surface any regressions caught by the new gates.
