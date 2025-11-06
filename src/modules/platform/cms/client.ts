/**
 * @file Provides a cached accessor for marketing content. The implementation
 *       currently reads from structured JSON files but can be swapped for an
 *       external CMS without impacting consumers.
 */
import { cache } from 'react';

import landingEn from '@/i18n/locales/en/landing.json';
import landingHe from '@/i18n/locales/he/landing.json';

import { LandingContent, LandingContentSchema, LandingLocale } from './types';
import { logger } from '@/lib/logger';

/**
 * Cached accessor that simulates fetching marketing content from an external CMS.
 *
 * The loader uses Zod validation to ensure that authored JSON content remains
 * structurally sound even when edited outside of the codebase.
 *
 * @param rawLocale - Locale string provided by the routing layer.
 * @returns Validated marketing content for the requested locale (defaults to Hebrew).
 */
export const getLandingContent = cache(
  async (rawLocale: string): Promise<LandingContent> => {
    const locale: LandingLocale = rawLocale === 'en' ? 'en' : 'he';
    const source = locale === 'en' ? landingEn : landingHe;

    const parsed = LandingContentSchema.safeParse(source);
    if (!parsed.success) {
      logger.error(
        'Invalid landing content payload, falling back to Hebrew defaults',
        parsed.error.flatten()
      );
      const fallback = LandingContentSchema.parse(landingHe);
      return fallback;
    }

    return parsed.data;
  }
);
