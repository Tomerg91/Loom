import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import { createAuthenticatedSupabaseClient } from '@/lib/api/auth-client';
import {
  createSuccessResponse,
  createErrorResponse,
  HTTP_STATUS
} from '@/lib/api/utils';

// Validation schema for user preferences
const userPreferencesSchema = z.object({
  // Display preferences
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  sidebar_collapsed: z.boolean().default(false),
  compact_mode: z.boolean().default(false),

  // Localization preferences
  language: z.enum(['en', 'he']).default('en'),
  timezone: z.string().default('UTC'),
  date_format: z.enum(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']).default('MM/DD/YYYY'),
  time_format: z.enum(['12h', '24h']).default('12h'),

  // Privacy preferences
  profile_visibility: z.enum(['public', 'private', 'contacts']).default('private'),
  show_online_status: z.boolean().default(true),
  allow_search_indexing: z.boolean().default(false),

  // Accessibility preferences
  reduced_motion: z.boolean().default(false),
  high_contrast: z.boolean().default(false),
  font_size: z.enum(['small', 'medium', 'large', 'x-large']).default('medium'),
  screen_reader_optimized: z.boolean().default(false),

  // Session preferences
  auto_join_video: z.boolean().default(true),
  auto_start_audio: z.boolean().default(true),
  video_quality: z.enum(['auto', 'low', 'medium', 'high']).default('auto'),

  // Data preferences
  data_export_frequency: z.enum(['never', 'weekly', 'monthly', 'quarterly']).default('never'),
  analytics_enabled: z.boolean().default(true),
}).partial();

/**
 * GET /api/settings/preferences
 * Retrieves user preferences for the authenticated user
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return createErrorResponse('Unauthorized', HTTP_STATUS.UNAUTHORIZED);
    }

    // Get user's preferences
    const { data: preferences, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error fetching user preferences:', error);
      return createErrorResponse(
        'Failed to fetch user preferences',
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }

    // If no preferences exist, return defaults
    if (!preferences) {
      const defaultPreferences = {
        theme: 'system',
        sidebarCollapsed: false,
        compactMode: false,
        language: 'en',
        timezone: 'UTC',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h',
        profileVisibility: 'private',
        showOnlineStatus: true,
        allowSearchIndexing: false,
        reducedMotion: false,
        highContrast: false,
        fontSize: 'medium',
        screenReaderOptimized: false,
        autoJoinVideo: true,
        autoStartAudio: true,
        videoQuality: 'auto',
        dataExportFrequency: 'never',
        analyticsEnabled: true,
      };
      return createSuccessResponse(defaultPreferences);
    }

    // Transform database format to API format (camelCase)
    const apiPreferences = {
      theme: preferences.theme,
      sidebarCollapsed: preferences.sidebar_collapsed,
      compactMode: preferences.compact_mode,
      language: preferences.language,
      timezone: preferences.timezone,
      dateFormat: preferences.date_format,
      timeFormat: preferences.time_format,
      emailVerified: preferences.email_verified,
      phoneVerified: preferences.phone_verified,
      profileVisibility: preferences.profile_visibility,
      showOnlineStatus: preferences.show_online_status,
      allowSearchIndexing: preferences.allow_search_indexing,
      reducedMotion: preferences.reduced_motion,
      highContrast: preferences.high_contrast,
      fontSize: preferences.font_size,
      screenReaderOptimized: preferences.screen_reader_optimized,
      autoJoinVideo: preferences.auto_join_video,
      autoStartAudio: preferences.auto_start_audio,
      videoQuality: preferences.video_quality,
      dataExportFrequency: preferences.data_export_frequency,
      analyticsEnabled: preferences.analytics_enabled,
      createdAt: preferences.created_at,
      updatedAt: preferences.updated_at,
    };

    return createSuccessResponse(apiPreferences);

  } catch (error) {
    console.error('User preferences GET error:', error);
    return createErrorResponse(
      'Internal server error',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
}

/**
 * PUT /api/settings/preferences
 * Updates user preferences with audit logging
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return createErrorResponse('Unauthorized', HTTP_STATUS.UNAUTHORIZED);
    }

    const body = await request.json();

    // Transform API format (camelCase) to database format (snake_case)
    const dbPreferences: Record<string, unknown> = {};

    if (body.theme !== undefined) dbPreferences.theme = body.theme;
    if (body.sidebarCollapsed !== undefined) dbPreferences.sidebar_collapsed = body.sidebarCollapsed;
    if (body.compactMode !== undefined) dbPreferences.compact_mode = body.compactMode;
    if (body.language !== undefined) dbPreferences.language = body.language;
    if (body.timezone !== undefined) dbPreferences.timezone = body.timezone;
    if (body.dateFormat !== undefined) dbPreferences.date_format = body.dateFormat;
    if (body.timeFormat !== undefined) dbPreferences.time_format = body.timeFormat;
    if (body.profileVisibility !== undefined) dbPreferences.profile_visibility = body.profileVisibility;
    if (body.showOnlineStatus !== undefined) dbPreferences.show_online_status = body.showOnlineStatus;
    if (body.allowSearchIndexing !== undefined) dbPreferences.allow_search_indexing = body.allowSearchIndexing;
    if (body.reducedMotion !== undefined) dbPreferences.reduced_motion = body.reducedMotion;
    if (body.highContrast !== undefined) dbPreferences.high_contrast = body.highContrast;
    if (body.fontSize !== undefined) dbPreferences.font_size = body.fontSize;
    if (body.screenReaderOptimized !== undefined) dbPreferences.screen_reader_optimized = body.screenReaderOptimized;
    if (body.autoJoinVideo !== undefined) dbPreferences.auto_join_video = body.autoJoinVideo;
    if (body.autoStartAudio !== undefined) dbPreferences.auto_start_audio = body.autoStartAudio;
    if (body.videoQuality !== undefined) dbPreferences.video_quality = body.videoQuality;
    if (body.dataExportFrequency !== undefined) dbPreferences.data_export_frequency = body.dataExportFrequency;
    if (body.analyticsEnabled !== undefined) dbPreferences.analytics_enabled = body.analyticsEnabled;

    // Validate the data
    const validationResult = userPreferencesSchema.safeParse(dbPreferences);
    if (!validationResult.success) {
      return createErrorResponse(
        'Invalid request data',
        HTTP_STATUS.BAD_REQUEST,
        validationResult.error.errors
      );
    }

    // Get client IP and user agent for audit logging
    const ipAddress = request.headers.get('x-forwarded-for') ||
                      request.headers.get('x-real-ip') ||
                      null;
    const userAgent = request.headers.get('user-agent') || null;

    // Use the authenticated client that ensures proper RLS
    const authSupabase = await createAuthenticatedSupabaseClient();

    // Call the database function that handles update + audit logging
    const { data, error } = await authSupabase.rpc(
      'update_user_preferences_with_audit',
      {
        input_user_id: user.id,
        preference_updates: validationResult.data,
        change_reason: body.changeReason || null,
        request_ip: ipAddress,
        request_user_agent: userAgent,
      }
    );

    if (error) {
      console.error('Error updating user preferences:', error);
      return createErrorResponse(
        'Failed to update user preferences',
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }

    // Transform back to API format for response
    const apiResponse = {
      theme: data.theme,
      sidebarCollapsed: data.sidebar_collapsed,
      compactMode: data.compact_mode,
      language: data.language,
      timezone: data.timezone,
      dateFormat: data.date_format,
      timeFormat: data.time_format,
      profileVisibility: data.profile_visibility,
      showOnlineStatus: data.show_online_status,
      allowSearchIndexing: data.allow_search_indexing,
      reducedMotion: data.reduced_motion,
      highContrast: data.high_contrast,
      fontSize: data.font_size,
      screenReaderOptimized: data.screen_reader_optimized,
      autoJoinVideo: data.auto_join_video,
      autoStartAudio: data.auto_start_audio,
      videoQuality: data.video_quality,
      dataExportFrequency: data.data_export_frequency,
      analyticsEnabled: data.analytics_enabled,
      updatedAt: data.updated_at,
    };

    return createSuccessResponse(
      apiResponse,
      'User preferences updated successfully'
    );

  } catch (error) {
    console.error('User preferences PUT error:', error);
    return createErrorResponse(
      'Internal server error',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
}
