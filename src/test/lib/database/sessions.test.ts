import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionService } from '@/lib/database/sessions';
import { createMockSession, mockSupabaseClient } from '@/test/utils';

// Mock Supabase clients
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient,
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: () => mockSupabaseClient,
}));

describe('SessionService', () => {
  let sessionService: SessionService;
  const mockSession = createMockSession();

  beforeEach(() => {
    vi.clearAllMocks();
    sessionService = new SessionService();
  });

  describe('create', () => {
    it('creates a new session successfully', async () => {
      const sessionData = {
        title: 'Test Session',
        description: 'Test description',
        coachId: 'coach-id',
        clientId: 'client-id',
        scheduledAt: new Date().toISOString(),
        duration: 60,
        type: 'individual' as const,
      };

      mockSupabaseClient.from().insert().select().single.mockResolvedValue({
        data: mockSession,
        error: null,
      });

      const result = await sessionService.create(sessionData);

      expect(result).toEqual(mockSession);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('sessions');
      expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith({
        ...sessionData,
        status: 'scheduled',
        durationMinutes: 60,
      });
    });

    it('throws error when creation fails', async () => {
      const sessionData = {
        title: 'Test Session',
        coachId: 'coach-id',
        clientId: 'client-id',
        scheduledAt: new Date().toISOString(),
        duration: 60,
        type: 'individual' as const,
      };

      mockSupabaseClient.from().insert().select().single.mockResolvedValue({
        data: null,
        error: new Error('Database error'),
      });

      await expect(sessionService.create(sessionData)).rejects.toThrow('Database error');
    });

    it('validates required fields', async () => {
      const invalidData = {
        title: '',
        coachId: 'coach-id',
        clientId: 'client-id',
        scheduledAt: new Date().toISOString(),
        duration: 60,
        type: 'individual' as const,
      };

      await expect(sessionService.create(invalidData)).rejects.toThrow('Title is required');
    });
  });

  describe('findMany', () => {
    it('returns paginated sessions', async () => {
      const mockSessions = [mockSession, createMockSession({ id: 'session-2' })];
      
      mockSupabaseClient.from().select().eq().order().range.mockResolvedValue({
        data: mockSessions,
        error: null,
        count: 2,
      });

      const result = await sessionService.findMany({
        coachId: 'user-id',
        page: 1,
        limit: 10,
      });

      expect(result.data).toEqual(mockSessions);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      });
    });

    it('filters sessions by status', async () => {
      const mockFilteredSessions = [mockSession];
      
      mockSupabaseClient.from().select().eq().eq().order().range.mockResolvedValue({
        data: mockFilteredSessions,
        error: null,
        count: 1,
      });

      await sessionService.findMany({
        coachId: 'user-id',
        status: 'scheduled',
        page: 1,
        limit: 10,
      });

      expect(mockSupabaseClient.from().eq).toHaveBeenCalledWith('status', 'scheduled');
    });

    it('filters sessions by date range', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';
      
      mockSupabaseClient.from().select().eq().gte().lte().order().range.mockResolvedValue({
        data: [mockSession],
        error: null,
        count: 1,
      });

      await sessionService.findMany({
        coachId: 'user-id',
        startDate,
        endDate,
        page: 1,
        limit: 10,
      });

      expect(mockSupabaseClient.from().gte).toHaveBeenCalledWith('scheduled_at', startDate);
      expect(mockSupabaseClient.from().lte).toHaveBeenCalledWith('scheduled_at', endDate);
    });

    it('handles database errors', async () => {
      mockSupabaseClient.from().select().eq().order().range.mockResolvedValue({
        data: null,
        error: new Error('Database connection failed'),
      });

      await expect(sessionService.findMany({
        coachId: 'user-id',
        page: 1,
        limit: 10,
      })).rejects.toThrow('Database connection failed');
    });
  });

  describe('findById', () => {
    it('returns session by id', async () => {
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: mockSession,
        error: null,
      });

      const result = await sessionService.findById('session-id');

      expect(result).toEqual(mockSession);
      expect(mockSupabaseClient.from().eq).toHaveBeenCalledWith('id', 'session-id');
    });

    it('returns null when session not found', async () => {
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }, // Not found error
      });

      const result = await sessionService.findById('non-existent-id');

      expect(result).toBeNull();
    });

    it('throws error for other database errors', async () => {
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: null,
        error: new Error('Database error'),
      });

      await expect(sessionService.findById('session-id')).rejects.toThrow('Database error');
    });
  });

  describe('update', () => {
    it('updates session successfully', async () => {
      const updateData = {
        title: 'Updated Session',
        description: 'Updated description',
      };

      const updatedSession = { ...mockSession, ...updateData };

      mockSupabaseClient.from().update().eq().select().single.mockResolvedValue({
        data: updatedSession,
        error: null,
      });

      const result = await sessionService.update('session-id', updateData);

      expect(result).toEqual(updatedSession);
      expect(mockSupabaseClient.from().update).toHaveBeenCalledWith({
        ...updateData,
        updated_at: expect.any(String),
      });
    });

    it('validates status transitions', async () => {
      // Test invalid status transition
      await expect(sessionService.update('session-id', {
        status: 'completed',
      })).rejects.toThrow('Invalid status transition');
    });

    it('handles update errors', async () => {
      mockSupabaseClient.from().update().eq().select().single.mockResolvedValue({
        data: null,
        error: new Error('Update failed'),
      });

      await expect(sessionService.update('session-id', {
        title: 'New title',
      })).rejects.toThrow('Update failed');
    });
  });

  describe('delete', () => {
    it('deletes session successfully', async () => {
      mockSupabaseClient.from().delete().eq.mockResolvedValue({
        error: null,
      });

      await sessionService.delete('session-id');

      expect(mockSupabaseClient.from().delete).toHaveBeenCalled();
      expect(mockSupabaseClient.from().eq).toHaveBeenCalledWith('id', 'session-id');
    });

    it('handles delete errors', async () => {
      mockSupabaseClient.from().delete().eq.mockResolvedValue({
        error: new Error('Delete failed'),
      });

      await expect(sessionService.delete('session-id')).rejects.toThrow('Delete failed');
    });
  });

  describe('findUpcoming', () => {
    it('returns upcoming sessions for user', async () => {
      const upcomingSessions = [mockSession];
      
      mockSupabaseClient.from().select().eq().gte().eq().order().limit.mockResolvedValue({
        data: upcomingSessions,
        error: null,
      });

      const result = await sessionService.findUpcoming('user-id', 5);

      expect(result).toEqual(upcomingSessions);
      expect(mockSupabaseClient.from().eq).toHaveBeenCalledWith('status', 'scheduled');
      expect(mockSupabaseClient.from().gte).toHaveBeenCalledWith('scheduled_at', expect.any(String));
    });
  });

  describe('findByDateRange', () => {
    it('returns sessions within date range', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';
      const sessionsInRange = [mockSession];
      
      mockSupabaseClient.from().select().gte().lte().order.mockResolvedValue({
        data: sessionsInRange,
        error: null,
      });

      const result = await sessionService.findByDateRange(startDate, endDate);

      expect(result).toEqual(sessionsInRange);
      expect(mockSupabaseClient.from().gte).toHaveBeenCalledWith('scheduled_at', startDate);
      expect(mockSupabaseClient.from().lte).toHaveBeenCalledWith('scheduled_at', endDate);
    });
  });

  describe('updateStatus', () => {
    it('updates session status', async () => {
      const updatedSession = { ...mockSession, status: 'completed' };
      
      mockSupabaseClient.from().update().eq().select().single.mockResolvedValue({
        data: updatedSession,
        error: null,
      });

      const result = await sessionService.updateStatus('session-id', 'completed');

      expect(result).toEqual(updatedSession);
      expect(mockSupabaseClient.from().update).toHaveBeenCalledWith({
        status: 'completed',
        updated_at: expect.any(String),
      });
    });

    it('validates status values', async () => {
      await expect(sessionService.updateStatus('session-id', 'invalid-status' as 'scheduled'))
        .rejects.toThrow('Invalid status');
    });
  });
});