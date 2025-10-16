import * as Sentry from '@sentry/nextjs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { serverEnv } = require('./src/env/runtime');

const environment =
  process.env.VERCEL_ENV || process.env.NODE_ENV || 'development';
const release =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.npm_package_version ||
  '1.0.0';
const resolvedDsn = serverEnv.SENTRY_DSN || process.env.SENTRY_DSN || undefined;

if (!resolvedDsn && environment !== 'development') {
  console.warn(
    '[observability] Sentry DSN not configured for the server runtime; telemetry disabled.'
  );
}

// Production server Sentry configuration with comprehensive monitoring
Sentry.init({
  dsn: resolvedDsn,
  enabled: Boolean(resolvedDsn),
  environment,

  // Performance monitoring configuration
  tracesSampleRate: environment === 'production' ? 0.3 : 1.0,
  profilesSampleRate: environment === 'production' ? 0.1 : 1.0,
  debug: environment === 'development',

  // Release tracking
  release,

  // Server-specific integrations
  integrations: [
    Sentry.httpIntegration({
      tracing: {
        ignoreIncomingRequests: url => {
          // Ignore health checks and monitoring requests
          return (
            url.includes('/api/health') ||
            url.includes('/favicon.ico') ||
            url.includes('/_next/static')
          );
        },
        ignoreOutgoingRequests: url => {
          // Ignore external monitoring and analytics requests
          return (
            url.includes('sentry.io') ||
            url.includes('google-analytics.com') ||
            url.includes('posthog.com')
          );
        },
      },
    }),
    Sentry.prismaIntegration(),
    Sentry.nodeContextIntegration(),
  ],

  // Enhanced error filtering and enrichment for server
  beforeSend(event, hint) {
    // Don't send events for non-error console logs
    if (event.level === 'info' || event.level === 'warning') {
      return null;
    }

    // Filter out known non-critical server errors
    const error = hint.originalException;
    if (error instanceof Error) {
      // Filter out expected authentication errors
      if (
        error.message?.includes('Invalid JWT') ||
        error.message?.includes('Authentication failed')
      ) {
        return null;
      }

      // Filter out expected validation errors
      if (
        error.name === 'ValidationError' &&
        !error.message?.includes('critical')
      ) {
        return null;
      }

      // Filter out client disconnection errors
      if (
        error.message?.includes('ECONNRESET') ||
        error.message?.includes('Client disconnected')
      ) {
        return null;
      }
    }

    // Add server context to errors
    event.tags = event.tags || {};
    event.tags.component = event.tags.component || 'server';
    event.tags.feature = event.tags.feature || 'api';
    event.tags.node_version = process.version;
    event.tags.platform = process.platform;

    // Add request context if available
    if (hint.contexts?.request) {
      event.tags.http_method = hint.contexts.request.method;
      event.tags.endpoint = hint.contexts.request.url;
    }

    // Add server performance context
    const memoryUsage = process.memoryUsage();
    event.contexts = event.contexts || {};
    event.contexts.server = {
      memory_usage_mb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      memory_total_mb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      uptime_seconds: process.uptime(),
      load_average:
        process.platform === 'linux' ? require('os').loadavg() : undefined,
    };

    return event;
  },

  // Enhanced breadcrumb filtering for server
  beforeBreadcrumb(breadcrumb) {
    // Skip noisy HTTP logs in production
    if (
      process.env.NODE_ENV === 'production' &&
      breadcrumb.category === 'http' &&
      breadcrumb.data?.status_code &&
      breadcrumb.data.status_code < 400
    ) {
      return null;
    }

    // Add timestamp to all breadcrumbs
    breadcrumb.data = breadcrumb.data || {};
    breadcrumb.data.timestamp = new Date().toISOString();

    return breadcrumb;
  },

  // Set initial tags for server-side context
  initialScope: {
    tags: {
      component: 'server',
      platform: 'node',
      deployment: environment,
      region: process.env.VERCEL_REGION || 'unknown',
    },
  },
});
