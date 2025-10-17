import * as Sentry from '@sentry/nextjs';

const environment =
  process.env.VERCEL_ENV || process.env.NODE_ENV || 'development';
const release =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.npm_package_version ||
  '1.0.0';
const resolvedDsn =
  process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN || undefined;

if (!resolvedDsn && environment !== 'development') {
  console.warn(
    '[observability] Sentry DSN not configured for the client bundle; telemetry disabled.'
  );
}

// Production Sentry configuration with comprehensive monitoring
Sentry.init({
  dsn: resolvedDsn,
  enabled: Boolean(resolvedDsn),
  environment,

  // Performance monitoring configuration
  tracesSampleRate: environment === 'production' ? 0.3 : 1.0,
  profilesSampleRate: environment === 'production' ? 0.1 : 1.0,
  debug: environment === 'development',

  // Session replay configuration for production debugging
  replaysSessionSampleRate: environment === 'production' ? 0.1 : 0.5,
  replaysOnErrorSampleRate: 1.0,

  // Release tracking
  release,

  // Browser-specific integrations with enhanced monitoring
  integrations: [
    Sentry.browserTracingIntegration({
      enableInp: true,
      enableLongTask: true,
    }),
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
      maskAllInputs: true,
      blockClass: 'sentry-block',
      ignoreClass: 'sentry-ignore',
    }),
    Sentry.feedbackIntegration({
      colorScheme: 'auto',
      showBranding: false,
    }),
  ],

  // Enhanced error filtering and enrichment
  beforeSend(event, hint) {
    // Don't send events for non-error console logs
    if (event.level === 'info' || event.level === 'warning') {
      return null;
    }

    // Filter out known non-critical errors
    const error = hint.originalException;
    if (error instanceof Error) {
      // Filter out network errors that are expected
      if (error.name === 'ChunkLoadError' || error.name === 'Loading chunk') {
        return null;
      }

      // Filter out ResizeObserver errors (common browser quirk)
      if (error.message?.includes('ResizeObserver loop limit exceeded')) {
        return null;
      }

      // Filter out script loading errors from extensions
      if (
        error.message?.includes('chrome-extension://') ||
        error.message?.includes('moz-extension://')
      ) {
        return null;
      }
    }

    // Add business context to errors
    if (event.tags) {
      event.tags.component = event.tags.component || 'unknown';
      event.tags.feature = event.tags.feature || 'unknown';
    }

    // Add user context from local storage if available
    try {
      const userContext = localStorage.getItem('user-context');
      if (userContext && event.user) {
        const userData = JSON.parse(userContext);
        event.user = { ...event.user, ...userData };
      }
    } catch (_error) {
      // Ignore errors accessing localStorage
    }

    return event;
  },

  // Enhanced breadcrumb filtering
  beforeBreadcrumb(breadcrumb) {
    // Skip noisy console logs
    if (breadcrumb.category === 'console' && breadcrumb.level === 'log') {
      return null;
    }

    // Add business context to navigation breadcrumbs
    if (breadcrumb.category === 'navigation') {
      breadcrumb.data = breadcrumb.data || {};
      breadcrumb.data.timestamp = new Date().toISOString();
    }

    return breadcrumb;
  },

  // Set initial tags for client-side context
  initialScope: {
    tags: {
      component: 'client',
      platform: 'web',
      deployment: environment,
    },
  },
});
