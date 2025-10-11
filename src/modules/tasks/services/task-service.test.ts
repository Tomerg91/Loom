import { describe, expect, it } from 'vitest';

import { serializeTaskRecord, type TaskRecordWithRelations } from './task-service';

const buildTaskRecord = (
  overrides: Partial<TaskRecordWithRelations> = {}
): TaskRecordWithRelations => ({
  id: 'task-id',
  coach_id: 'coach-id',
  client_id: 'client-id',
  category_id: null,
  title: 'Breath practice',
  description: 'Spend five minutes with mindful breathing.',
  priority: 'HIGH',
  status: 'PENDING',
  visibility_to_coach: true,
  due_date: '2024-01-01T00:00:00.000Z',
  recurrence_rule: null,
  archived_at: null,
  created_at: '2023-12-31T18:00:00.000Z',
  updated_at: '2024-01-01T18:00:00.000Z',
  category: null,
  instances: [
    {
      id: 'instance-id',
      task_id: 'task-id',
      due_date: '2024-01-01T00:00:00.000Z',
      scheduled_date: '2024-01-01T00:00:00.000Z',
      status: 'PENDING',
      completion_percentage: 0,
      completed_at: null,
      created_at: '2023-12-31T18:00:00.000Z',
      updated_at: '2023-12-31T18:00:00.000Z',
    },
  ],
  client: {
    id: 'client-id',
    email: 'client@example.com',
    first_name: 'Taylor',
    last_name: 'Rivera',
    avatar_url: null,
    created_at: '2023-01-01T00:00:00.000Z',
    language: 'en',
    last_seen_at: null,
    mfa_backup_codes: null,
    mfa_enabled: null,
    mfa_secret: null,
    mfa_setup_completed: null,
    mfa_verified_at: null,
    phone: null,
    remember_device_enabled: null,
    role: 'client',
    status: 'active',
    timezone: 'America/Los_Angeles',
    updated_at: '2023-01-01T00:00:00.000Z',
  },
  ...overrides,
});

describe('serializeTaskRecord', () => {
  it('includes client metadata when available', () => {
    const dto = serializeTaskRecord(buildTaskRecord());

    expect(dto.client).toEqual({
      id: 'client-id',
      firstName: 'Taylor',
      lastName: 'Rivera',
      email: 'client@example.com',
    });
  });

  it('gracefully handles tasks without a client join', () => {
    const dto = serializeTaskRecord(buildTaskRecord({ client: null }));

    expect(dto.client).toBeNull();
  });
});
