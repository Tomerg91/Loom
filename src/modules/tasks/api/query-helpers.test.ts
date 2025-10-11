import { describe, expect, it } from 'vitest';

import { parseTaskListQueryParams } from './query-helpers';

describe('parseTaskListQueryParams', () => {
  it('applies schema defaults when parameters are omitted', () => {
    const params = new URLSearchParams();

    const result = parseTaskListQueryParams(params);

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.data.page).toBe(1);
    expect(result.data.pageSize).toBe(20);
    expect(result.data.sort).toBe('dueDate');
    expect(result.data.sortOrder).toBe('asc');
  });

  it('normalizes repeated parameters into arrays', () => {
    const params = new URLSearchParams([
      ['status', 'COMPLETED'],
      ['status', ''],
      ['status', 'PENDING'],
      ['priority', 'HIGH'],
      ['priority', 'LOW'],
    ]);

    const result = parseTaskListQueryParams(params);

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.data.status).toEqual(['COMPLETED', 'PENDING']);
    expect(result.data.priority).toEqual(['HIGH', 'LOW']);
  });

  it('returns a failure when validation does not pass', () => {
    const params = new URLSearchParams({ sort: 'invalid' });

    const result = parseTaskListQueryParams(params);

    expect(result.success).toBe(false);
  });
});
