/**
 * Comprehensive test suite for /api/admin/system-health
 * Priority 2 - Core Business Logic API (Admin)
 * 
 * Tests: Admin Authentication, System Monitoring, Service Health Checks, Performance
 */

import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { GET, POST, PUT, DELETE } from '@/app/api/admin/system-health/route';

// Mock all dependencies
vi.mock('@/lib/services/auth-service', () => ({
  authService: {
    getSession: vi.fn(),
  },
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() => mockSupabaseClient),
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
  },
}));

vi.mock('@/lib/security/rate-limit', () => ({
  rateLimit: vi.fn((limit, window, options) => (handler: any) => handler),
}));

// Mock Node.js process methods
const mockProcess = {
  memoryUsage: vi.fn(),
  uptime: vi.fn(),
  hrtime: vi.fn(),
  cpuUsage: vi.fn(),
};

// Override global process methods
Object.defineProperty(global, 'process', {
  value: {
    ...process,
    memoryUsage: mockProcess.memoryUsage,
    uptime: mockProcess.uptime,
    hrtime: mockProcess.hrtime,
    cpuUsage: mockProcess.cpuUsage,
  },
});

// Import mocked functions
import { ApiResponseHelper } from '@/lib/api/types';
import { rateLimit } from '@/lib/security/rate-limit';
import { authService } from '@/lib/services/auth-service';
import { createServerClient } from '@/lib/supabase/server';
import { mockUser, mockAdminUser, mockCoachUser, mockSupabaseClient } from '@/test/utils';

const mockAuthService = vi.mocked(authService);
const mockCreateServerClient = vi.mocked(createServerClient);
const mockApiResponseHelper = vi.mocked(ApiResponseHelper);
const mockRateLimit = vi.mocked(rateLimit);

describe('/api/admin/system-health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock implementations
    mockCreateServerClient.mockReturnValue(mockSupabaseClient);
    mockRateLimit.mockImplementation((limit, window, options) => (handler) => handler);
    
    // Setup default process mocks
    mockProcess.memoryUsage.mockReturnValue({
      rss: 67108864,
      heapTotal: 33554432,
      heapUsed: 16777216, // ~16MB
      external: 1048576,
      arrayBuffers: 0,
    });
    mockProcess.uptime.mockReturnValue(3600); // 1 hour in seconds
    mockProcess.hrtime.mockReturnValue([1, 234567890]);
    mockProcess.cpuUsage.mockReturnValue({
      user: 50000,
      system: 30000,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/admin/system-health', () => {
    describe('Authentication and Authorization Testing', () => {
      it('should allow admin access to system health', async () => {
        mockAuthService.getSession.mockResolvedValue({
          user: mockAdminUser,
        });

        // Setup successful database query
        mockSupabaseClient.from.mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
        });

        // Setup storage mock
        mockSupabaseClient.storage = {
          from: vi.fn().mockReturnValue({
            list: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };

        const request = new NextRequest('http://localhost:3000/api/admin/system-health');

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data).toHaveProperty('database');
        expect(data.data).toHaveProperty('server');
        expect(data.data).toHaveProperty('cache');
        expect(data.data).toHaveProperty('services');
        expect(data.data).toHaveProperty('lastChecked');
      });

      it('should reject non-admin users', async () => {
        mockAuthService.getSession.mockResolvedValue({
          user: mockUser, // client user
        });

        const request = new NextRequest('http://localhost:3000/api/admin/system-health');

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Admin access required');
        expect(mockApiResponseHelper.forbidden).toHaveBeenCalledWith('Admin access required');
      });

      it('should reject coach users', async () => {
        mockAuthService.getSession.mockResolvedValue({
          user: mockCoachUser,
        });

        const request = new NextRequest('http://localhost:3000/api/admin/system-health');

        const response = await GET(request);

        expect(response.status).toBe(403);
        expect(mockApiResponseHelper.forbidden).toHaveBeenCalledWith('Admin access required');
      });

      it('should reject unauthenticated requests', async () => {
        mockAuthService.getSession.mockResolvedValue(null);

        const request = new NextRequest('http://localhost:3000/api/admin/system-health');

        const response = await GET(request);

        expect(response.status).toBe(403);
        expect(mockApiResponseHelper.forbidden).toHaveBeenCalledWith('Admin access required');
      });

      it('should reject requests with null user', async () => {
        mockAuthService.getSession.mockResolvedValue(null);

        const request = new NextRequest('http://localhost:3000/api/admin/system-health');

        const response = await GET(request);

        expect(response.status).toBe(403);
      });
    });

    describe('Database Health Check Testing', () => {
      beforeEach(() => {
        mockAuthService.getSession.mockResolvedValue({
          user: mockAdminUser,
        });

        // Setup default storage mock
        mockSupabaseClient.storage = {
          from: vi.fn().mockReturnValue({
            list: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      });

      it('should report healthy database status with fast response', async () => {
        mockSupabaseClient.from.mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
        });

        const request = new NextRequest('http://localhost:3000/api/admin/system-health');

        const response = await GET(request);
        const data = await response.json();

        expect(data.data.database.status).toBe('healthy');
        expect(data.data.database.responseTime).toBeLessThan(1000);
        expect(data.data.database.connections).toBeGreaterThan(0);
        expect(data.data.database.maxConnections).toBe(100);
      });

      it('should report warning status with slow database response', async () => {
        // Mock slow database response
        vi.useFakeTimers();
        
        mockSupabaseClient.from.mockReturnValue({
          select: vi.fn().mockImplementation(() => {
            return new Promise((resolve) => {
              setTimeout(() => {
                resolve({ data: [], error: null });
              }, 1500); // 1.5 second delay
            });
          }),
        });

        const request = new NextRequest('http://localhost:3000/api/admin/system-health');

        const responsePromise = GET(request);
        
        // Fast-forward time to simulate slow database
        vi.advanceTimersByTime(1500);
        
        const response = await responsePromise;
        const data = await response.json();

        expect(data.data.database.status).toBe('warning');
        expect(data.data.database.responseTime).toBeGreaterThanOrEqual(1000);

        vi.useRealTimers();
      });

      it('should report error status when database query fails', async () => {
        mockSupabaseClient.from.mockReturnValue({
          select: vi.fn().mockResolvedValue({ 
            data: null, 
            error: new Error('Database connection failed') 
          }),
        });

        const request = new NextRequest('http://localhost:3000/api/admin/system-health');

        const response = await GET(request);
        const data = await response.json();

        expect(data.data.database.status).toBe('error');
        expect(data.data.database.connections).toBe(0);
      });

      it('should handle database query exceptions', async () => {
        mockSupabaseClient.from.mockReturnValue({
          select: vi.fn().mockRejectedValue(new Error('Connection timeout')),
        });

        const request = new NextRequest('http://localhost:3000/api/admin/system-health');

        const response = await GET(request);
        const data = await response.json();

        expect(data.data.database.status).toBe('error');
        expect(data.data.database.connections).toBe(0);
      });
    });

    describe('Server Health Check Testing', () => {
      beforeEach(() => {
        mockAuthService.getSession.mockResolvedValue({
          user: mockAdminUser,
        });

        // Setup database and storage mocks
        mockSupabaseClient.from.mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
        });

        mockSupabaseClient.storage = {
          from: vi.fn().mockReturnValue({
            list: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      });

      it('should report healthy server status with normal resources', async () => {
        mockProcess.memoryUsage.mockReturnValue({
          rss: 134217728,
          heapTotal: 67108864,
          heapUsed: 33554432, // ~32MB (low usage)
          external: 2097152,
          arrayBuffers: 0,
        });
        mockProcess.uptime.mockReturnValue(7200); // 2 hours

        const request = new NextRequest('http://localhost:3000/api/admin/system-health');

        const response = await GET(request);
        const data = await response.json();

        expect(data.data.server.status).toBe('healthy');
        expect(data.data.server.uptime).toBe(7200000); // In milliseconds
        expect(data.data.server.memoryUsage).toBeLessThan(80); // Less than 80%
        expect(data.data.server.cpuUsage).toBeGreaterThanOrEqual(0);
        expect(data.data.server.cpuUsage).toBeLessThanOrEqual(100);
      });

      it('should report warning status with high memory usage', async () => {
        mockProcess.memoryUsage.mockReturnValue({
          rss: 536870912,
          heapTotal: 268435456,
          heapUsed: 419430400, // ~400MB (high usage for 512MB container)
          external: 8388608,
          arrayBuffers: 0,
        });

        const request = new NextRequest('http://localhost:3000/api/admin/system-health');

        const response = await GET(request);
        const data = await response.json();

        expect(data.data.server.status).toBe('warning');
        expect(data.data.server.memoryUsage).toBeGreaterThan(80);
      });

      it('should measure CPU usage correctly', async () => {
        // Setup CPU usage measurement mocks
        mockProcess.hrtime
          .mockReturnValueOnce([0, 0]) // Start time
          .mockReturnValueOnce([0, 100000000]); // End time (100ms later)

        mockProcess.cpuUsage
          .mockReturnValueOnce({ user: 0, system: 0 }) // Start usage
          .mockReturnValueOnce({ user: 80000, system: 20000 }); // End usage

        const request = new NextRequest('http://localhost:3000/api/admin/system-health');

        const response = await GET(request);
        const data = await response.json();

        expect(data.data.server.cpuUsage).toBeGreaterThan(0);
        expect(data.data.server.cpuUsage).toBeLessThanOrEqual(100);
      });
    });

    describe('Cache Health Check Testing', () => {
      beforeEach(() => {
        mockAuthService.getSession.mockResolvedValue({
          user: mockAdminUser,
        });

        // Setup database and storage mocks
        mockSupabaseClient.from.mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
        });

        mockSupabaseClient.storage = {
          from: vi.fn().mockReturnValue({
            list: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      });

      it('should report healthy cache status', async () => {
        const request = new NextRequest('http://localhost:3000/api/admin/system-health');

        const response = await GET(request);
        const data = await response.json();

        expect(data.data.cache.status).toBe('healthy');
        expect(data.data.cache.hitRate).toBeGreaterThanOrEqual(85);
        expect(data.data.cache.hitRate).toBeLessThanOrEqual(100);
        expect(data.data.cache.memoryUsed).toBeGreaterThanOrEqual(50);
        expect(data.data.cache.memoryUsed).toBeLessThanOrEqual(150);
      });

      it('should handle cache check failures', async () => {
        // Mock Math.random to always cause slow cache response
        const originalRandom = Math.random;
        Math.random = vi.fn().mockReturnValue(0.9); // This would cause > 50ms delay

        // Use fake timers to control the delay
        vi.useFakeTimers();

        const request = new NextRequest('http://localhost:3000/api/admin/system-health');
        const responsePromise = GET(request);

        // Advance time to simulate slow cache
        vi.advanceTimersByTime(100);

        const response = await responsePromise;
        const data = await response.json();

        expect(data.data.cache.status).toBe('warning');

        Math.random = originalRandom;
        vi.useRealTimers();
      });
    });

    describe('Services Health Check Testing', () => {
      beforeEach(() => {
        mockAuthService.getSession.mockResolvedValue({
          user: mockAdminUser,
        });
      });

      it('should report healthy services when all are working', async () => {
        // Setup all services as healthy
        mockSupabaseClient.from.mockImplementation((table: any) => {
          return {
            select: vi.fn().mockResolvedValue({ data: [], error: null }),
            limit: vi.fn().mockReturnThis(),
          };
        });

        mockSupabaseClient.storage = {
          from: vi.fn().mockReturnValue({
            list: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };

        const request = new NextRequest('http://localhost:3000/api/admin/system-health');

        const response = await GET(request);
        const data = await response.json();

        expect(data.data.services.analytics).toBe('healthy');
        expect(data.data.services.notifications).toBe('healthy');
        expect(data.data.services.fileStorage).toBe('healthy');
      });

      it('should report analytics service error when sessions table fails', async () => {
        mockSupabaseClient.from.mockImplementation((table: any) => {
          if (table === 'sessions') {
            return {
              select: vi.fn().mockResolvedValue({ 
                data: null, 
                error: new Error('Sessions table error') 
              }),
              limit: vi.fn().mockReturnThis(),
            };
          }
          return {
            select: vi.fn().mockResolvedValue({ data: [], error: null }),
            limit: vi.fn().mockReturnThis(),
          };
        });

        mockSupabaseClient.storage = {
          from: vi.fn().mockReturnValue({
            list: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };

        const request = new NextRequest('http://localhost:3000/api/admin/system-health');

        const response = await GET(request);
        const data = await response.json();

        expect(data.data.services.analytics).toBe('error');
        expect(data.data.services.notifications).toBe('healthy');
        expect(data.data.services.fileStorage).toBe('healthy');
      });

      it('should report notifications service error when notifications table fails', async () => {
        mockSupabaseClient.from.mockImplementation((table: any) => {
          if (table === 'notifications') {
            return {
              select: vi.fn().mockResolvedValue({ 
                data: null, 
                error: new Error('Notifications table error') 
              }),
              limit: vi.fn().mockReturnThis(),
            };
          }
          return {
            select: vi.fn().mockResolvedValue({ data: [], error: null }),
            limit: vi.fn().mockReturnThis(),
          };
        });

        mockSupabaseClient.storage = {
          from: vi.fn().mockReturnValue({
            list: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };

        const request = new NextRequest('http://localhost:3000/api/admin/system-health');

        const response = await GET(request);
        const data = await response.json();

        expect(data.data.services.analytics).toBe('healthy');
        expect(data.data.services.notifications).toBe('error');
        expect(data.data.services.fileStorage).toBe('healthy');
      });

      it('should report file storage warning when storage is not configured', async () => {
        mockSupabaseClient.from.mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
          limit: vi.fn().mockReturnThis(),
        });

        mockSupabaseClient.storage = {
          from: vi.fn().mockReturnValue({
            list: vi.fn().mockResolvedValue({ 
              data: null, 
              error: { message: 'Bucket not found' } 
            }),
          }),
        };

        const request = new NextRequest('http://localhost:3000/api/admin/system-health');

        const response = await GET(request);
        const data = await response.json();

        expect(data.data.services.fileStorage).toBe('warning');
      });

      it('should handle service check exceptions gracefully', async () => {
        mockSupabaseClient.from.mockImplementation((table: any) => {
          if (table === 'sessions') {
            throw new Error('Database connection lost');
          }
          return {
            select: vi.fn().mockResolvedValue({ data: [], error: null }),
            limit: vi.fn().mockReturnThis(),
          };
        });

        mockSupabaseClient.storage = {
          from: vi.fn().mockReturnValue({
            list: vi.fn().mockRejectedValue(new Error('Storage service down')),
          }),
        };

        const request = new NextRequest('http://localhost:3000/api/admin/system-health');

        const response = await GET(request);
        const data = await response.json();

        expect(data.data.services.analytics).toBe('error');
        expect(data.data.services.fileStorage).toBe('warning');
      });
    });

    describe('Rate Limiting Testing', () => {
      it('should apply appropriate rate limiting for admin health checks', async () => {
        expect(mockRateLimit).toHaveBeenCalledWith(
          30, // 30 requests per minute
          60000, // 1 minute window
          expect.objectContaining({
            keyExtractor: expect.any(Function),
          })
        );
      });

      it('should use IP-based rate limiting key', async () => {
        const rateLimitCall = mockRateLimit.mock.calls[0];
        const options = rateLimitCall?.[2];

        expect(options?.keyExtractor).toBeDefined();

        // Test the keyExtractor function
        const mockRequest = {
          headers: {
            get: vi.fn().mockReturnValue('192.168.1.100')
          },
        } as any;

        const key = options?.keyExtractor?.(mockRequest);
        expect(key).toBe('admin-health:192.168.1.100');
      });

      it('should handle missing IP in rate limiting', async () => {
        const rateLimitCall = mockRateLimit.mock.calls[0];
        const options = rateLimitCall?.[2];

        const mockRequest = {
          headers: {
            get: vi.fn().mockReturnValue(null)
          },
        } as any;

        const key = options?.keyExtractor?.(mockRequest);
        expect(key).toBe('admin-health:unknown');
      });
    });

    describe('Response Format Testing', () => {
      beforeEach(() => {
        mockAuthService.getSession.mockResolvedValue({
          user: mockAdminUser,
        });

        // Setup all services as healthy
        mockSupabaseClient.from.mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
          limit: vi.fn().mockReturnThis(),
        });

        mockSupabaseClient.storage = {
          from: vi.fn().mockReturnValue({
            list: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      });

      it('should return complete system health data structure', async () => {
        const request = new NextRequest('http://localhost:3000/api/admin/system-health');

        const response = await GET(request);
        const data = await response.json();

        expect(data.data).toHaveProperty('database');
        expect(data.data.database).toHaveProperty('status');
        expect(data.data.database).toHaveProperty('connections');
        expect(data.data.database).toHaveProperty('maxConnections');
        expect(data.data.database).toHaveProperty('responseTime');

        expect(data.data).toHaveProperty('server');
        expect(data.data.server).toHaveProperty('status');
        expect(data.data.server).toHaveProperty('uptime');
        expect(data.data.server).toHaveProperty('memoryUsage');
        expect(data.data.server).toHaveProperty('cpuUsage');

        expect(data.data).toHaveProperty('cache');
        expect(data.data.cache).toHaveProperty('status');
        expect(data.data.cache).toHaveProperty('hitRate');
        expect(data.data.cache).toHaveProperty('memoryUsed');

        expect(data.data).toHaveProperty('services');
        expect(data.data.services).toHaveProperty('analytics');
        expect(data.data.services).toHaveProperty('notifications');
        expect(data.data.services).toHaveProperty('fileStorage');

        expect(data.data).toHaveProperty('lastChecked');
        expect(data.data.lastChecked).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      });

      it('should return numeric values within expected ranges', async () => {
        const request = new NextRequest('http://localhost:3000/api/admin/system-health');

        const response = await GET(request);
        const data = await response.json();

        // Database
        expect(data.data.database.connections).toBeGreaterThanOrEqual(0);
        expect(data.data.database.maxConnections).toBe(100);
        expect(data.data.database.responseTime).toBeGreaterThanOrEqual(0);

        // Server
        expect(data.data.server.uptime).toBeGreaterThan(0);
        expect(data.data.server.memoryUsage).toBeGreaterThanOrEqual(0);
        expect(data.data.server.memoryUsage).toBeLessThanOrEqual(100);
        expect(data.data.server.cpuUsage).toBeGreaterThanOrEqual(0);
        expect(data.data.server.cpuUsage).toBeLessThanOrEqual(100);

        // Cache
        expect(data.data.cache.hitRate).toBeGreaterThanOrEqual(0);
        expect(data.data.cache.hitRate).toBeLessThanOrEqual(100);
        expect(data.data.cache.memoryUsed).toBeGreaterThan(0);
      });
    });

    describe('Error Handling', () => {
      beforeEach(() => {
        mockAuthService.getSession.mockResolvedValue({
          user: mockAdminUser,
        });
      });

      it('should handle authentication service errors', async () => {
        mockAuthService.getSession.mockRejectedValue(new Error('Auth service unavailable'));

        const request = new NextRequest('http://localhost:3000/api/admin/system-health');

        const response = await GET(request);

        expect(response.status).toBe(500);
        expect(mockApiResponseHelper.internalError).toHaveBeenCalledWith(
          'Failed to check system health'
        );
      });

      it('should handle Supabase client creation errors', async () => {
        mockCreateServerClient.mockImplementation(() => {
          throw new Error('Supabase client creation failed');
        });

        const request = new NextRequest('http://localhost:3000/api/admin/system-health');

        const response = await GET(request);

        expect(response.status).toBe(500);
        expect(mockApiResponseHelper.internalError).toHaveBeenCalledWith(
          'Failed to check system health'
        );
      });

      it('should log errors properly', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        
        mockSupabaseClient.from.mockImplementation(() => {
          throw new Error('Unexpected database error');
        });

        const request = new NextRequest('http://localhost:3000/api/admin/system-health');

        await GET(request);

        expect(consoleSpy).toHaveBeenCalledWith(
          'System health check error:',
          expect.any(Error)
        );

        consoleSpy.mockRestore();
      });

      it('should handle process measurement errors gracefully', async () => {
        mockProcess.memoryUsage.mockImplementation(() => {
          throw new Error('Cannot read memory usage');
        });

        const request = new NextRequest('http://localhost:3000/api/admin/system-health');

        const response = await GET(request);

        expect(response.status).toBe(500);
        expect(mockApiResponseHelper.internalError).toHaveBeenCalledWith(
          'Failed to check system health'
        );
      });
    });

    describe('Performance Testing', () => {
      beforeEach(() => {
        mockAuthService.getSession.mockResolvedValue({
          user: mockAdminUser,
        });
      });

      it('should complete health check within reasonable time', async () => {
        mockSupabaseClient.from.mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
          limit: vi.fn().mockReturnThis(),
        });

        mockSupabaseClient.storage = {
          from: vi.fn().mockReturnValue({
            list: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };

        const request = new NextRequest('http://localhost:3000/api/admin/system-health');

        const startTime = Date.now();
        const response = await GET(request);
        const endTime = Date.now();

        expect(response.status).toBe(200);
        
        // Should complete in under 2 seconds (including CPU measurement)
        expect(endTime - startTime).toBeLessThan(2000);
      });

      it('should handle concurrent health checks efficiently', async () => {
        mockSupabaseClient.from.mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
          limit: vi.fn().mockReturnThis(),
        });

        mockSupabaseClient.storage = {
          from: vi.fn().mockReturnValue({
            list: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };

        const request = new NextRequest('http://localhost:3000/api/admin/system-health');

        // Run multiple concurrent requests
        const promises = Array.from({ length: 5 }, () => GET(request));

        const startTime = Date.now();
        const responses = await Promise.all(promises);
        const endTime = Date.now();

        // All requests should succeed
        responses.forEach(response => {
          expect(response.status).toBe(200);
        });

        // Should handle concurrency efficiently (not much slower than single request)
        expect(endTime - startTime).toBeLessThan(5000);
      });
    });
  });

  describe('HTTP Method Security', () => {
    it('should return 405 for POST requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/system-health', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.error).toBe('Method not allowed');
    });

    it('should return 405 for PUT requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/system-health', {
        method: 'PUT',
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.error).toBe('Method not allowed');
    });

    it('should return 405 for DELETE requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/system-health', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.error).toBe('Method not allowed');
    });
  });

  describe('Integration Testing', () => {
    it('should perform complete system health assessment', async () => {
      mockAuthService.getSession.mockResolvedValue({
        user: mockAdminUser,
      });

      // Setup realistic system state
      mockSupabaseClient.from.mockImplementation((table: any) => {
        if (table === 'sessions') {
          return {
            select: vi.fn().mockResolvedValue({ data: [{ id: 'session1' }], error: null }),
            limit: vi.fn().mockReturnThis(),
          };
        }
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
          limit: vi.fn().mockReturnThis(),
        };
      });

      mockSupabaseClient.storage = {
        from: vi.fn().mockReturnValue({
          list: vi.fn().mockResolvedValue({ data: [{ name: 'file1' }], error: null }),
        }),
      };

      const request = new NextRequest('http://localhost:3000/api/admin/system-health');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify complete health assessment
      expect(['healthy', 'warning', 'error']).toContain(data.data.database.status);
      expect(['healthy', 'warning', 'error']).toContain(data.data.server.status);
      expect(['healthy', 'warning', 'error']).toContain(data.data.cache.status);
      expect(['healthy', 'warning', 'error']).toContain(data.data.services.analytics);
      expect(['healthy', 'warning', 'error']).toContain(data.data.services.notifications);
      expect(['healthy', 'warning', 'error']).toContain(data.data.services.fileStorage);

      // Verify timestamp is recent
      const lastChecked = new Date(data.data.lastChecked);
      const now = new Date();
      expect(now.getTime() - lastChecked.getTime()).toBeLessThan(5000); // Within 5 seconds
    });
  });
});