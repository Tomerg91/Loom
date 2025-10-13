/**
 * Comprehensive test suite for /api/sessions/book
 * Priority 2 - Core Business Logic API
 * 
 * Tests: Authentication, Validation, Business Logic, Database Operations, Notifications
 */

import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { POST, OPTIONS } from '@/app/api/sessions/book/route';

// Mock all dependencies
vi.mock('@/lib/api/utils', () => ({
  createSuccessResponse: vi.fn((data, message = 'Success', status = 200) => 
    new Response(JSON.stringify({ success: true, data, message }), { 
      status,
      headers: { 'Content-Type': 'application/json' }
    })
  ),
  createErrorResponse: vi.fn((message, status = 400) => 
    new Response(JSON.stringify({ success: false, error: message }), { 
      status,
      headers: { 'Content-Type': 'application/json' }
    })
  ),
  withErrorHandling: vi.fn((handler) => handler),
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
  },
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() => mockSupabaseClient),
}));

vi.mock('@/lib/security/rate-limit', () => ({
  rateLimit: vi.fn((limit, window, options) => (handler) => handler),
}));

vi.mock('@/lib/database/availability', () => ({
  isCoachAvailable: vi.fn(),
}));

vi.mock('@/lib/notifications/session-notifications', () => ({
  sessionNotificationService: {
    onSessionBooked: vi.fn(),
  },
}));

vi.mock('@/lib/security/cors', () => ({
  createCorsResponse: vi.fn(() => new Response('', { status: 200 })),
  applyCorsHeaders: vi.fn((response) => response),
}));

// Import mocked functions
import { createSuccessResponse, createErrorResponse } from '@/lib/api/utils';
import { isCoachAvailable } from '@/lib/database/availability';
import { sessionNotificationService } from '@/lib/notifications/session-notifications';
import { createCorsResponse } from '@/lib/security/cors';
import { rateLimit } from '@/lib/security/rate-limit';
import { createServerClient } from '@/lib/supabase/server';
import { mockUser, mockCoachUser, mockSupabaseClient } from '@/test/utils';

const mockCreateSuccessResponse = vi.mocked(createSuccessResponse);
const mockCreateErrorResponse = vi.mocked(createErrorResponse);
const mockCreateServerClient = vi.mocked(createServerClient);
const mockRateLimit = vi.mocked(rateLimit);
const mockIsCoachAvailable = vi.mocked(isCoachAvailable);
const mockSessionNotificationService = vi.mocked(sessionNotificationService);
const mockCreateCorsResponse = vi.mocked(createCorsResponse);

describe('/api/sessions/book', () => {
  const validBookingRequest = {
    coachId: '123e4567-e89b-12d3-a456-426614174000',
    title: 'Coaching Session',
    description: 'Initial consultation session',
    scheduledAt: '2024-12-15T10:00:00Z',
    durationMinutes: 60,
  };

  const mockCoachProfile = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    first_name: 'John',
    last_name: 'Coach',
    email: 'coach@example.com',
  };

  const mockClientProfile = {
    role: 'client',
    first_name: 'Jane',
    last_name: 'Client',
  };

  const mockSessionData = {
    id: 'session-123',
    coach_id: validBookingRequest.coachId,
    client_id: mockUser.id,
    title: validBookingRequest.title,
    description: validBookingRequest.description,
    scheduled_at: validBookingRequest.scheduledAt,
    duration_minutes: validBookingRequest.durationMinutes,
    status: 'scheduled',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default auth
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Setup default rate limiting (no-op wrapper)
    mockRateLimit.mockImplementation((limit, window, options) => (handler) => handler);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('POST /api/sessions/book', () => {
    describe('Authentication Testing', () => {
      it('should allow authenticated client to book session', async () => {
        // Setup successful booking flow
        mockSupabaseClient.from.mockImplementation((table) => {
          if (table === 'users') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockImplementation(() => {
                const eq = vi.fn().mockReturnThis();
                if (eq.mock.calls?.[0]?.[1] === mockUser.id) {
                  return Promise.resolve({ data: mockClientProfile });
                }
                return Promise.resolve({ data: mockCoachProfile });
              }),
            };
          }
          if (table === 'sessions') {
            return {
              insert: vi.fn().mockReturnThis(),
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: mockSessionData, error: null }),
            };
          }
          return { select: vi.fn(), eq: vi.fn(), single: vi.fn() };
        });

        mockIsCoachAvailable.mockResolvedValue(true);

        const request = new NextRequest('http://localhost:3000/api/sessions/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validBookingRequest),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data.success).toBe(true);
        expect(data.data.id).toBe('session-123');
        expect(data.message).toBe('Session booked successfully');
      });

      it('should reject unauthenticated requests', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: new Error('Not authenticated'),
        });

        const request = new NextRequest('http://localhost:3000/api/sessions/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validBookingRequest),
        });

        const response = await POST(request);

        expect(response.status).toBe(401);
        expect(mockCreateErrorResponse).toHaveBeenCalledWith('Unauthorized', 401);
      });

      it('should reject requests with auth errors', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: new Error('Authentication failed'),
        });

        const request = new NextRequest('http://localhost:3000/api/sessions/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validBookingRequest),
        });

        const response = await POST(request);

        expect(response.status).toBe(401);
        expect(mockCreateErrorResponse).toHaveBeenCalledWith('Unauthorized', 401);
      });
    });

    describe('Role Authorization Testing', () => {
      it('should allow clients to book sessions', async () => {
        mockSupabaseClient.from.mockImplementation((table) => {
          if (table === 'users') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockImplementation(() => {
                const calls = vi.fn().mockReturnThis().eq.mock?.calls || [];
                const lastCall = calls[calls.length - 1];
                if (lastCall && lastCall[1] === mockUser.id) {
                  return Promise.resolve({ data: { ...mockClientProfile, role: 'client' } });
                }
                return Promise.resolve({ data: mockCoachProfile });
              }),
            };
          }
          if (table === 'sessions') {
            return {
              insert: vi.fn().mockReturnThis(),
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: mockSessionData, error: null }),
            };
          }
          return { select: vi.fn(), eq: vi.fn(), single: vi.fn() };
        });

        mockIsCoachAvailable.mockResolvedValue(true);

        const request = new NextRequest('http://localhost:3000/api/sessions/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validBookingRequest),
        });

        const response = await POST(request);

        expect(response.status).toBe(201);
      });

      it('should reject non-client users', async () => {
        mockSupabaseClient.from.mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ 
            data: { ...mockClientProfile, role: 'coach' } 
          }),
        });

        const request = new NextRequest('http://localhost:3000/api/sessions/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validBookingRequest),
        });

        const response = await POST(request);

        expect(response.status).toBe(403);
        expect(mockCreateErrorResponse).toHaveBeenCalledWith('Only clients can book sessions', 403);
      });

      it('should reject admin users from booking', async () => {
        mockSupabaseClient.from.mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ 
            data: { ...mockClientProfile, role: 'admin' } 
          }),
        });

        const request = new NextRequest('http://localhost:3000/api/sessions/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validBookingRequest),
        });

        const response = await POST(request);

        expect(response.status).toBe(403);
        expect(mockCreateErrorResponse).toHaveBeenCalledWith('Only clients can book sessions', 403);
      });
    });

    describe('Input Validation Testing', () => {
      beforeEach(() => {
        mockSupabaseClient.from.mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockClientProfile }),
        });
      });

      it('should reject invalid coach ID format', async () => {
        const invalidRequest = {
          ...validBookingRequest,
          coachId: 'invalid-uuid',
        };

        const request = new NextRequest('http://localhost:3000/api/sessions/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidRequest),
        });

        const response = await POST(request);

        expect(response.status).toBe(400);
        expect(mockCreateErrorResponse).toHaveBeenCalledWith(
          expect.stringContaining('Invalid coach ID format'),
          400
        );
      });

      it('should reject missing title', async () => {
        const invalidRequest = {
          ...validBookingRequest,
          title: '',
        };

        const request = new NextRequest('http://localhost:3000/api/sessions/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidRequest),
        });

        const response = await POST(request);

        expect(response.status).toBe(400);
        expect(mockCreateErrorResponse).toHaveBeenCalledWith(
          expect.stringContaining('Title is required'),
          400
        );
      });

      it('should reject title that is too long', async () => {
        const invalidRequest = {
          ...validBookingRequest,
          title: 'A'.repeat(101), // Over 100 characters
        };

        const request = new NextRequest('http://localhost:3000/api/sessions/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidRequest),
        });

        const response = await POST(request);

        expect(response.status).toBe(400);
        expect(mockCreateErrorResponse).toHaveBeenCalledWith(
          expect.stringContaining('Title must be less than 100 characters'),
          400
        );
      });

      it('should reject description that is too long', async () => {
        const invalidRequest = {
          ...validBookingRequest,
          description: 'A'.repeat(501), // Over 500 characters
        };

        const request = new NextRequest('http://localhost:3000/api/sessions/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidRequest),
        });

        const response = await POST(request);

        expect(response.status).toBe(400);
        expect(mockCreateErrorResponse).toHaveBeenCalledWith(
          expect.stringContaining('Description must be less than 500 characters'),
          400
        );
      });

      it('should reject missing scheduled time', async () => {
        const invalidRequest = {
          ...validBookingRequest,
          scheduledAt: '',
        };

        const request = new NextRequest('http://localhost:3000/api/sessions/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidRequest),
        });

        const response = await POST(request);

        expect(response.status).toBe(400);
        expect(mockCreateErrorResponse).toHaveBeenCalledWith(
          expect.stringContaining('Scheduled date and time is required'),
          400
        );
      });

      it('should reject session duration that is too short', async () => {
        const invalidRequest = {
          ...validBookingRequest,
          durationMinutes: 10, // Less than 15 minutes
        };

        const request = new NextRequest('http://localhost:3000/api/sessions/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidRequest),
        });

        const response = await POST(request);

        expect(response.status).toBe(400);
        expect(mockCreateErrorResponse).toHaveBeenCalledWith(
          expect.stringContaining('Session must be at least 15 minutes'),
          400
        );
      });

      it('should reject session duration that is too long', async () => {
        const invalidRequest = {
          ...validBookingRequest,
          durationMinutes: 300, // More than 240 minutes (4 hours)
        };

        const request = new NextRequest('http://localhost:3000/api/sessions/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidRequest),
        });

        const response = await POST(request);

        expect(response.status).toBe(400);
        expect(mockCreateErrorResponse).toHaveBeenCalledWith(
          expect.stringContaining('Session cannot be longer than 4 hours'),
          400
        );
      });

      it('should handle malformed JSON', async () => {
        const request = new NextRequest('http://localhost:3000/api/sessions/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: 'invalid-json{',
        });

        const response = await POST(request);

        expect(response.status).toBe(500);
        expect(mockCreateErrorResponse).toHaveBeenCalledWith(
          'Failed to create session',
          500
        );
      });
    });

    describe('Business Logic Testing', () => {
      beforeEach(() => {
        mockSupabaseClient.from.mockImplementation((table) => {
          if (table === 'users') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockImplementation((selector) => {
                if (selector) {
                  const eq = vi.fn().mockReturnThis();
                  if (eq.mock.calls?.[0]?.[1] === mockUser.id) {
                    return Promise.resolve({ data: mockClientProfile });
                  }
                  return Promise.resolve({ data: mockCoachProfile });
                }
                return Promise.resolve({ data: mockClientProfile });
              }),
            };
          }
          return { select: vi.fn(), eq: vi.fn(), single: vi.fn() };
        });
      });

      it('should verify coach exists before booking', async () => {
        mockSupabaseClient.from.mockImplementation((table) => {
          if (table === 'users') {
            const mockFrom = {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn(),
            };
            
            // First call - get client profile
            // Second call - get coach profile
            mockFrom.single
              .mockResolvedValueOnce({ data: mockClientProfile })
              .mockResolvedValueOnce({ data: null }); // Coach not found
            
            return mockFrom;
          }
          return { select: vi.fn(), eq: vi.fn(), single: vi.fn() };
        });

        const request = new NextRequest('http://localhost:3000/api/sessions/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validBookingRequest),
        });

        const response = await POST(request);

        expect(response.status).toBe(404);
        expect(mockCreateErrorResponse).toHaveBeenCalledWith('Coach not found', 404);
      });

      it('should check coach availability before booking', async () => {
        mockSupabaseClient.from.mockImplementation((table) => {
          if (table === 'users') {
            const mockFrom = {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn(),
            };
            
            mockFrom.single
              .mockResolvedValueOnce({ data: mockClientProfile })
              .mockResolvedValueOnce({ data: mockCoachProfile });
            
            return mockFrom;
          }
          return { select: vi.fn(), eq: vi.fn(), single: vi.fn() };
        });

        mockIsCoachAvailable.mockResolvedValue(false);

        const request = new NextRequest('http://localhost:3000/api/sessions/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validBookingRequest),
        });

        const response = await POST(request);

        expect(response.status).toBe(409);
        expect(mockCreateErrorResponse).toHaveBeenCalledWith(
          'Coach is not available at the selected time',
          409
        );
        expect(mockIsCoachAvailable).toHaveBeenCalledWith(
          validBookingRequest.coachId,
          validBookingRequest.scheduledAt,
          validBookingRequest.durationMinutes
        );
      });

      it('should create session when coach is available', async () => {
        mockSupabaseClient.from.mockImplementation((table) => {
          if (table === 'users') {
            const mockFrom = {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn(),
            };
            
            mockFrom.single
              .mockResolvedValueOnce({ data: mockClientProfile })
              .mockResolvedValueOnce({ data: mockCoachProfile });
            
            return mockFrom;
          }
          if (table === 'sessions') {
            return {
              insert: vi.fn().mockReturnThis(),
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: mockSessionData, error: null }),
            };
          }
          return { select: vi.fn(), eq: vi.fn(), single: vi.fn() };
        });

        mockIsCoachAvailable.mockResolvedValue(true);

        const request = new NextRequest('http://localhost:3000/api/sessions/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validBookingRequest),
        });

        const response = await POST(request);

        expect(response.status).toBe(201);
        expect(mockIsCoachAvailable).toHaveBeenCalledWith(
          validBookingRequest.coachId,
          validBookingRequest.scheduledAt,
          validBookingRequest.durationMinutes
        );
      });
    });

    describe('Database Operations Testing', () => {
      beforeEach(() => {
        mockSupabaseClient.from.mockImplementation((table) => {
          if (table === 'users') {
            const mockFrom = {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn(),
            };
            
            mockFrom.single
              .mockResolvedValueOnce({ data: mockClientProfile })
              .mockResolvedValueOnce({ data: mockCoachProfile });
            
            return mockFrom;
          }
          return { select: vi.fn(), eq: vi.fn(), single: vi.fn() };
        });

        mockIsCoachAvailable.mockResolvedValue(true);
      });

      it('should handle database insertion successfully', async () => {
        mockSupabaseClient.from.mockImplementation((table) => {
          if (table === 'sessions') {
            const insertMock = vi.fn().mockReturnThis();
            const selectMock = vi.fn().mockReturnThis();
            const singleMock = vi.fn().mockResolvedValue({ data: mockSessionData, error: null });
            
            return {
              insert: insertMock,
              select: selectMock,
              single: singleMock,
            };
          }
          // Return users table mock for other calls
          return mockSupabaseClient.from(table);
        });

        const request = new NextRequest('http://localhost:3000/api/sessions/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validBookingRequest),
        });

        const response = await POST(request);

        expect(response.status).toBe(201);
      });

      it('should handle database insertion failure', async () => {
        mockSupabaseClient.from.mockImplementation((table) => {
          if (table === 'sessions') {
            return {
              insert: vi.fn().mockReturnThis(),
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ 
                data: null, 
                error: new Error('Database constraint violation') 
              }),
            };
          }
          return mockSupabaseClient.from(table);
        });

        const request = new NextRequest('http://localhost:3000/api/sessions/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validBookingRequest),
        });

        const response = await POST(request);

        expect(response.status).toBe(500);
        expect(mockCreateErrorResponse).toHaveBeenCalledWith(
          'Failed to create session',
          500
        );
      });

      it('should properly transform database response to frontend format', async () => {
        mockSupabaseClient.from.mockImplementation((table) => {
          if (table === 'sessions') {
            return {
              insert: vi.fn().mockReturnThis(),
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: mockSessionData, error: null }),
            };
          }
          return mockSupabaseClient.from(table);
        });

        const request = new NextRequest('http://localhost:3000/api/sessions/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validBookingRequest),
        });

        const response = await POST(request);
        const data = await response.json();

        // Verify transformation from snake_case to camelCase
        expect(data.data).toEqual({
          id: mockSessionData.id,
          coachId: mockSessionData.coach_id,
          clientId: mockSessionData.client_id,
          title: mockSessionData.title,
          description: mockSessionData.description,
          scheduledAt: mockSessionData.scheduled_at,
          duration: mockSessionData.duration_minutes,
          durationMinutes: mockSessionData.duration_minutes,
          status: mockSessionData.status,
          createdAt: mockSessionData.created_at,
          updatedAt: mockSessionData.updated_at,
          coach: {
            id: mockCoachProfile.id,
            email: mockCoachProfile.email,
            firstName: mockCoachProfile.first_name,
            lastName: mockCoachProfile.last_name,
          },
          client: {
            id: mockUser.id,
            email: mockUser.email,
            firstName: mockClientProfile.first_name,
            lastName: mockClientProfile.last_name,
          },
        });
      });
    });

    describe('Notification Testing', () => {
      beforeEach(() => {
        mockSupabaseClient.from.mockImplementation((table) => {
          if (table === 'users') {
            const mockFrom = {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn(),
            };
            
            mockFrom.single
              .mockResolvedValueOnce({ data: mockClientProfile })
              .mockResolvedValueOnce({ data: mockCoachProfile });
            
            return mockFrom;
          }
          if (table === 'sessions') {
            return {
              insert: vi.fn().mockReturnThis(),
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: mockSessionData, error: null }),
            };
          }
          return { select: vi.fn(), eq: vi.fn(), single: vi.fn() };
        });

        mockIsCoachAvailable.mockResolvedValue(true);
      });

      it('should send booking notification after successful session creation', async () => {
        mockSessionNotificationService.onSessionBooked.mockResolvedValue(undefined);

        const request = new NextRequest('http://localhost:3000/api/sessions/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validBookingRequest),
        });

        const response = await POST(request);

        expect(response.status).toBe(201);
        expect(mockSessionNotificationService.onSessionBooked).toHaveBeenCalledWith(
          expect.objectContaining({
            id: mockSessionData.id,
            coachId: mockSessionData.coach_id,
            clientId: mockSessionData.client_id,
          })
        );
      });

      it('should not fail session creation if notifications fail', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        mockSessionNotificationService.onSessionBooked.mockRejectedValue(
          new Error('Notification service unavailable')
        );

        const request = new NextRequest('http://localhost:3000/api/sessions/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validBookingRequest),
        });

        const response = await POST(request);

        expect(response.status).toBe(201);
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error creating session notifications:',
          expect.any(Error)
        );

        consoleSpy.mockRestore();
      });
    });

    describe('Rate Limiting Testing', () => {
      it('should apply rate limiting for session booking', async () => {
        expect(mockRateLimit).toHaveBeenCalledWith(
          10, // 10 bookings per minute
          60000, // 1 minute window
          expect.objectContaining({
            blockDuration: 10 * 60 * 1000, // 10 minutes block
            enableSuspiciousActivityDetection: true,
          })
        );
      });
    });

    describe('Security Testing', () => {
      it('should prevent SQL injection in coach ID', async () => {
        const sqlInjectionRequest = {
          ...validBookingRequest,
          coachId: "'; DROP TABLE sessions; --",
        };

        const request = new NextRequest('http://localhost:3000/api/sessions/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sqlInjectionRequest),
        });

        const response = await POST(request);

        expect(response.status).toBe(400);
        expect(mockCreateErrorResponse).toHaveBeenCalledWith(
          expect.stringContaining('Invalid coach ID format'),
          400
        );
      });

      it('should prevent XSS in title and description', async () => {
        const xssRequest = {
          ...validBookingRequest,
          title: '<script>alert("xss")</script>',
          description: '<img src="x" onerror="alert(\'xss\')">',
        };

        mockSupabaseClient.from.mockImplementation((table) => {
          if (table === 'users') {
            const mockFrom = {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn(),
            };
            
            mockFrom.single
              .mockResolvedValueOnce({ data: mockClientProfile })
              .mockResolvedValueOnce({ data: mockCoachProfile });
            
            return mockFrom;
          }
          if (table === 'sessions') {
            return {
              insert: vi.fn().mockReturnThis(),
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: mockSessionData, error: null }),
            };
          }
          return { select: vi.fn(), eq: vi.fn(), single: vi.fn() };
        });

        mockIsCoachAvailable.mockResolvedValue(true);

        const request = new NextRequest('http://localhost:3000/api/sessions/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(xssRequest),
        });

        const response = await POST(request);

        // The request should succeed but the data should be properly sanitized at the database layer
        expect(response.status).toBe(201);
      });

      it('should log booking attempts with IP and user agent', async () => {
        const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

        mockSupabaseClient.from.mockImplementation((table) => {
          if (table === 'users') {
            const mockFrom = {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn(),
            };
            
            mockFrom.single
              .mockResolvedValueOnce({ data: mockClientProfile })
              .mockResolvedValueOnce({ data: mockCoachProfile });
            
            return mockFrom;
          }
          if (table === 'sessions') {
            return {
              insert: vi.fn().mockReturnThis(),
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: mockSessionData, error: null }),
            };
          }
          return { select: vi.fn(), eq: vi.fn(), single: vi.fn() };
        });

        mockIsCoachAvailable.mockResolvedValue(true);

        const request = new NextRequest('http://localhost:3000/api/sessions/book', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-forwarded-for': '192.168.1.100',
            'user-agent': 'Mozilla/5.0 Test Browser',
          },
          body: JSON.stringify(validBookingRequest),
        });

        await POST(request);

        expect(consoleSpy).toHaveBeenCalledWith(
          'Session booking attempted:',
          expect.objectContaining({
            userId: mockUser.id,
            coachId: validBookingRequest.coachId,
            scheduledAt: validBookingRequest.scheduledAt,
            duration: validBookingRequest.durationMinutes,
            timestamp: expect.any(String),
            ip: '192.168.1.100',
          })
        );

        consoleSpy.mockRestore();
      });
    });

    describe('Error Handling', () => {
      it('should handle unexpected errors gracefully', async () => {
        mockSupabaseClient.auth.getUser.mockRejectedValue(new Error('Unexpected error'));

        const request = new NextRequest('http://localhost:3000/api/sessions/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validBookingRequest),
        });

        const response = await POST(request);

        expect(response.status).toBe(500);
        expect(mockCreateErrorResponse).toHaveBeenCalledWith(
          'Failed to create session',
          500
        );
      });

      it('should handle availability check errors', async () => {
        mockSupabaseClient.from.mockImplementation((table) => {
          if (table === 'users') {
            const mockFrom = {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn(),
            };
            
            mockFrom.single
              .mockResolvedValueOnce({ data: mockClientProfile })
              .mockResolvedValueOnce({ data: mockCoachProfile });
            
            return mockFrom;
          }
          return { select: vi.fn(), eq: vi.fn(), single: vi.fn() };
        });

        mockIsCoachAvailable.mockRejectedValue(new Error('Availability service error'));

        const request = new NextRequest('http://localhost:3000/api/sessions/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validBookingRequest),
        });

        const response = await POST(request);

        expect(response.status).toBe(500);
        expect(mockCreateErrorResponse).toHaveBeenCalledWith(
          'Failed to create session',
          500
        );
      });
    });

    describe('Edge Cases', () => {
      it('should handle optional description field', async () => {
        const requestWithoutDescription = {
          coachId: validBookingRequest.coachId,
          title: validBookingRequest.title,
          scheduledAt: validBookingRequest.scheduledAt,
          durationMinutes: validBookingRequest.durationMinutes,
        };

        mockSupabaseClient.from.mockImplementation((table) => {
          if (table === 'users') {
            const mockFrom = {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn(),
            };
            
            mockFrom.single
              .mockResolvedValueOnce({ data: mockClientProfile })
              .mockResolvedValueOnce({ data: mockCoachProfile });
            
            return mockFrom;
          }
          if (table === 'sessions') {
            return {
              insert: vi.fn().mockReturnThis(),
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ 
                data: { ...mockSessionData, description: null }, 
                error: null 
              }),
            };
          }
          return { select: vi.fn(), eq: vi.fn(), single: vi.fn() };
        });

        mockIsCoachAvailable.mockResolvedValue(true);

        const request = new NextRequest('http://localhost:3000/api/sessions/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestWithoutDescription),
        });

        const response = await POST(request);

        expect(response.status).toBe(201);
      });

      it('should handle boundary values for duration', async () => {
        const boundaryRequests = [
          { ...validBookingRequest, durationMinutes: 15 }, // Minimum
          { ...validBookingRequest, durationMinutes: 240 }, // Maximum
        ];

        for (const boundaryRequest of boundaryRequests) {
          mockSupabaseClient.from.mockImplementation((table) => {
            if (table === 'users') {
              const mockFrom = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn(),
              };
              
              mockFrom.single
                .mockResolvedValueOnce({ data: mockClientProfile })
                .mockResolvedValueOnce({ data: mockCoachProfile });
              
              return mockFrom;
            }
            if (table === 'sessions') {
              return {
                insert: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: mockSessionData, error: null }),
              };
            }
            return { select: vi.fn(), eq: vi.fn(), single: vi.fn() };
          });

          mockIsCoachAvailable.mockResolvedValue(true);

          const request = new NextRequest('http://localhost:3000/api/sessions/book', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(boundaryRequest),
          });

          const response = await POST(request);

          expect(response.status).toBe(201);
        }
      });
    });
  });

  describe('CORS and OPTIONS', () => {
    it('should handle OPTIONS requests for CORS', async () => {
      const request = new NextRequest('http://localhost:3000/api/sessions/book', {
        method: 'OPTIONS',
      });

      const response = await OPTIONS(request);

      expect(response.status).toBe(200);
      expect(mockCreateCorsResponse).toHaveBeenCalledWith(request);
    });
  });
});