import { routing } from '@/i18n/routing';

/**
 * Safely resolve a post-auth redirect path.
 * - Accepts local paths only (ignores absolute URLs)
 * - Normalizes slashes and enforces leading slash
 * - Prefixes locale if missing
 * - Defaults to `/<locale>/dashboard`
 */
export function resolveRedirect(locale: string, redirectTo?: string | null): string {
  const fallback = `/${routing.defaultLocale}/dashboard`;
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

  // If already locale-prefixed, keep as-is
  const alreadyPrefixed = routing.locales.some(l => path.startsWith(`/${l}/`) || path === `/${l}`);
  if (alreadyPrefixed) return path;

  // Prefix locale
  if (path === '/') return `/${safeLocale}/dashboard`;
  return `/${safeLocale}${path}`;
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

