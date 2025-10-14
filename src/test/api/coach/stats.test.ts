/**
 * Comprehensive test suite for /api/coach/stats
 * Priority 2 - Core Business Logic API
 * 
 * Tests: Coach Authentication, Statistics Calculation, Data Aggregation, Performance
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/coach/stats/route';
import { mockUser, mockCoachUser, mockAdminUser, mockSupabaseClient } from '@/test/utils';

// Mock all dependencies
vi.mock('@/lib/services/auth-service', () => ({
  authService: {
    getSession: vi.fn(),
  },
}));

vi.mock('@/lib/api/types', () => ({
  ApiResponseHelper: {
    success: vi.fn((data) => new Response(JSON.stringify({ success: true, data }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })),
    forbidden: vi.fn((message) => new Response(JSON.stringify({ 
      success: false, 
      error: message 
    }), { 
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    })),
    internalError: vi.fn((message) => new Response(JSON.stringify({ 
      success: false, 
      error: message 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })),
    error: vi.fn((code, message) => new Response(JSON.stringify({ 
      success: false, 
      error: message,
      code 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })),
  },
}));

vi.mock('@/lib/api/errors', () => ({
  ApiError: class ApiError extends Error {
    constructor(public code: string, message: string) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() => mockSupabaseClient),
}));

vi.mock('@/lib/config/analytics-constants', () => ({
  getSessionRate: vi.fn(() => 100), // $100 per session
  getDefaultCoachRating: vi.fn(() => 4.5),
}));

// Import mocked functions
import { authService } from '@/lib/services/auth-service';
import { ApiResponseHelper } from '@/lib/api/types';
import { ApiError } from '@/lib/api/errors';
import { createServerClient } from '@/lib/supabase/server';
import { getSessionRate, getDefaultCoachRating } from '@/lib/config/analytics-constants';

const mockAuthService = vi.mocked(authService);
const mockApiResponseHelper = vi.mocked(ApiResponseHelper);
const mockCreateServerClient = vi.mocked(createServerClient);
const mockGetSessionRate = vi.mocked(getSessionRate);
const mockGetDefaultCoachRating = vi.mocked(getDefaultCoachRating);

describe('/api/coach/stats', () => {
  const currentDate = new Date('2024-01-15T12:00:00Z');
  
  const mockSessions = [
    {
      id: 'session-1',
      status: 'completed',
      scheduled_at: '2024-01-10T10:00:00Z',
      client_id: 'client-1',
    },
    {
      id: 'session-2', 
      status: 'completed',
      scheduled_at: '2024-01-12T14:00:00Z',
      client_id: 'client-2',
    },
    {
      id: 'session-3',
      status: 'scheduled',
      scheduled_at: '2024-01-20T09:00:00Z',
      client_id: 'client-1',
    },
    {
      id: 'session-4',
      status: 'scheduled',
      scheduled_at: '2024-01-16T11:00:00Z',
      client_id: 'client-3',
    },
    {
      id: 'session-5',
      status: 'completed',
      scheduled_at: '2023-12-01T15:00:00Z', // Old session
      client_id: 'client-4',
    },
  ];

  const mockReflections = [
    { session_id: 'session-1', mood_rating: 8 },
    { session_id: 'session-2', mood_rating: 9 },
    { session_id: 'session-5', mood_rating: 7 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(currentDate);
    
    // Setup default mock implementations
    mockCreateServerClient.mockReturnValue(mockSupabaseClient);
    mockGetSessionRate.mockReturnValue(100);
    mockGetDefaultCoachRating.mockReturnValue(4.5);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  describe('GET /api/coach/stats', () => {
    describe('Authentication and Authorization Testing', () => {
      it('should allow coach access to stats', async () => {
        mockAuthService.getSession.mockResolvedValue({
          user: mockCoachUser,
        });

        mockSupabaseClient.from.mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: mockSessions }),
        });

        const request = new NextRequest('http://localhost:3000/api/coach/stats');

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data).toHaveProperty('totalSessions');
        expect(data.data).toHaveProperty('completedSessions');
        expect(data.data).toHaveProperty('upcomingSessions');
      });

      it('should reject non-coach users', async () => {
        mockAuthService.getSession.mockResolvedValue({
          user: mockUser, // client user
        });

        const request = new NextRequest('http://localhost:3000/api/coach/stats');

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Coach access required');
        expect(mockApiResponseHelper.forbidden).toHaveBeenCalledWith('Coach access required');
      });

      it('should reject admin users', async () => {
        mockAuthService.getSession.mockResolvedValue({
          user: mockAdminUser,
        });

        const request = new NextRequest('http://localhost:3000/api/coach/stats');

        const response = await GET(request);

        expect(response.status).toBe(403);
        expect(mockApiResponseHelper.forbidden).toHaveBeenCalledWith('Coach access required');
      });

      it('should reject unauthenticated requests', async () => {
        mockAuthService.getSession.mockResolvedValue(null);

        const request = new NextRequest('http://localhost:3000/api/coach/stats');

        const response = await GET(request);

        expect(response.status).toBe(403);
        expect(mockApiResponseHelper.forbidden).toHaveBeenCalledWith('Coach access required');
      });

      it('should reject requests with null user', async () => {
        mockAuthService.getSession.mockResolvedValue({
          user: null as any,
        });

        const request = new NextRequest('http://localhost:3000/api/coach/stats');

        const response = await GET(request);

        expect(response.status).toBe(403);
        expect(mockApiResponseHelper.forbidden).toHaveBeenCalledWith('Coach access required');
      });
    });

    describe('Statistics Calculation Testing', () => {
      beforeEach(() => {
        mockAuthService.getSession.mockResolvedValue({
          user: mockCoachUser,
        });
      });

      it('should calculate basic session statistics correctly', async () => {
        mockSupabaseClient.from.mockImplementation((table: string) => {
          if (table === 'sessions') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockResolvedValue({ data: mockSessions }),
            };
          }
          if (table === 'reflections') {
            return {
              select: vi.fn().mockReturnThis(),
              in: vi.fn().mockReturnThis(),
              not: vi.fn().mockResolvedValue({ data: mockReflections }),
            };
          }
          return { select: vi.fn(), eq: vi.fn(), in: vi.fn(), not: vi.fn() };
        });

        const request = new NextRequest('http://localhost:3000/api/coach/stats');

        const response = await GET(request);
        const data = await response.json();

        expect(data.data.totalSessions).toBe(5);
        expect(data.data.completedSessions).toBe(3);
        expect(data.data.upcomingSessions).toBe(2); // Sessions scheduled after current date
      });

      it('should calculate client statistics correctly', async () => {
        mockSupabaseClient.from.mockImplementation((table: string) => {
          if (table === 'sessions') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockResolvedValue({ data: mockSessions }),
            };
          }
          return { select: vi.fn(), eq: vi.fn() };
        });

        const request = new NextRequest('http://localhost:3000/api/coach/stats');

        const response = await GET(request);
        const data = await response.json();

        // 4 unique clients: client-1, client-2, client-3, client-4
        expect(data.data.totalClients).toBe(4);
        
        // Active clients: clients with sessions in last 30 days
        // client-1, client-2, client-3 have recent sessions
        expect(data.data.activeClients).toBe(3);
      });

      it('should calculate this week sessions correctly', async () => {
        // Current date is 2024-01-15 (Monday)
        // Week starts on Sunday 2024-01-14
        const sessionsThisWeek = [
          {
            id: 'session-week-1',
            status: 'completed',
            scheduled_at: '2024-01-14T10:00:00Z', // Sunday (start of week)
            client_id: 'client-1',
          },
          {
            id: 'session-week-2',
            status: 'completed',
            scheduled_at: '2024-01-15T10:00:00Z', // Monday (current date)
            client_id: 'client-2',
          },
        ];

        mockSupabaseClient.from.mockImplementation((table: string) => {
          if (table === 'sessions') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockResolvedValue({ data: sessionsThisWeek }),
            };
          }
          return { select: vi.fn(), eq: vi.fn() };
        });

        const request = new NextRequest('http://localhost:3000/api/coach/stats');

        const response = await GET(request);
        const data = await response.json();

        expect(data.data.thisWeekSessions).toBe(2);
      });

      it('should calculate revenue correctly', async () => {
        mockSupabaseClient.from.mockImplementation((table: string) => {
          if (table === 'sessions') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockResolvedValue({ data: mockSessions }),
            };
          }
          return { select: vi.fn(), eq: vi.fn() };
        });

        const request = new NextRequest('http://localhost:3000/api/coach/stats');

        const response = await GET(request);
        const data = await response.json();

        // 3 completed sessions × $100 per session = $300
        expect(data.data.totalRevenue).toBe(300);
        expect(mockGetSessionRate).toHaveBeenCalled();
      });

      it('should calculate average rating from reflections', async () => {
        mockSupabaseClient.from.mockImplementation((table: string) => {
          if (table === 'sessions') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockResolvedValue({ data: mockSessions }),
            };
          }
          if (table === 'reflections') {
            return {
              select: vi.fn().mockReturnThis(),
              in: vi.fn().mockReturnThis(),
              not: vi.fn().mockResolvedValue({ data: mockReflections }),
            };
          }
          return { select: vi.fn(), eq: vi.fn(), in: vi.fn(), not: vi.fn() };
        });

        const request = new NextRequest('http://localhost:3000/api/coach/stats');

        const response = await GET(request);
        const data = await response.json();

        // Average of ratings: (8 + 9 + 7) / 3 = 8.0
        expect(data.data.averageRating).toBe(8.0);
      });

      it('should use default rating when no reflections exist', async () => {
        mockSupabaseClient.from.mockImplementation((table: string) => {
          if (table === 'sessions') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockResolvedValue({ data: mockSessions }),
            };
          }
          if (table === 'reflections') {
            return {
              select: vi.fn().mockReturnThis(),
              in: vi.fn().mockReturnThis(),
              not: vi.fn().mockResolvedValue({ data: [] }), // No reflections
            };
          }
          return { select: vi.fn(), eq: vi.fn(), in: vi.fn(), not: vi.fn() };
        });

        const request = new NextRequest('http://localhost:3000/api/coach/stats');

        const response = await GET(request);
        const data = await response.json();

        expect(data.data.averageRating).toBe(4.5); // Default from config
        expect(mockGetDefaultCoachRating).toHaveBeenCalled();
      });

      it('should handle null ratings in reflections', async () => {
        const reflectionsWithNulls = [
          { session_id: 'session-1', mood_rating: 8 },
          { session_id: 'session-2', mood_rating: null },
          { session_id: 'session-5', mood_rating: 0 }, // Should be excluded
          { session_id: 'session-6', mood_rating: 9 },
        ];

        mockSupabaseClient.from.mockImplementation((table: string) => {
          if (table === 'sessions') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockResolvedValue({ data: mockSessions }),
            };
          }
          if (table === 'reflections') {
            return {
              select: vi.fn().mockReturnThis(),
              in: vi.fn().mockReturnThis(),
              not: vi.fn().mockResolvedValue({ data: reflectionsWithNulls }),
            };
          }
          return { select: vi.fn(), eq: vi.fn(), in: vi.fn(), not: vi.fn() };
        });

        const request = new NextRequest('http://localhost:3000/api/coach/stats');

        const response = await GET(request);
        const data = await response.json();

        // Only valid ratings: (8 + 9) / 2 = 8.5
        expect(data.data.averageRating).toBe(8.5);
      });
    });

    describe('Edge Cases and Data Scenarios', () => {
      beforeEach(() => {
        mockAuthService.getSession.mockResolvedValue({
          user: mockCoachUser,
        });
      });

      it('should handle coach with no sessions', async () => {
        mockSupabaseClient.from.mockImplementation((table: string) => {
          if (table === 'sessions') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockResolvedValue({ data: [] }),
            };
          }
          return { select: vi.fn(), eq: vi.fn() };
        });

        const request = new NextRequest('http://localhost:3000/api/coach/stats');

        const response = await GET(request);
        const data = await response.json();

        expect(data.data.totalSessions).toBe(0);
        expect(data.data.completedSessions).toBe(0);
        expect(data.data.upcomingSessions).toBe(0);
        expect(data.data.totalClients).toBe(0);
        expect(data.data.activeClients).toBe(0);
        expect(data.data.thisWeekSessions).toBe(0);
        expect(data.data.totalRevenue).toBe(0);
        expect(data.data.averageRating).toBe(4.5); // Default rating
      });

      it('should handle null session data from database', async () => {
        mockSupabaseClient.from.mockImplementation((table: string) => {
          if (table === 'sessions') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockResolvedValue({ data: null }),
            };
          }
          return { select: vi.fn(), eq: vi.fn() };
        });

        const request = new NextRequest('http://localhost:3000/api/coach/stats');

        const response = await GET(request);
        const data = await response.json();

        expect(data.data.totalSessions).toBe(0);
        expect(data.data.completedSessions).toBe(0);
        expect(data.data.upcomingSessions).toBe(0);
      });

      it('should handle sessions with invalid dates gracefully', async () => {
        const sessionsWithInvalidDates = [
          {
            id: 'session-1',
            status: 'completed',
            scheduled_at: 'invalid-date',
            client_id: 'client-1',
          },
          {
            id: 'session-2',
            status: 'scheduled',
            scheduled_at: null,
            client_id: 'client-2',
          },
          {
            id: 'session-3',
            status: 'scheduled',
            scheduled_at: '2024-01-20T09:00:00Z',
            client_id: 'client-3',
          },
        ];

        mockSupabaseClient.from.mockImplementation((table: string) => {
          if (table === 'sessions') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockResolvedValue({ data: sessionsWithInvalidDates }),
            };
          }
          return { select: vi.fn(), eq: vi.fn() };
        });

        const request = new NextRequest('http://localhost:3000/api/coach/stats');

        const response = await GET(request);
        const data = await response.json();

        expect(data.data.totalSessions).toBe(3);
        // Only the valid session should count as upcoming
        expect(data.data.upcomingSessions).toBe(1);
      });

      it('should handle different session statuses correctly', async () => {
        const mixedStatusSessions = [
          { id: '1', status: 'completed', scheduled_at: '2024-01-10T10:00:00Z', client_id: 'c1' },
          { id: '2', status: 'scheduled', scheduled_at: '2024-01-20T10:00:00Z', client_id: 'c2' },
          { id: '3', status: 'cancelled', scheduled_at: '2024-01-12T10:00:00Z', client_id: 'c3' },
          { id: '4', status: 'no_show', scheduled_at: '2024-01-11T10:00:00Z', client_id: 'c4' },
          { id: '5', status: 'rescheduled', scheduled_at: '2024-01-13T10:00:00Z', client_id: 'c5' },
        ];

        mockSupabaseClient.from.mockImplementation((table: string) => {
          if (table === 'sessions') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockResolvedValue({ data: mixedStatusSessions }),
            };
          }
          return { select: vi.fn(), eq: vi.fn() };
        });

        const request = new NextRequest('http://localhost:3000/api/coach/stats');

        const response = await GET(request);
        const data = await response.json();

        expect(data.data.totalSessions).toBe(5);
        expect(data.data.completedSessions).toBe(1); // Only completed sessions
        expect(data.data.upcomingSessions).toBe(1); // Only scheduled sessions in future
        expect(data.data.totalRevenue).toBe(100); // Only completed sessions count for revenue
      });

      it('should calculate active clients correctly with different time windows', async () => {
        // Set current date to 2024-02-15 for this test
        const futureDate = new Date('2024-02-15T12:00:00Z');
        vi.setSystemTime(futureDate);

        const timeBasedSessions = [
          {
            id: '1',
            status: 'completed',
            scheduled_at: '2024-02-10T10:00:00Z', // 5 days ago - active
            client_id: 'client-recent',
          },
          {
            id: '2',
            status: 'completed',
            scheduled_at: '2024-01-10T10:00:00Z', // 36 days ago - not active
            client_id: 'client-old',
          },
          {
            id: '3',
            status: 'scheduled',
            scheduled_at: '2024-02-20T10:00:00Z', // Future - active
            client_id: 'client-future',
          },
        ];

        mockSupabaseClient.from.mockImplementation((table: string) => {
          if (table === 'sessions') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockResolvedValue({ data: timeBasedSessions }),
            };
          }
          return { select: vi.fn(), eq: vi.fn() };
        });

        const request = new NextRequest('http://localhost:3000/api/coach/stats');

        const response = await GET(request);
        const data = await response.json();

        expect(data.data.totalClients).toBe(3);
        expect(data.data.activeClients).toBe(2); // client-recent and client-future
      });
    });

    describe('Database Operations Testing', () => {
      beforeEach(() => {
        mockAuthService.getSession.mockResolvedValue({
          user: mockCoachUser,
        });
      });

      it('should query sessions with correct coach ID filter', async () => {
        const mockFrom = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: mockSessions }),
        };

        mockSupabaseClient.from.mockReturnValue(mockFrom);

        const request = new NextRequest('http://localhost:3000/api/coach/stats');

        await GET(request);

        expect(mockSupabaseClient.from).toHaveBeenCalledWith('sessions');
        expect(mockFrom.select).toHaveBeenCalledWith('id, status, scheduled_at, client_id');
        expect(mockFrom.eq).toHaveBeenCalledWith('coach_id', mockCoachUser.id);
      });

      it('should query reflections for completed sessions only', async () => {
        mockSupabaseClient.from.mockImplementation((table: string) => {
          if (table === 'sessions') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockResolvedValue({ data: mockSessions }),
            };
          }
          if (table === 'reflections') {
            const mockReflectionsFrom = {
              select: vi.fn().mockReturnThis(),
              in: vi.fn().mockReturnThis(),
              not: vi.fn().mockResolvedValue({ data: mockReflections }),
            };
            return mockReflectionsFrom;
          }
          return { select: vi.fn(), eq: vi.fn(), in: vi.fn(), not: vi.fn() };
        });

        const request = new NextRequest('http://localhost:3000/api/coach/stats');

        await GET(request);

        const reflectionsFrom = mockSupabaseClient.from('reflections');
        expect(reflectionsFrom.select).toHaveBeenCalledWith('mood_rating');
        
        // Should query only completed session IDs
        const completedSessionIds = mockSessions
          .filter(s => s.status === 'completed')
          .map(s => s.id);
        expect(reflectionsFrom.in).toHaveBeenCalledWith('session_id', completedSessionIds);
        expect(reflectionsFrom.not).toHaveBeenCalledWith('mood_rating', 'is', null);
      });

      it('should handle database query failures', async () => {
        mockSupabaseClient.from.mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockRejectedValue(new Error('Database connection failed')),
        });

        const request = new NextRequest('http://localhost:3000/api/coach/stats');

        const response = await GET(request);

        expect(response.status).toBe(500);
        expect(mockApiResponseHelper.internalError).toHaveBeenCalledWith(
          'Failed to fetch coach statistics'
        );
      });

      it('should handle reflections query failure gracefully', async () => {
        mockSupabaseClient.from.mockImplementation((table: string) => {
          if (table === 'sessions') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockResolvedValue({ data: mockSessions }),
            };
          }
          if (table === 'reflections') {
            return {
              select: vi.fn().mockReturnThis(),
              in: vi.fn().mockReturnThis(),
              not: vi.fn().mockRejectedValue(new Error('Reflections query failed')),
            };
          }
          return { select: vi.fn(), eq: vi.fn(), in: vi.fn(), not: vi.fn() };
        });

        const request = new NextRequest('http://localhost:3000/api/coach/stats');

        const response = await GET(request);

        expect(response.status).toBe(500);
        expect(mockApiResponseHelper.internalError).toHaveBeenCalledWith(
          'Failed to fetch coach statistics'
        );
      });
    });

    describe('Performance and Configuration Testing', () => {
      beforeEach(() => {
        mockAuthService.getSession.mockResolvedValue({
          user: mockCoachUser,
        });
      });

      it('should use configured session rate for revenue calculation', async () => {
        mockGetSessionRate.mockReturnValue(150); // Custom rate

        mockSupabaseClient.from.mockImplementation((table: string) => {
          if (table === 'sessions') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockResolvedValue({ 
                data: [
                  { id: '1', status: 'completed', scheduled_at: '2024-01-10T10:00:00Z', client_id: 'c1' },
                  { id: '2', status: 'completed', scheduled_at: '2024-01-12T10:00:00Z', client_id: 'c2' },
                ]
              }),
            };
          }
          return { select: vi.fn(), eq: vi.fn() };
        });

        const request = new NextRequest('http://localhost:3000/api/coach/stats');

        const response = await GET(request);
        const data = await response.json();

        expect(data.data.totalRevenue).toBe(300); // 2 sessions × $150
        expect(mockGetSessionRate).toHaveBeenCalled();
      });

      it('should use configured default rating when appropriate', async () => {
        mockGetDefaultCoachRating.mockReturnValue(3.8); // Custom default

        mockSupabaseClient.from.mockImplementation((table: string) => {
          if (table === 'sessions') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockResolvedValue({ 
                data: [{ id: '1', status: 'completed', scheduled_at: '2024-01-10T10:00:00Z', client_id: 'c1' }]
              }),
            };
          }
          if (table === 'reflections') {
            return {
              select: vi.fn().mockReturnThis(),
              in: vi.fn().mockReturnThis(),
              not: vi.fn().mockResolvedValue({ data: [] }), // No reflections
            };
          }
          return { select: vi.fn(), eq: vi.fn(), in: vi.fn(), not: vi.fn() };
        });

        const request = new NextRequest('http://localhost:3000/api/coach/stats');

        const response = await GET(request);
        const data = await response.json();

        expect(data.data.averageRating).toBe(3.8);
        expect(mockGetDefaultCoachRating).toHaveBeenCalled();
      });

      it('should handle large datasets efficiently', async () => {
        // Create a large dataset
        const largeSessions = Array.from({ length: 1000 }, (_, i) => ({
          id: `session-${i}`,
          status: i % 3 === 0 ? 'completed' : 'scheduled',
          scheduled_at: `2024-01-${(i % 30) + 1}T10:00:00Z`,
          client_id: `client-${i % 50}`, // 50 unique clients
        }));

        mockSupabaseClient.from.mockImplementation((table: string) => {
          if (table === 'sessions') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockResolvedValue({ data: largeSessions }),
            };
          }
          if (table === 'reflections') {
            return {
              select: vi.fn().mockReturnThis(),
              in: vi.fn().mockReturnThis(),
              not: vi.fn().mockResolvedValue({ data: [] }),
            };
          }
          return { select: vi.fn(), eq: vi.fn(), in: vi.fn(), not: vi.fn() };
        });

        const request = new NextRequest('http://localhost:3000/api/coach/stats');

        const startTime = Date.now();
        const response = await GET(request);
        const endTime = Date.now();

        expect(response.status).toBe(200);
        
        const data = await response.json();
        expect(data.data.totalSessions).toBe(1000);
        expect(data.data.totalClients).toBe(50);
        
        // Should complete reasonably quickly (less than 1 second)
        expect(endTime - startTime).toBeLessThan(1000);
      });
    });

    describe('Error Handling', () => {
      beforeEach(() => {
        mockAuthService.getSession.mockResolvedValue({
          user: mockCoachUser,
        });
      });

      it('should handle authentication service errors', async () => {
        mockAuthService.getSession.mockRejectedValue(new Error('Auth service unavailable'));

        const request = new NextRequest('http://localhost:3000/api/coach/stats');

        const response = await GET(request);

        expect(response.status).toBe(500);
        expect(mockApiResponseHelper.internalError).toHaveBeenCalledWith(
          'Failed to fetch coach statistics'
        );
      });

      it('should handle ApiError exceptions', async () => {
        const apiError = new ApiError('STATS_ERROR', 'Statistics calculation failed');
        mockSupabaseClient.from.mockImplementation(() => {
          throw apiError;
        });

        const request = new NextRequest('http://localhost:3000/api/coach/stats');

        const response = await GET(request);

        expect(response.status).toBe(500);
        expect(mockApiResponseHelper.error).toHaveBeenCalledWith(
          'STATS_ERROR',
          'Statistics calculation failed'
        );
      });

      it('should log errors properly', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        
        mockSupabaseClient.from.mockImplementation(() => {
          throw new Error('Unexpected database error');
        });

        const request = new NextRequest('http://localhost:3000/api/coach/stats');

        await GET(request);

        expect(consoleSpy).toHaveBeenCalledWith(
          'Coach stats API error:',
          expect.any(Error)
        );

        consoleSpy.mockRestore();
      });

      it('should handle configuration service errors', async () => {
        mockGetSessionRate.mockImplementation(() => {
          throw new Error('Config service error');
        });

        mockSupabaseClient.from.mockImplementation((table: string) => {
          if (table === 'sessions') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockResolvedValue({ data: mockSessions }),
            };
          }
          return { select: vi.fn(), eq: vi.fn() };
        });

        const request = new NextRequest('http://localhost:3000/api/coach/stats');

        const response = await GET(request);

        expect(response.status).toBe(500);
        expect(mockApiResponseHelper.internalError).toHaveBeenCalledWith(
          'Failed to fetch coach statistics'
        );
      });
    });

    describe('Data Type and Precision Testing', () => {
      beforeEach(() => {
        mockAuthService.getSession.mockResolvedValue({
          user: mockCoachUser,
        });
      });

      it('should round average rating to 1 decimal place', async () => {
        const reflectionsWithDecimals = [
          { session_id: 'session-1', mood_rating: 8.33 },
          { session_id: 'session-2', mood_rating: 7.67 },
          { session_id: 'session-3', mood_rating: 9.15 },
        ];

        mockSupabaseClient.from.mockImplementation((table: string) => {
          if (table === 'sessions') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockResolvedValue({ 
                data: [
                  { id: 'session-1', status: 'completed', scheduled_at: '2024-01-10T10:00:00Z', client_id: 'c1' },
                  { id: 'session-2', status: 'completed', scheduled_at: '2024-01-12T10:00:00Z', client_id: 'c2' },
                  { id: 'session-3', status: 'completed', scheduled_at: '2024-01-14T10:00:00Z', client_id: 'c3' },
                ]
              }),
            };
          }
          if (table === 'reflections') {
            return {
              select: vi.fn().mockReturnThis(),
              in: vi.fn().mockReturnThis(),
              not: vi.fn().mockResolvedValue({ data: reflectionsWithDecimals }),
            };
          }
          return { select: vi.fn(), eq: vi.fn(), in: vi.fn(), not: vi.fn() };
        });

        const request = new NextRequest('http://localhost:3000/api/coach/stats');

        const response = await GET(request);
        const data = await response.json();

        // (8.33 + 7.67 + 9.15) / 3 = 8.383... should round to 8.4
        expect(data.data.averageRating).toBe(8.4);
      });

      it('should return integer values for counts', async () => {
        mockSupabaseClient.from.mockImplementation((table: string) => {
          if (table === 'sessions') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockResolvedValue({ data: mockSessions }),
            };
          }
          return { select: vi.fn(), eq: vi.fn() };
        });

        const request = new NextRequest('http://localhost:3000/api/coach/stats');

        const response = await GET(request);
        const data = await response.json();

        expect(Number.isInteger(data.data.totalSessions)).toBe(true);
        expect(Number.isInteger(data.data.completedSessions)).toBe(true);
        expect(Number.isInteger(data.data.upcomingSessions)).toBe(true);
        expect(Number.isInteger(data.data.totalClients)).toBe(true);
        expect(Number.isInteger(data.data.activeClients)).toBe(true);
        expect(Number.isInteger(data.data.thisWeekSessions)).toBe(true);
        expect(Number.isInteger(data.data.totalRevenue)).toBe(true);
      });
    });
  });
});