import type { SafeParseReturnType } from 'zod';

import {
  taskListQuerySchema,
  type TaskListQueryInput,
} from '../types/task';

type TaskListQueryParseResult = SafeParseReturnType<
  Record<string, unknown>,
  TaskListQueryInput
>;

const getOptionalParam = (
  searchParams: URLSearchParams,
  key: string
): string | undefined => {
  const value = searchParams.get(key);
  return value !== null && value !== '' ? value : undefined;
};

const getOptionalMultiParam = (
  searchParams: URLSearchParams,
  key: string
): string[] | undefined => {
  const values = searchParams.getAll(key).filter(Boolean);
  return values.length > 0 ? values : undefined;
};

export const parseTaskListQueryParams = (
  searchParams: URLSearchParams
): TaskListQueryParseResult => {
  const rawQuery: Record<string, unknown> = {
    coachId: getOptionalParam(searchParams, 'coachId'),
    clientId: getOptionalParam(searchParams, 'clientId'),
    categoryId: getOptionalParam(searchParams, 'categoryId'),
    status: getOptionalMultiParam(searchParams, 'status'),
    priority: getOptionalMultiParam(searchParams, 'priority'),
    includeArchived: getOptionalParam(searchParams, 'includeArchived'),
    search: getOptionalParam(searchParams, 'search'),
    dueDateFrom: getOptionalParam(searchParams, 'dueDateFrom'),
    dueDateTo: getOptionalParam(searchParams, 'dueDateTo'),
    sort: getOptionalParam(searchParams, 'sort'),
    sortOrder: getOptionalParam(searchParams, 'sortOrder'),
    page: getOptionalParam(searchParams, 'page'),
    pageSize: getOptionalParam(searchParams, 'pageSize'),
  };

  return taskListQuerySchema.safeParse(rawQuery);
};

export type { TaskListQueryParseResult };
