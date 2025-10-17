'use client';

/**
 * @fileoverview Client-side helpers for reading locale direction context.
 */

import { useContext } from 'react';

import { LocaleDirectionContext } from './direction-context';

/** Accessor for the current locale + direction context seeded on the server. */
export function useLocaleDirection() {
  return useContext(LocaleDirectionContext);
}

/** Convenience boolean for components that only care about RTL checks. */
export function useIsRtl() {
  const { direction } = useLocaleDirection();
  return direction === 'rtl';
}
