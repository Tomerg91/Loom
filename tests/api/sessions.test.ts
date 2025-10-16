import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const coachId = '11111111-2222-3333-4444-555555555555';
const clientId = '66666666-7777-8888-9999-000000000000';

const hoisted = vi.hoisted(() => {
  const schedulerInstance = {
    listCalendar: vi.fn(),
    listRequests: vi.fn(),
    createRequest: vi.fn(),
    updateSession: vi.fn(),
  };

  class MockSessionSchedulerError extends Error {
    status: number;

    constructor(message: string, status = 500) {
      super(message);
      this.status = status;
      this.name = 'SessionSchedulerError';
    }
  }

  const mockGetUser = vi.fn();
  const mockSelect = vi.fn();
  const mockEq = vi.fn(() => ({ single: mockSelect }));
  const mockFrom = vi.fn(() => ({ select: vi.fn(() => ({ eq: mockEq })) }));

  const mockSupabaseClient = {
    auth: { getUser: mockGetUser },
    from: mockFrom,
  } as const;

  return {
    schedulerInstance,
    MockSessionSchedulerError,
    mockGetUser,
    mockSelect,
    mockFrom,
    mockSupabaseClient,
  };
});

vi.mock('@/modules/sessions/server/queries', () => ({
  SessionSchedulerService: vi.fn(() => hoisted.schedulerInstance),
  SessionSchedulerError: hoisted.MockSessionSchedulerError,
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() => hoisted.mockSupabaseClient),
}));

const {
  schedulerInstance,
  MockSessionSchedulerError,
  mockGetUser,
  mockSelect,
} = hoisted;

import { PATCH } from '@/app/api/sessions/[id]/route';
import { GET as GET_SESSIONS, POST } from '@/app/api/sessions/route';

const createRequest = (url: string, init?: RequestInit) =>
  new NextRequest(new Request(url, init));

describe('Sessions API routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetUser.mockResolvedValue({
      data: { user: { id: coachId } },
      error: null,
    });

    mockSelect.mockResolvedValue({
      data: { role: 'coach' },
      error: null,
    });

    schedulerInstance.listCalendar.mockResolvedValue([]);
    schedulerInstance.listRequests.mockResolvedValue([]);
    schedulerInstance.createRequest.mockResolvedValue({ success: true });
    schedulerInstance.updateSession.mockResolvedValue({ success: true });
  });

  it('returns session calendar data for authenticated coach', async () => {
    const response = await GET_SESSIONS(
      createRequest('https://example.com/api/sessions')
    );
    expect(response.status).toBe(200);

    const payload = await response.json();
    expect(payload.success).toBe(true);
    expect(schedulerInstance.listCalendar).toHaveBeenCalledWith(
      { id: coachId, role: 'coach' },
      { end: undefined, limit: undefined, start: undefined }
    );
  });

  it('returns session requests when view parameter is provided', async () => {
    const response = await GET_SESSIONS(
      createRequest('https://example.com/api/sessions?view=requests')
    );

    expect(response.status).toBe(200);
    expect(schedulerInstance.listRequests).toHaveBeenCalledWith({
      id: coachId,
      role: 'coach',
    });
  });

  it('rejects client scheduling for other users', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: clientId } },
      error: null,
    });

    mockSelect.mockResolvedValue({
      data: { role: 'client' },
      error: null,
    });

    const response = await POST(
      createRequest('https://example.com/api/sessions', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test',
          clientId: coachId,
          coachId,
          scheduledAt: new Date().toISOString(),
          durationMinutes: 60,
        }),
      })
    );

    expect(response.status).toBe(403);
    expect(schedulerInstance.createRequest).not.toHaveBeenCalled();
  });

  it('creates a session request for the authenticated client', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: clientId } },
      error: null,
    });

    mockSelect.mockResolvedValue({
      data: { role: 'client' },
      error: null,
    });

    const response = await POST(
      createRequest('https://example.com/api/sessions', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Discovery Session',
          clientId,
          coachId,
          scheduledAt: new Date().toISOString(),
          durationMinutes: 45,
        }),
      })
    );

    expect(response.status).toBe(201);
    expect(schedulerInstance.createRequest).toHaveBeenCalledWith(
      { id: clientId, role: 'client' },
      expect.objectContaining({ clientId })
    );
  });

  it('updates a session when coach submits PATCH', async () => {
    const response = await PATCH(
      createRequest('https://example.com/api/sessions/123', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'completed' }),
      }),
      { params: { id: '123' } }
    );

    expect(response.status).toBe(200);
    expect(schedulerInstance.updateSession).toHaveBeenCalledWith(
      { id: coachId, role: 'coach' },
      '123',
      expect.objectContaining({ status: 'completed' })
    );
  });

  it('propagates scheduler errors to the client', async () => {
    schedulerInstance.listCalendar.mockRejectedValue(
      new MockSessionSchedulerError('Something went wrong', 418)
    );

    const response = await GET_SESSIONS(
      createRequest('https://example.com/api/sessions')
    );

    expect(response.status).toBe(418);
    const payload = await response.json();
    expect(payload.success).toBe(false);
  });
});
