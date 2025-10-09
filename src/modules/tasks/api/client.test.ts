import { describe, expect, it } from 'vitest';

import { buildTaskListQuery, type TaskListFilters } from './client';

describe('buildTaskListQuery', () => {
  it('returns an empty string when no filters are provided', () => {
    expect(buildTaskListQuery()).toBe('');
  });

  it('serializes array filters into repeated query parameters in sorted order', () => {
    const filters: TaskListFilters = {
      clientId: '00000000-0000-0000-0000-000000000001',
      status: ['OVERDUE', 'PENDING', 'COMPLETED'],
      priority: ['HIGH', 'LOW'],
      includeArchived: false,
    };

    const query = buildTaskListQuery(filters);
    const params = new URLSearchParams(query);

    expect(params.get('clientId')).toBe(filters.clientId);
    expect(params.getAll('status')).toEqual([
      'COMPLETED',
      'OVERDUE',
      'PENDING',
    ]);
    expect(params.getAll('priority')).toEqual(['HIGH', 'LOW']);
    expect(params.get('includeArchived')).toBe('false');
  });

  it('supports Date objects for due date filters', () => {
    const from = new Date('2025-01-10T09:00:00.000Z');
    const to = new Date('2025-01-15T09:00:00.000Z');

    const query = buildTaskListQuery({ dueDateFrom: from, dueDateTo: to });
    const params = new URLSearchParams(query);

    expect(params.get('dueDateFrom')).toBe(from.toISOString());
    expect(params.get('dueDateTo')).toBe(to.toISOString());
  });
});
