import { routing } from '@/i18n/routing';

interface ResolveRedirectOptions {
  allowAuthPaths?: boolean;
}

function isAuthRoute(path: string): boolean {
  const sanitized = path.split('?')[0]?.split('#')[0] || '';
  const segments = sanitized.split('/').filter(Boolean);
  if (segments.length === 0) {
    return false;
  }

  const [firstSegment, ...rest] = segments;
  const localePrefixed = routing.locales.includes(firstSegment as any);
  const relevantSegments = localePrefixed ? rest : segments;

  if (relevantSegments.length === 0) {
    return false;
  }

  return relevantSegments[0] === 'auth';
}

/**
 * Safely resolve a post-auth redirect path.
 * - Accepts local paths only (ignores absolute URLs)
 * - Normalizes slashes and enforces leading slash
 * - Prefixes locale if missing
 * - Defaults to `/<locale>/dashboard`
 */
export function resolveRedirect(locale: string, redirectTo?: string | null, options: ResolveRedirectOptions = {}): string {
  const { allowAuthPaths = false } = options;
  const safeLocale = routing.locales.includes(locale as any) ? locale : routing.defaultLocale;

  if (!redirectTo || typeof redirectTo !== 'string') {
    return `/${safeLocale}/dashboard`;
  }

  // Reject external URLs
  const trimmed = redirectTo.trim();
  if (/^https?:\/\//i.test(trimmed) || /^\/\//.test(trimmed)) {
    return `/${safeLocale}/dashboard`;
  }

  // Ensure leading slash and remove duplicate slashes
  let path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  path = path.replace(/\/+/, '/');

  // Determine final path with locale prefixing
  const alreadyPrefixed = routing.locales.some(l => path.startsWith(`/${l}/`) || path === `/${l}`);
  const finalPath = alreadyPrefixed
    ? path
    : path === '/'
      ? `/${safeLocale}/dashboard`
      : `/${safeLocale}${path}`;

  if (!allowAuthPaths && isAuthRoute(finalPath)) {
    return `/${safeLocale}/dashboard`;
  }

  return finalPath;
}

/**
 * Ensure an auth page path is locale-prefixed and safe.
 */
export function resolveAuthPath(locale: string, authPath: string): string {
  const safeLocale = routing.locales.includes(locale as any) ? locale : routing.defaultLocale;
  let path = authPath.startsWith('/') ? authPath : `/${authPath}`;
  const alreadyPrefixed = routing.locales.some(l => path.startsWith(`/${l}/`) || path === `/${l}`);
  if (alreadyPrefixed) return path;
  return `/${safeLocale}${path}`;
}

