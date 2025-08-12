'use client';

import { ErrorPageComponent } from '@/components/shared/error-page';

export default function GlobalError({
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
      title="Application Error"
      description="A critical error occurred. Please refresh the page or contact support."
      logPrefix="Global application error"
      isGlobal={true}
    />
  );
}