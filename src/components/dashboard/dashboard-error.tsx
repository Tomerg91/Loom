'use client';

interface DashboardErrorProps {
  error: Error;
  reset: () => void;
  section?: string;
}

export function DashboardError({
  error,
  reset,
  section = 'dashboard',
}: DashboardErrorProps) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
      <h3 className="font-semibold text-red-900">
        Unable to load {section}
      </h3>
      <p className="mt-1 text-sm text-red-700">{error.message}</p>
      <button
        onClick={reset}
        className="mt-3 inline-flex items-center rounded-md bg-red-100 px-3 py-2 text-sm font-medium text-red-900 hover:bg-red-200"
      >
        Try again
      </button>
    </div>
  );
}
