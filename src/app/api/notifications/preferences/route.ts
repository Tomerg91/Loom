import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for notification preferences
const notificationPreferencesSchema = z.object({
  // Email preferences
  email_enabled: z.boolean().default(true),
  email_session_reminders: z.boolean().default(true),
  email_session_updates: z.boolean().default(true),
  email_messages: z.boolean().default(true),
  email_system_updates: z.boolean().default(false),
  email_marketing: z.boolean().default(false),
  
  // In-app preferences
  inapp_enabled: z.boolean().default(true),
  inapp_session_reminders: z.boolean().default(true),
  inapp_session_updates: z.boolean().default(true),
  inapp_messages: z.boolean().default(true),
  inapp_system_updates: z.boolean().default(true),
  inapp_sounds: z.boolean().default(true),
  inapp_desktop: z.boolean().default(true),
  
  // Push preferences
  push_enabled: z.boolean().default(false),
  push_session_reminders: z.boolean().default(false),
  push_session_updates: z.boolean().default(false),
  push_messages: z.boolean().default(false),
  push_system_updates: z.boolean().default(false),
  
  // Timing preferences
  quiet_hours_enabled: z.boolean().default(false),
  quiet_hours_start: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).default('22:00'),
  quiet_hours_end: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).default('08:00'),
  timezone: z.string().default('UTC'),
  reminder_timing: z.number().min(5).max(1440).default(15), // minutes
  
  // Frequency preferences
  digest_frequency: z.enum(['immediate', 'hourly', 'daily', 'weekly', 'never']).default('daily'),
})

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's notification preferences
    const { data: preferences, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error fetching notification preferences:', error)
      return NextResponse.json(
        { error: 'Failed to fetch notification preferences' },
        { status: 500 }
      )
    }

    // If no preferences exist, return defaults
    if (!preferences) {
      const defaultPreferences = notificationPreferencesSchema.parse({})
      return NextResponse.json({ data: defaultPreferences })
    }

    // Transform database format to API format
    const apiPreferences = {
      email: {
        enabled: preferences.email_enabled,
        sessionReminders: preferences.email_session_reminders,
        sessionUpdates: preferences.email_session_updates,
        messageNotifications: preferences.email_messages,
        marketing: preferences.email_marketing,
        weeklyDigest: preferences.digest_frequency === 'weekly',
        frequency: preferences.digest_frequency,
      },
      push: {
        enabled: preferences.push_enabled,
        sessionReminders: preferences.push_session_reminders,
        sessionUpdates: preferences.push_session_updates || preferences.inapp_session_updates,
        messageNotifications: preferences.push_messages,
        systemUpdates: preferences.push_system_updates || preferences.inapp_system_updates,
        quietHours: {
          enabled: preferences.quiet_hours_enabled,
          start: preferences.quiet_hours_start,
          end: preferences.quiet_hours_end,
        },
      },
      inApp: {
        enabled: preferences.inapp_enabled,
        sessionReminders: preferences.inapp_session_reminders,
        messageNotifications: preferences.inapp_messages,
        systemNotifications: preferences.inapp_system_updates,
        sounds: preferences.inapp_sounds ?? true,
        desktop: preferences.inapp_desktop ?? true,
      },
      preferences: {
        language: 'en', // From user profile, not preferences
        timezone: preferences.timezone,
        reminderTiming: preferences.reminder_timing ?? 15,
      },
    }

    return NextResponse.json({ data: apiPreferences })

  } catch (error) {
    console.error('Notification preferences GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    // Transform API format to database format
    const dbPreferences = {
      user_id: user.id,
      email_enabled: body.email?.enabled ?? true,
      email_session_reminders: body.email?.sessionReminders ?? true,
      email_session_updates: body.email?.sessionUpdates ?? true,
      email_messages: body.email?.messageNotifications ?? true,
      email_system_updates: body.email?.systemUpdates ?? false,
      email_marketing: body.email?.marketing ?? false,
      
      inapp_enabled: body.inApp?.enabled ?? true,
      inapp_session_reminders: body.inApp?.sessionReminders ?? true,
      inapp_session_updates: body.inApp?.sessionUpdates ?? true,
      inapp_messages: body.inApp?.messageNotifications ?? true,
      inapp_system_updates: body.inApp?.systemNotifications ?? true,
      inapp_sounds: body.inApp?.sounds ?? true,
      inapp_desktop: body.inApp?.desktop ?? true,
      
      push_enabled: body.push?.enabled ?? false,
      push_session_reminders: body.push?.sessionReminders ?? false,
      push_session_updates: body.push?.sessionUpdates ?? false,
      push_messages: body.push?.messageNotifications ?? false,
      push_system_updates: body.push?.systemUpdates ?? false,
      
      quiet_hours_enabled: body.push?.quietHours?.enabled ?? false,
      quiet_hours_start: body.push?.quietHours?.start ?? '22:00',
      quiet_hours_end: body.push?.quietHours?.end ?? '08:00',
      timezone: body.preferences?.timezone ?? 'UTC',
      reminder_timing: body.preferences?.reminderTiming ?? 15,
      
      digest_frequency: body.email?.frequency ?? 'daily',
    }

    // Validate the data
    const validationResult = notificationPreferencesSchema.safeParse(dbPreferences)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.errors
        },
        { status: 400 }
      )
    }

    // Upsert preferences (insert or update)
    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert(validationResult.data, { onConflict: 'user_id' })
      .select()
      .single()

    if (error) {
      console.error('Error updating notification preferences:', error)
      return NextResponse.json(
        { error: 'Failed to update notification preferences' },
        { status: 500 }
      )
    }

    // Transform back to API format for response
    const apiResponse = {
      email: {
        enabled: data.email_enabled,
        sessionReminders: data.email_session_reminders,
        sessionUpdates: data.email_session_updates,
        messageNotifications: data.email_messages,
        marketing: data.email_marketing,
        weeklyDigest: data.digest_frequency === 'weekly',
        frequency: data.digest_frequency,
      },
      push: {
        enabled: data.push_enabled,
        sessionReminders: data.push_session_reminders,
        sessionUpdates: data.push_session_updates || data.inapp_session_updates,
        messageNotifications: data.push_messages,
        systemUpdates: data.push_system_updates || data.inapp_system_updates,
        quietHours: {
          enabled: data.quiet_hours_enabled,
          start: data.quiet_hours_start,
          end: data.quiet_hours_end,
        },
      },
      inApp: {
        enabled: data.inapp_enabled,
        sessionReminders: data.inapp_session_reminders,
        messageNotifications: data.inapp_messages,
        systemNotifications: data.inapp_system_updates,
        sounds: data.inapp_sounds ?? true,
        desktop: data.inapp_desktop ?? true,
      },
      preferences: {
        language: 'en',
        timezone: data.timezone,
        reminderTiming: data.reminder_timing ?? 15,
      },
    }

    return NextResponse.json({ 
      data: apiResponse,
      message: 'Notification preferences updated successfully' 
    })

  } catch (error) {
    console.error('Notification preferences PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}