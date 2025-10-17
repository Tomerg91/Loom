import {
  queryOptions,
  type QueryKey,
  type UndefinedInitialDataOptions,
} from '@tanstack/react-query';

/**
 * Shared defaults for dashboard queries.
 *
 * Dashboard data changes frequently but not on every request, so we keep a short
 * stale window for optimistic UI while avoiding repeated network calls when
 * users navigate between widgets.
 */
export const DASHBOARD_QUERY_DEFAULTS = {
  staleTime: 2 * 60 * 1000, // 2 minutes
  gcTime: 30 * 60 * 1000, // 30 minutes
  refetchOnWindowFocus: false,
  refetchOnReconnect: 'always' as const,
  retry: 1,
};

export function dashboardQueryOptions<
  TQueryFnData,
  TError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  options: UndefinedInitialDataOptions<TQueryFnData, TError, TData, TQueryKey>
) {
  return queryOptions({
    ...DASHBOARD_QUERY_DEFAULTS,
    ...options,
  });
}
