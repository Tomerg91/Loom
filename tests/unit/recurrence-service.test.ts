import { describe, expect, it } from 'vitest';

import {
  RecurrenceService,
  RecurrenceServiceError,
} from '@/modules/tasks/services/recurrence-service';

describe('RecurrenceService', () => {
  const baseDate = new Date('2025-02-10T12:00:00.000Z');

  it('returns a single instance when no recurrence is provided', () => {
    const service = new RecurrenceService();

    const plan = service.planInstances({
      dueDate: baseDate,
    });

    expect(plan.recurrenceRule).toBeNull();
    expect(plan.instances).toHaveLength(1);
    expect(plan.instances[0].dueDate.toISOString()).toBe(
      '2025-02-10T12:00:00.000Z'
    );
    expect(plan.instances[0].scheduledDate.toISOString()).toBe(
      '2025-02-10T12:00:00.000Z'
    );
  });

  it('generates recurring instances based on the provided rule', () => {
    const service = new RecurrenceService();

    const plan = service.planInstances({
      dueDate: baseDate,
      recurrenceRule: {
        frequency: 'WEEKLY',
        interval: 1,
        count: 3,
        byWeekday: ['MO'],
      },
    });

    expect(plan.instances).toHaveLength(3);
    expect(
      plan.instances.map(instance => instance.dueDate.toISOString())
    ).toEqual([
      '2025-02-10T12:00:00.000Z',
      '2025-02-17T12:00:00.000Z',
      '2025-02-24T12:00:00.000Z',
    ]);
    expect(plan.recurrenceRule?.rrule).toContain('FREQ=WEEKLY');
  });

  it('respects the service instance limit when no count/until is provided', () => {
    const service = new RecurrenceService(2);

    const plan = service.planInstances({
      dueDate: baseDate,
      recurrenceRule: {
        frequency: 'DAILY',
        interval: 1,
      },
    });

    expect(plan.instances).toHaveLength(2);
    expect(
      plan.instances.map(instance => instance.dueDate.toISOString())
    ).toEqual(['2025-02-10T12:00:00.000Z', '2025-02-11T12:00:00.000Z']);
  });

  it('throws when recurrence metadata is provided without a due date', () => {
    const service = new RecurrenceService();

    expect(() =>
      service.planInstances({
        dueDate: null,
        recurrenceRule: {
          frequency: 'DAILY',
          interval: 1,
        },
      })
    ).toThrow(RecurrenceServiceError);
  });
});
