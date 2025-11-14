import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import {
  createSuccessResponse,
  createErrorResponse,
  HTTP_STATUS
} from '@/lib/api/utils';

/**
 * GET /api/settings
 * Retrieves complete user settings including profile, preferences, and notifications
 * This is a convenience endpoint that aggregates data from multiple sources
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return createErrorResponse('Unauthorized', HTTP_STATUS.UNAUTHORIZED);
    }

    // Call the database function to get all settings
    const { data: settings, error } = await supabase.rpc(
      'get_user_settings',
      {
        input_user_id: user.id,
      }
    );

    if (error) {
      console.error('Error fetching user settings:', error);
      return createErrorResponse(
        'Failed to fetch user settings',
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }

    // Transform database format to API format
    const transformPreferences = (prefs: {
      theme?: string;
      sidebar_collapsed?: boolean;
      compact_mode?: boolean;
      language?: string;
      timezone?: string;
      date_format?: string;
      time_format?: string;
      email_verified?: boolean;
      phone_verified?: boolean;
      profile_visibility?: string;
      show_online_status?: boolean;
      allow_search_indexing?: boolean;
      reduced_motion?: boolean;
      high_contrast?: boolean;
      font_size?: string;
      screen_reader_optimized?: boolean;
      auto_join_video?: boolean;
      auto_start_audio?: boolean;
      video_quality?: string;
      data_export_frequency?: string;
      analytics_enabled?: boolean;
      created_at?: string;
      updated_at?: string;
    }) => ({
      theme: prefs?.theme || 'system',
      sidebarCollapsed: prefs?.sidebar_collapsed || false,
      compactMode: prefs?.compact_mode || false,
      language: prefs?.language || 'en',
      timezone: prefs?.timezone || 'UTC',
      dateFormat: prefs?.date_format || 'MM/DD/YYYY',
      timeFormat: prefs?.time_format || '12h',
      emailVerified: prefs?.email_verified || false,
      phoneVerified: prefs?.phone_verified || false,
      profileVisibility: prefs?.profile_visibility || 'private',
      showOnlineStatus: prefs?.show_online_status !== false,
      allowSearchIndexing: prefs?.allow_search_indexing || false,
      reducedMotion: prefs?.reduced_motion || false,
      highContrast: prefs?.high_contrast || false,
      fontSize: prefs?.font_size || 'medium',
      screenReaderOptimized: prefs?.screen_reader_optimized || false,
      autoJoinVideo: prefs?.auto_join_video !== false,
      autoStartAudio: prefs?.auto_start_audio !== false,
      videoQuality: prefs?.video_quality || 'auto',
      dataExportFrequency: prefs?.data_export_frequency || 'never',
      analyticsEnabled: prefs?.analytics_enabled !== false,
      createdAt: prefs?.created_at,
      updatedAt: prefs?.updated_at,
    });

    const transformNotifications = (notifs: {
      email_enabled?: boolean;
      email_session_reminders?: boolean;
      email_session_updates?: boolean;
      email_messages?: boolean;
      email_system_updates?: boolean;
      email_marketing?: boolean;
      inapp_enabled?: boolean;
      inapp_session_reminders?: boolean;
      inapp_session_updates?: boolean;
      inapp_messages?: boolean;
      inapp_system_updates?: boolean;
      push_enabled?: boolean;
      push_session_reminders?: boolean;
      push_messages?: boolean;
      quiet_hours_enabled?: boolean;
      quiet_hours_start?: string;
      quiet_hours_end?: string;
      timezone?: string;
      digest_frequency?: string;
      created_at?: string;
      updated_at?: string;
    }) => ({
      email: {
        enabled: notifs?.email_enabled !== false,
        sessionReminders: notifs?.email_session_reminders !== false,
        sessionUpdates: notifs?.email_session_updates !== false,
        messages: notifs?.email_messages !== false,
        systemUpdates: notifs?.email_system_updates || false,
        marketing: notifs?.email_marketing || false,
      },
      inApp: {
        enabled: notifs?.inapp_enabled !== false,
        sessionReminders: notifs?.inapp_session_reminders !== false,
        sessionUpdates: notifs?.inapp_session_updates !== false,
        messages: notifs?.inapp_messages !== false,
        systemUpdates: notifs?.inapp_system_updates !== false,
      },
      push: {
        enabled: notifs?.push_enabled || false,
        sessionReminders: notifs?.push_session_reminders || false,
        messages: notifs?.push_messages || false,
      },
      quietHours: {
        enabled: notifs?.quiet_hours_enabled || false,
        start: notifs?.quiet_hours_start || '22:00',
        end: notifs?.quiet_hours_end || '08:00',
        timezone: notifs?.timezone || 'UTC',
      },
      digestFrequency: notifs?.digest_frequency || 'daily',
      createdAt: notifs?.created_at,
      updatedAt: notifs?.updated_at,
    });

    const apiResponse = {
      profile: {
        id: settings.profile?.id || user.id,
        email: settings.profile?.email || user.email,
        firstName: settings.profile?.firstName,
        lastName: settings.profile?.lastName,
        phone: settings.profile?.phone,
        avatarUrl: settings.profile?.avatarUrl,
        role: settings.profile?.role,
        status: settings.profile?.status,
      },
      preferences: transformPreferences(settings.preferences || {}),
      notifications: transformNotifications(settings.notifications || {}),
    };

    return createSuccessResponse(apiResponse);

  } catch (error) {
    console.error('User settings GET error:', error);
    return createErrorResponse(
      'Internal server error',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
}
