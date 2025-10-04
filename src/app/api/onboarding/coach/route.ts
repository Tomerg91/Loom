import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  requireAuth,
  requireCoach,
  validateRequestBody,
  createSuccessResponse,
  createErrorResponse,
  HTTP_STATUS,
  rateLimit,
  withErrorHandling,
  withRequestLogging,
  type AuthenticatedUser,
} from '@/lib/api/utils';
import { createClient } from '@/lib/supabase/server';

// Validation Schemas
const availabilitySlotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
}).refine(
  (data) => {
    // Validate that start time is before end time
    const [startHour, startMin] = data.startTime.split(':').map(Number);
    const [endHour, endMin] = data.endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    return startMinutes < endMinutes;
  },
  { message: 'Start time must be before end time' }
);

const coachOnboardingSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  profile: z.object({
    bio: z.string().min(50, 'Bio must be at least 50 characters').max(2000, 'Bio must not exceed 2000 characters'),
    experienceYears: z.number().int().min(0, 'Experience years cannot be negative').max(100, 'Experience years must be realistic'),
    specializations: z.array(z.string().min(1).max(100)).min(1, 'At least one specialization is required').max(10, 'Maximum 10 specializations allowed'),
    profilePictureUrl: z.string().url('Invalid profile picture URL').optional().or(z.literal('')),
  }),
  pricing: z.object({
    sessionRate: z.number().positive('Session rate must be positive').max(10000, 'Session rate must be realistic'),
    currency: z.string().length(3, 'Currency must be a 3-letter code').toUpperCase(),
    languages: z.array(z.string().min(1).max(50)).min(1, 'At least one language is required').max(10, 'Maximum 10 languages allowed'),
    timezone: z.string().min(1, 'Timezone is required'),
  }),
  availability: z.object({
    weeklySlots: z.array(availabilitySlotSchema).min(1, 'At least one availability slot is required').max(50, 'Maximum 50 slots allowed'),
    defaultDuration: z.number().int().min(15, 'Minimum session duration is 15 minutes').max(480, 'Maximum session duration is 480 minutes (8 hours)'),
    bufferTime: z.number().int().min(0, 'Buffer time cannot be negative').max(120, 'Maximum buffer time is 120 minutes'),
  }),
});

type CoachOnboardingData = z.infer<typeof coachOnboardingSchema>;

/**
 * POST /api/onboarding/coach
 * Save coach onboarding data
 */
async function handleCoachOnboarding(
  user: AuthenticatedUser,
  request: NextRequest
): Promise<NextResponse> {
  // Parse and validate request body
  const body = await request.json();
  const validation = validateRequestBody(coachOnboardingSchema, body);

  if (!validation.success) {
    return createErrorResponse(
      validation.error,
      HTTP_STATUS.BAD_REQUEST
    );
  }

  const data: CoachOnboardingData = validation.data;

  // Security check: Verify user can only update their own profile
  if (data.userId !== user.id) {
    return createErrorResponse(
      'Access denied. You can only update your own profile.',
      HTTP_STATUS.FORBIDDEN
    );
  }

  // Verify user is a coach
  if (user.role !== 'coach') {
    return createErrorResponse(
      'Access denied. Only coach accounts can complete coach onboarding.',
      HTTP_STATUS.FORBIDDEN
    );
  }

  const supabase = await createClient();

  try {
    // Start a transaction-like operation
    // 1. Upsert coach profile
    const now = new Date().toISOString();
    const { data: coachProfile, error: profileError } = await supabase
      .from('coach_profiles')
      .upsert(
        {
          coach_id: user.id,
          bio: data.profile.bio,
          experience_years: data.profile.experienceYears,
          specializations: data.profile.specializations,
          session_rate: data.pricing.sessionRate,
          currency: data.pricing.currency,
          languages: data.pricing.languages,
          timezone: data.pricing.timezone,
          default_session_duration: data.availability.defaultDuration,
          booking_buffer_time: data.availability.bufferTime,
          profile_picture_url: data.profile.profilePictureUrl || null,
          onboarding_completed_at: now,
          updated_at: now,
        },
        {
          onConflict: 'coach_id',
          ignoreDuplicates: false,
        }
      )
      .select()
      .single();

    if (profileError) {
      console.error('Error creating/updating coach profile:', profileError);
      return createErrorResponse(
        'Failed to save coach profile. Please try again.',
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }

    // 2. Update user profile picture if provided
    if (data.profile.profilePictureUrl) {
      const { error: avatarError } = await supabase
        .from('users')
        .update({ avatar_url: data.profile.profilePictureUrl })
        .eq('id', user.id);

      if (avatarError) {
        console.warn('Error updating avatar URL:', avatarError);
        // Non-critical error, continue with onboarding
      }
    }

    // 3. Delete existing availability slots for this coach
    const { error: deleteError } = await supabase
      .from('coach_availability')
      .delete()
      .eq('coach_id', user.id);

    if (deleteError) {
      console.error('Error deleting old availability slots:', deleteError);
      // Non-critical error, but log it
    }

    // 4. Insert new availability slots
    const availabilityRecords = data.availability.weeklySlots.map((slot) => ({
      coach_id: user.id,
      day_of_week: slot.dayOfWeek,
      start_time: slot.startTime,
      end_time: slot.endTime,
      timezone: data.pricing.timezone,
      is_available: true,
    }));

    const { error: availabilityError } = await supabase
      .from('coach_availability')
      .insert(availabilityRecords);

    if (availabilityError) {
      console.error('Error creating availability slots:', availabilityError);
      return createErrorResponse(
        'Failed to save availability slots. Please try again.',
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }

    // 5. Update users table to mark onboarding as complete
    // Note: We'll store this as a flag in metadata or create a new column
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({
        timezone: data.pricing.timezone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (userUpdateError) {
      console.warn('Error updating user timezone:', userUpdateError);
      // Non-critical error
    }

    // 6. Fetch the complete profile to return
    const { data: completeProfile, error: fetchError } = await supabase
      .from('coach_profiles')
      .select(`
        *,
        users!coach_profiles_coach_id_fkey (
          id,
          email,
          first_name,
          last_name,
          avatar_url,
          timezone
        )
      `)
      .eq('coach_id', user.id)
      .single();

    if (fetchError) {
      console.error('Error fetching complete profile:', fetchError);
      // Still return success since data was saved
    }

    // 7. Log audit event
    try {
      await supabase.rpc('log_audit_event', {
        action_name: 'coach_onboarding_completed',
        resource_type_name: 'coach_profile',
        resource_id_value: user.id,
        details_json: {
          specializations: data.profile.specializations,
          experience_years: data.profile.experienceYears,
          session_rate: data.pricing.sessionRate,
          currency: data.pricing.currency,
          availability_slots_count: availabilityRecords.length,
        },
        ip_addr: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || null,
        user_agent_string: request.headers.get('user-agent') || null,
      });
    } catch (auditError) {
      // Non-critical error, just log it
      console.warn('Failed to log audit event:', auditError);
    }

    return createSuccessResponse(
      {
        coach: completeProfile || coachProfile,
        onboardingCompleted: true,
        message: 'Coach onboarding completed successfully',
      },
      'Coach onboarding completed successfully',
      HTTP_STATUS.CREATED
    );
  } catch (error) {
    console.error('Unexpected error during coach onboarding:', error);
    return createErrorResponse(
      'An unexpected error occurred while processing your onboarding. Please try again.',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
}

// Apply middleware: error handling -> logging -> rate limiting -> auth -> role check -> handler
export const POST = withErrorHandling(
  withRequestLogging(
    rateLimit(5, 60000)( // 5 requests per minute
      requireAuth(
        requireCoach(handleCoachOnboarding)
      )
    ),
    { name: 'POST /api/onboarding/coach' }
  )
);
