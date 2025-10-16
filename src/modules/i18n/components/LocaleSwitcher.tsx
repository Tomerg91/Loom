/**
 * @fileoverview Dashboard friendly locale switcher that wraps the shared UI
 * component with sensible defaults for the authenticated shell.
 */

'use client';

import { memo } from 'react';

import { LanguageSwitcher } from '@/components/ui/language-switcher';

export interface LocaleSwitcherProps {
  /** When true render the compact button-only variant (useful for mobile). */
  compact?: boolean;
  /** Additional classes forwarded to the underlying component. */
  className?: string;
}

/**
 * Provides a consistent locale toggle for the dashboard shell. The component
 * is memoized because the available languages rarely change at runtime and we
 * want to avoid unnecessary renders when the parent topbar re-renders.
 */
export const LocaleSwitcher = memo(
  ({ compact = false, className }: LocaleSwitcherProps) => {
    if (compact) {
      return <LanguageSwitcher variant="button" className={className} />;
    }

    return (
      <LanguageSwitcher
        variant="dropdown"
        showNativeName
        showFlag
        size="sm"
        className={className}
      />
    );
  }
);

LocaleSwitcher.displayName = 'LocaleSwitcher';
