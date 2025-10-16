'use client';

/**
 * @fileoverview React context used to expose locale direction metadata to
 * client components. Kept in a dedicated client-only module so server bundles
 * never pull in React hooks by accident.
 */

import { createContext, type ReactNode } from 'react';

import {
  DEFAULT_LOCALE,
  getLocaleDirection,
  type AppLocale,
} from './config';

/** Shared value describing the current locale + direction context. */
export interface LocaleDirectionValue {
  locale: AppLocale;
  direction: 'ltr' | 'rtl';
}

/**
 * React context seeded with sensible defaults so client components can inspect
 * the current direction without relying solely on DOM queries.
 */
export const LocaleDirectionContext = createContext<LocaleDirectionValue>({
  locale: DEFAULT_LOCALE,
  direction: getLocaleDirection(DEFAULT_LOCALE),
});

export interface LocaleDirectionProviderProps {
  value: LocaleDirectionValue;
  children: ReactNode;
}

/** Simple provider wrapper to avoid duplicating the React import elsewhere. */
export function LocaleDirectionProvider({
  value,
  children,
}: LocaleDirectionProviderProps) {
  return (
    <LocaleDirectionContext.Provider value={value}>
      {children}
    </LocaleDirectionContext.Provider>
  );
}
