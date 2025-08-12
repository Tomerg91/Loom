'use client';

import { ErrorPageComponent } from '@/components/shared/error-page';

export default function Error({
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
      logPrefix="Application error"
    />
  );
}