import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { GET as GetSettings } from '@/app/api/settings/route';
import { GET as GetPreferences, PUT as UpdatePreferences } from '@/app/api/settings/preferences/route';
import { GET as GetAudit } from '@/app/api/settings/audit/route';
import { mockSupabaseClient } from '@/test/utils';

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabaseClient),
}));

vi.mock('@/lib/api/auth-client', () => ({
  createAuthenticatedSupabaseClient: vi.fn(async () => mockSupabaseClient),
  propagateCookies: vi.fn(),
}));

describe('/api/settings', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    role: 'client',
  };

  const mockPreferences = {
    id: 'pref-1',
    user_id: mockUser.id,
    theme: 'dark',
    sidebar_collapsed: false,
    compact_mode: false,
    language: 'en',
    timezone: 'UTC',
    date_format: 'MM/DD/YYYY',
    time_format: '12h',
    email_verified: false,
    phone_verified: false,
    profile_visibility: 'private',
    show_online_status: true,
    allow_search_indexing: false,
    reduced_motion: false,
    high_contrast: false,
    font_size: 'medium',
    screen_reader_optimized: false,
    auto_join_video: true,
    auto_start_audio: true,
    video_quality: 'auto',
    data_export_frequency: 'never',
    analytics_enabled: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockNotificationPreferences = {
    id: 'notif-pref-1',
    user_id: mockUser.id,
    email_enabled: true,
    email_session_reminders: true,
    email_session_updates: true,
    email_messages: true,
    email_system_updates: false,
    email_marketing: false,
    inapp_enabled: true,
    inapp_session_reminders: true,
    inapp_session_updates: true,
    inapp_messages: true,
    inapp_system_updates: true,
    push_enabled: false,
    push_session_reminders: false,
    push_messages: false,
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00',
    timezone: 'UTC',
    digest_frequency: 'daily',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
  });

  describe('GET /api/settings', () => {
    it('returns complete user settings successfully', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: {
          profile: {
            id: mockUser.id,
            email: mockUser.email,
            firstName: 'Test',
            lastName: 'User',
            role: 'client',
            status: 'active',
          },
          preferences: mockPreferences,
          notifications: mockNotificationPreferences,
        },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/settings');
      const response = await GetSettings(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.profile).toBeDefined();
      expect(data.data.preferences).toBeDefined();
      expect(data.data.notifications).toBeDefined();
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'get_user_settings',
        { input_user_id: mockUser.id }
      );
    });

    it('returns 401 when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Unauthorized' },
      });

      const request = new NextRequest('http://localhost:3000/api/settings');
      const response = await GetSettings(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 500 when database error occurs', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const request = new NextRequest('http://localhost:3000/api/settings');
      const response = await GetSettings(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch user settings');
    });
  });

  describe('GET /api/settings/preferences', () => {
    it('returns user preferences successfully', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockPreferences,
              error: null,
            }),
          }),
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/settings/preferences');
      const response = await GetPreferences(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.theme).toBe('dark');
      expect(data.data.language).toBe('en');
    });

    it('returns defaults when preferences do not exist', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' }, // Not found
            }),
          }),
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/settings/preferences');
      const response = await GetPreferences(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.theme).toBe('system');
      expect(data.data.language).toBe('en');
    });

    it('returns 401 when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Unauthorized' },
      });

      const request = new NextRequest('http://localhost:3000/api/settings/preferences');
      const response = await GetPreferences(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('PUT /api/settings/preferences', () => {
    it('updates user preferences successfully', async () => {
      const updates = {
        theme: 'light',
        language: 'he',
        timezone: 'Asia/Jerusalem',
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: { ...mockPreferences, ...updates },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/settings/preferences', {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      const response = await UpdatePreferences(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('User preferences updated successfully');
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'update_user_preferences_with_audit',
        expect.objectContaining({
          input_user_id: mockUser.id,
          preference_updates: expect.objectContaining({
            theme: 'light',
            language: 'he',
            timezone: 'Asia/Jerusalem',
          }),
        })
      );
    });

    it('validates preference data', async () => {
      const invalidUpdates = {
        theme: 'invalid-theme',
      };

      const request = new NextRequest('http://localhost:3000/api/settings/preferences', {
        method: 'PUT',
        body: JSON.stringify(invalidUpdates),
      });

      const response = await UpdatePreferences(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
    });

    it('returns 401 when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Unauthorized' },
      });

      const request = new NextRequest('http://localhost:3000/api/settings/preferences', {
        method: 'PUT',
        body: JSON.stringify({ theme: 'dark' }),
      });

      const response = await UpdatePreferences(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('includes change reason in audit log', async () => {
      const updates = {
        theme: 'dark',
        changeReason: 'Testing dark mode',
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: { ...mockPreferences, theme: 'dark' },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/settings/preferences', {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      await UpdatePreferences(request);

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'update_user_preferences_with_audit',
        expect.objectContaining({
          change_reason: 'Testing dark mode',
        })
      );
    });
  });

  describe('GET /api/settings/audit', () => {
    const mockAuditLogs = [
      {
        id: 'log-1',
        user_id: mockUser.id,
        setting_category: 'display',
        setting_key: 'theme',
        old_value: { theme: 'light' },
        new_value: { theme: 'dark' },
        change_source: 'user',
        change_reason: 'Testing',
        created_at: new Date().toISOString(),
      },
      {
        id: 'log-2',
        user_id: mockUser.id,
        setting_category: 'localization',
        setting_key: 'language',
        old_value: { language: 'en' },
        new_value: { language: 'he' },
        change_source: 'user',
        change_reason: null,
        created_at: new Date().toISOString(),
      },
    ];

    it('returns audit history successfully', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: mockAuditLogs,
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            count: 2,
            error: null,
          }),
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/settings/audit?limit=50&offset=0');
      const response = await GetAudit(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.logs).toHaveLength(2);
      expect(data.data.pagination).toBeDefined();
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'get_settings_audit_history',
        {
          input_user_id: mockUser.id,
          limit_count: 50,
          offset_count: 0,
        }
      );
    });

    it('filters audit history by category', async () => {
      const displayLogs = mockAuditLogs.filter(log => log.setting_category === 'display');

      mockSupabaseClient.rpc.mockResolvedValue({
        data: mockAuditLogs,
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              count: displayLogs.length,
              error: null,
            }),
          }),
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/settings/audit?category=display');
      const response = await GetAudit(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.logs.every((log: { settingCategory: string }) => log.settingCategory === 'display')).toBe(true);
    });

    it('validates query parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/settings/audit?limit=200'); // Invalid: max is 100
      const response = await GetAudit(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid query parameters');
    });

    it('returns 401 when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Unauthorized' },
      });

      const request = new NextRequest('http://localhost:3000/api/settings/audit');
      const response = await GetAudit(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });
});
