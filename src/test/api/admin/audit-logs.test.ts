/**
 * @fileoverview Tests for admin audit logs API endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/admin/audit-logs/route';

// Mock dependencies
vi.mock('@/lib/api/authenticated-request', () => ({
  getAuthenticatedUser: vi.fn(),
}));

vi.mock('@/lib/auth/mfa-telemetry', () => ({
  getMfaAuditLogs: vi.fn(),
}));

vi.mock('@/lib/auth/auth-telemetry', () => ({
  getAuthAuditLogs: vi.fn(),
}));

vi.mock('@/modules/platform/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn((table) => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          range: vi.fn(() => ({
            in: vi.fn(() => Promise.resolve({ data: [], error: null })),
            gte: vi.fn(() => Promise.resolve({ data: [], error: null })),
            lte: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      })),
      insert: vi.fn(() => Promise.resolve({ error: null })),
    })),
  })),
}));

import { getAuthenticatedUser } from '@/lib/api/authenticated-request';
import { getMfaAuditLogs } from '@/lib/auth/mfa-telemetry';
import { getAuthAuditLogs } from '@/lib/auth/auth-telemetry';

describe('Admin Audit Logs API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/admin/audit-logs', () => {
    it('should require admin authentication', async () => {
      (getAuthenticatedUser as any).mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/admin/audit-logs');
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should deny non-admin users', async () => {
      (getAuthenticatedUser as any).mockResolvedValue({
        id: 'user-id',
        role: 'client',
      });

      const request = new Request('http://localhost:3000/api/admin/audit-logs');
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should fetch all logs for admin user', async () => {
      (getAuthenticatedUser as any).mockResolvedValue({
        id: 'admin-id',
        role: 'admin',
      });

      (getAuthAuditLogs as any).mockResolvedValue([
        {
          id: 'log-1',
          user_id: 'user-1',
          event_type: 'session_refresh_success',
          event_data: {},
          success: true,
          created_at: new Date().toISOString(),
        },
      ]);

      (getMfaAuditLogs as any).mockResolvedValue([
        {
          id: 'log-2',
          user_id: 'user-2',
          event_type: 'mfa_verification_success',
          event_data: {},
          success: true,
          created_at: new Date().toISOString(),
        },
      ]);

      const request = new Request('http://localhost:3000/api/admin/audit-logs?type=all');
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.logs).toBeDefined();
      expect(data.data.pagination).toBeDefined();
    });

    it('should fetch only auth logs when type=auth', async () => {
      (getAuthenticatedUser as any).mockResolvedValue({
        id: 'admin-id',
        role: 'admin',
      });

      (getAuthAuditLogs as any).mockResolvedValue([
        {
          id: 'log-1',
          user_id: 'user-1',
          event_type: 'session_refresh_success',
          event_data: {},
          success: true,
          created_at: new Date().toISOString(),
        },
      ]);

      const request = new Request('http://localhost:3000/api/admin/audit-logs?type=auth');
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(getAuthAuditLogs).toHaveBeenCalled();
      expect(getMfaAuditLogs).not.toHaveBeenCalled();
    });

    it('should fetch only MFA logs when type=mfa', async () => {
      (getAuthenticatedUser as any).mockResolvedValue({
        id: 'admin-id',
        role: 'admin',
      });

      (getMfaAuditLogs as any).mockResolvedValue([
        {
          id: 'log-1',
          user_id: 'user-1',
          event_type: 'mfa_verification_success',
          event_data: {},
          success: true,
          created_at: new Date().toISOString(),
        },
      ]);

      const request = new Request('http://localhost:3000/api/admin/audit-logs?type=mfa&userId=user-1');
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(getMfaAuditLogs).toHaveBeenCalledWith('user-1', expect.any(Object));
    });

    it('should handle date range filters', async () => {
      (getAuthenticatedUser as any).mockResolvedValue({
        id: 'admin-id',
        role: 'admin',
      });

      (getAuthAuditLogs as any).mockResolvedValue([]);

      const request = new Request('http://localhost:3000/api/admin/audit-logs?type=auth&dateRange=7d');
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(getAuthAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        })
      );
    });

    it('should handle custom date range', async () => {
      (getAuthenticatedUser as any).mockResolvedValue({
        id: 'admin-id',
        role: 'admin',
      });

      (getAuthAuditLogs as any).mockResolvedValue([]);

      const startDate = '2024-01-01T00:00:00Z';
      const endDate = '2024-12-31T23:59:59Z';

      const request = new Request(
        `http://localhost:3000/api/admin/audit-logs?type=auth&startDate=${startDate}&endDate=${endDate}`
      );
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(getAuthAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        })
      );
    });

    it('should handle pagination parameters', async () => {
      (getAuthenticatedUser as any).mockResolvedValue({
        id: 'admin-id',
        role: 'admin',
      });

      (getAuthAuditLogs as any).mockResolvedValue([]);

      const request = new Request('http://localhost:3000/api/admin/audit-logs?type=auth&limit=50&offset=100');
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(getAuthAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 50,
          offset: 100,
        })
      );
    });

    it('should handle event type filters', async () => {
      (getAuthenticatedUser as any).mockResolvedValue({
        id: 'admin-id',
        role: 'admin',
      });

      (getAuthAuditLogs as any).mockResolvedValue([]);

      const request = new Request(
        'http://localhost:3000/api/admin/audit-logs?type=auth&eventTypes=session_refresh_success,session_refresh_failed'
      );
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(getAuthAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          eventTypes: ['session_refresh_success', 'session_refresh_failed'],
        })
      );
    });

    it('should validate query parameters', async () => {
      (getAuthenticatedUser as any).mockResolvedValue({
        id: 'admin-id',
        role: 'admin',
      });

      const request = new Request('http://localhost:3000/api/admin/audit-logs?limit=10000');
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should handle invalid userId parameter', async () => {
      (getAuthenticatedUser as any).mockResolvedValue({
        id: 'admin-id',
        role: 'admin',
      });

      const request = new Request('http://localhost:3000/api/admin/audit-logs?userId=invalid-uuid');
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      (getAuthenticatedUser as any).mockResolvedValue({
        id: 'admin-id',
        role: 'admin',
      });

      (getAuthAuditLogs as any).mockRejectedValue(new Error('Database connection failed'));

      const request = new Request('http://localhost:3000/api/admin/audit-logs?type=auth');
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });

  describe('POST /api/admin/audit-logs (Export)', () => {
    it('should require admin authentication for export', async () => {
      (getAuthenticatedUser as any).mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/admin/audit-logs', {
        method: 'POST',
      });
      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should export logs as CSV', async () => {
      (getAuthenticatedUser as any).mockResolvedValue({
        id: 'admin-id',
        role: 'admin',
      });

      (getAuthAuditLogs as any).mockResolvedValue([
        {
          id: 'log-1',
          user_id: 'user-1',
          event_type: 'session_refresh_success',
          event_data: { attemptCount: 1 },
          success: true,
          ip_address: '192.168.1.1',
          created_at: new Date().toISOString(),
        },
      ]);

      (getMfaAuditLogs as any).mockResolvedValue([]);

      const request = new Request('http://localhost:3000/api/admin/audit-logs?type=auth', {
        method: 'POST',
      });
      const response = await POST(request as any);

      expect(response.headers.get('Content-Type')).toContain('text/csv');
      expect(response.headers.get('Content-Disposition')).toContain('attachment');
    });

    it('should return 404 when no logs to export', async () => {
      (getAuthenticatedUser as any).mockResolvedValue({
        id: 'admin-id',
        role: 'admin',
      });

      (getAuthAuditLogs as any).mockResolvedValue([]);
      (getMfaAuditLogs as any).mockResolvedValue([]);

      const request = new Request('http://localhost:3000/api/admin/audit-logs?type=all', {
        method: 'POST',
      });
      const response = await POST(request as any);

      expect(response.status).toBe(404);
    });
  });
});
