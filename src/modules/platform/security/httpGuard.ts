/**
 * @fileoverview Application-level guard that prevents user supplied payloads from
 * referencing Supabase `net.http_*` functions. These functions remain globally
 * executable in some environments and can open the door to SSRF if invoked with
 * arbitrary URLs, so we defensively scan incoming data and reject suspicious
 * requests before they reach the database layer.
 */

import { createLogger } from '../logging/logger';

const log = createLogger({ context: 'security:httpGuard' });

/**
 * Supabase HTTP helper functions that should never be callable from user input.
 */
export const FORBIDDEN_SUPABASE_HTTP_FUNCTIONS = [
  'net.http_get',
  'net.http_post',
  'net.http_delete',
] as const;

const LOWERCASE_FORBIDDEN = FORBIDDEN_SUPABASE_HTTP_FUNCTIONS.map(value =>
  value.toLowerCase()
);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const detectForbiddenReference = (
  candidate: string
): { match: string } | null => {
  const lower = candidate.toLowerCase();
  const match = LOWERCASE_FORBIDDEN.find(forbidden =>
    lower.includes(forbidden)
  );
  return match ? { match } : null;
};

const scanValue = (
  value: unknown,
  path: Array<string | number>
): { match: string; path: Array<string | number> } | null => {
  if (typeof value === 'string') {
    const detection = detectForbiddenReference(value);
    return detection ? { ...detection, path } : null;
  }

  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const nested = scanValue(value[index], [...path, index]);
      if (nested) {
        return nested;
      }
    }
    return null;
  }

  if (isPlainObject(value)) {
    for (const [key, nestedValue] of Object.entries(value)) {
      const nested = scanValue(nestedValue, [...path, key]);
      if (nested) {
        return nested;
      }
    }
    return null;
  }

  return null;
};

export interface ForbiddenSupabaseHttpDetails {
  match: string;
  path: Array<string | number>;
}

export class ForbiddenSupabaseHttpError extends Error {
  constructor(
    message: string,
    public readonly details: ForbiddenSupabaseHttpDetails
  ) {
    super(message);
    this.name = 'ForbiddenSupabaseHttpError';
  }
}

/**
 * Returns metadata about any forbidden reference contained within the payload.
 */
export const findForbiddenSupabaseHttpReference = (
  value: unknown
): ForbiddenSupabaseHttpDetails | null => scanValue(value, []);

export interface EnsureNoSupabaseHttpUsageOptions {
  /** Optional logical context used in logging for easier debugging. */
  context?: string;
}

/**
 * Throws an error when a payload contains a forbidden Supabase HTTP function
 * reference. This guard can be placed immediately after parsing request bodies
 * so that malformed payloads never interact with database clients.
 */
export const ensureNoSupabaseHttpUsage = (
  value: unknown,
  options?: EnsureNoSupabaseHttpUsageOptions
): void => {
  const detection = findForbiddenSupabaseHttpReference(value);

  if (!detection) {
    return;
  }

  const { match, path } = detection;
  const joinedPath = path.length > 0 ? path.join('.') : 'root';
  const message = options?.context
    ? `Forbidden Supabase HTTP reference detected in ${options.context}: ${match}`
    : `Forbidden Supabase HTTP reference detected: ${match}`;

  log.error(message, {
    feature: 'supabase-http-guard',
    path: joinedPath,
  });

  throw new ForbiddenSupabaseHttpError(message, detection);
};
