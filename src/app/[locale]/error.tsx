'use client';

import { ErrorPageComponent } from '@/components/shared/error-page';

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorPageComponent
      error={error}
      reset={reset}
      description="We encountered an error while loading this page. Please try again or go back to the homepage."
      logPrefix="Locale-specific error"
    />
  );
}