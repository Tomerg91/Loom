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
import { logger } from '@/lib/logger';

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

const coachOnboardingFormSchema = z.object({
  step: z.number().int().min(1).max(10).default(5),
  title: z.string().min(2, 'Title is required').max(120, 'Title must be 120 characters or less'),
  bio: z.string().min(50, 'Bio must be at least 50 characters').max(2000, 'Bio must not exceed 2000 characters'),
  experienceYears: z.number().int().min(0, 'Experience years cannot be negative').max(100, 'Experience years must be realistic'),
  specialties: z.array(z.string().min(1).max(100)).min(1, 'At least one specialty is required').max(10, 'Maximum 10 specialties allowed'),
  credentials: z.array(z.string().min(1).max(120)).max(15, 'Maximum 15 credentials allowed'),
  languages: z.array(z.string().min(1).max(50)).min(1, 'At least one language is required').max(10, 'Maximum 10 languages allowed'),
  timezone: z.string().min(2, 'Timezone is required').max(64, 'Timezone must be 64 characters or less'),
  hourlyRate: z.number().positive('Hourly rate must be positive').max(10000, 'Hourly rate must be realistic'),
  currency: z.string().length(3, 'Currency must be a 3-letter code').transform((value) => value.toUpperCase()),
  approach: z.string().min(10, 'Approach must be at least 10 characters').max(2000, 'Approach must not exceed 2000 characters'),
  location: z.string().min(2, 'Location is required').max(160, 'Location must be 160 characters or less'),
  availability: z
    .array(availabilitySlotSchema)
    .min(1, 'At least one availability slot is required')
    .max(50, 'Maximum 50 availability slots allowed'),
});

type CoachOnboardingFormInput = z.input<typeof coachOnboardingFormSchema>;
type CoachOnboardingFormData = z.infer<typeof coachOnboardingFormSchema> & { step: number };

const normalizeTime = (time: string): string => {
  if (!time.includes(':')) {
    return time;
  }

  return time.length === 5 ? `${time}:00` : time;
};

const sanitizeCoachFormData = (data: CoachOnboardingFormInput): CoachOnboardingFormData => ({
  ...data,
  step: data.step ?? 5,
  title: data.title.trim(),
  bio: data.bio.trim(),
  approach: data.approach.trim(),
  location: data.location.trim(),
  currency: data.currency.toUpperCase(),
  specialties: data.specialties.map((item) => item.trim()).filter(Boolean),
  credentials: data.credentials.map((item) => item.trim()).filter(Boolean),
  languages: data.languages.map((item) => item.trim()).filter(Boolean),
  availability: data.availability.map((slot) => ({
    ...slot,
    startTime: slot.startTime.trim(),
    endTime: slot.endTime.trim(),
  })),
});

const getCoachProfileSelect = `
  title,
  bio,
  experience_years,
  specializations,
  credentials,
  languages,
  timezone,
  session_rate,
  hourly_rate,
  currency,
  location,
  approach,
  onboarding_completed_at,
  default_session_duration,
  booking_buffer_time
`;

const rateLimitedCoachHandler = rateLimit(10, 60_000);

const coachProfileHandler = requireCoach(
  async (user: AuthenticatedUser, _request: NextRequest): Promise<NextResponse> => {
    const supabase = await createClient();

    const [{ data: profile, error: profileError }, { data: availability, error: availabilityError }, { data: userRecord, error: userError }] = await Promise.all([
      supabase
        .from('coach_profiles')
        .select(getCoachProfileSelect)
        .eq('coach_id', user.id)
        .maybeSingle(),
      supabase
        .from('coach_availability')
        .select('day_of_week, start_time, end_time, timezone, is_available')
        .eq('coach_id', user.id)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true }),
      supabase
        .from('users')
        .select('onboarding_status, onboarding_step, onboarding_completed_at, timezone')
        .eq('id', user.id)
        .maybeSingle(),
    ]);

    if (profileError) {
      logger.error('Failed to load coach profile:', profileError);
      return createErrorResponse('Failed to load coach profile data', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }

    if (availabilityError) {
      logger.error('Failed to load coach availability:', availabilityError);
      return createErrorResponse('Failed to load availability data', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }

    if (userError) {
      logger.error('Failed to load user onboarding status:', userError);
      return createErrorResponse('Failed to load onboarding status', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }

    const fallbackTimezone = userRecord?.timezone || 'UTC';
    const availabilitySlots = (availability || [])
      .filter((slot) => slot.is_available !== false)
      .map((slot) => ({
        dayOfWeek: slot.day_of_week ?? 0,
        startTime: typeof slot.start_time === 'string' ? slot.start_time.slice(0, 5) : '09:00',
        endTime: typeof slot.end_time === 'string' ? slot.end_time.slice(0, 5) : '17:00',
      }));

    return createSuccessResponse({
      profile: {
        title: profile?.title ?? '',
        bio: profile?.bio ?? '',
        experienceYears: typeof profile?.experience_years === 'number' ? profile.experience_years : 0,
        specialties: Array.isArray(profile?.specializations) ? profile?.specializations : [],
        credentials: Array.isArray(profile?.credentials) ? profile?.credentials : [],
        languages: Array.isArray(profile?.languages) ? profile?.languages : [],
        timezone: profile?.timezone ?? fallbackTimezone,
        hourlyRate: typeof profile?.hourly_rate === 'number'
          ? profile?.hourly_rate
          : typeof profile?.session_rate === 'number'
            ? profile.session_rate
            : 100,
        currency: profile?.currency ?? 'USD',
        approach: profile?.approach ?? '',
        location: profile?.location ?? '',
      },
      availability: availabilitySlots,
      onboarding: {
        status: (userRecord?.onboarding_status as 'pending' | 'in_progress' | 'completed' | undefined) ?? 'pending',
        step: userRecord?.onboarding_step ?? 5,
        completedAt: userRecord?.onboarding_completed_at ?? null,
      },
    });
  }
);

const updateCoachProfileHandler = requireCoach(
  async (user: AuthenticatedUser, request: NextRequest): Promise<NextResponse> => {
    const payload = await request.json();
    const validation = validateRequestBody(coachOnboardingFormSchema, payload, {
      sanitize: true,
      maxSize: 24 * 1024,
    });

    if (!validation.success) {
      return createErrorResponse(validation.error, HTTP_STATUS.BAD_REQUEST);
    }

    const sanitized = sanitizeCoachFormData(validation.data);
    const supabase = await createClient();

    const { data: existingProfile, error: existingProfileError } = await supabase
      .from('coach_profiles')
      .select('default_session_duration, booking_buffer_time')
      .eq('coach_id', user.id)
      .maybeSingle();

    if (existingProfileError) {
      logger.error('Failed to load existing coach profile:', existingProfileError);
      return createErrorResponse('Failed to load existing coach profile', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }

    const now = new Date().toISOString();

    const { error: profileError } = await supabase
      .from('coach_profiles')
      .upsert({
        coach_id: user.id,
        title: sanitized.title,
        bio: sanitized.bio,
        experience_years: sanitized.experienceYears,
        specializations: sanitized.specialties,
        credentials: sanitized.credentials,
        languages: sanitized.languages,
        timezone: sanitized.timezone,
        session_rate: sanitized.hourlyRate,
        hourly_rate: sanitized.hourlyRate,
        currency: sanitized.currency,
        location: sanitized.location,
        approach: sanitized.approach,
        onboarding_completed_at: now,
        updated_at: now,
        default_session_duration: existingProfile?.default_session_duration ?? 60,
        booking_buffer_time: existingProfile?.booking_buffer_time ?? 15,
      }, { onConflict: 'coach_id' });

    if (profileError) {
      logger.error('Failed to update coach profile:', profileError);
      return createErrorResponse('Failed to save coach profile', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }

    const { error: deleteAvailabilityError } = await supabase
      .from('coach_availability')
      .delete()
      .eq('coach_id', user.id);

    if (deleteAvailabilityError) {
      logger.error('Failed to reset coach availability:', deleteAvailabilityError);
      return createErrorResponse('Failed to reset availability', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }

    const availabilityRecords = sanitized.availability.map((slot) => ({
      coach_id: user.id,
      day_of_week: slot.dayOfWeek,
      start_time: normalizeTime(slot.startTime),
      end_time: normalizeTime(slot.endTime),
      timezone: sanitized.timezone,
      is_available: true,
      created_at: now,
      updated_at: now,
    }));

    if (availabilityRecords.length > 0) {
      const { error: insertAvailabilityError } = await supabase
        .from('coach_availability')
        .insert(availabilityRecords);

      if (insertAvailabilityError) {
        logger.error('Failed to save coach availability:', insertAvailabilityError);
        return createErrorResponse('Failed to save availability', HTTP_STATUS.INTERNAL_SERVER_ERROR);
      }
    }

    const onboardingStep = Math.max(sanitized.step ?? 5, 5);

    const { error: userUpdateError } = await supabase
      .from('users')
      .update({
        timezone: sanitized.timezone,
        onboarding_status: 'completed',
        onboarding_step: onboardingStep,
        onboarding_completed_at: now,
        updated_at: now,
      })
      .eq('id', user.id);

    if (userUpdateError) {
      logger.error('Failed to update user onboarding status:', userUpdateError);
      return createErrorResponse('Failed to update onboarding status', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }

    const { data: refreshedUser, error: refreshedUserError } = await supabase
      .from('users')
      .select('onboarding_status, onboarding_step, onboarding_completed_at, timezone')
      .eq('id', user.id)
      .maybeSingle();

    if (refreshedUserError) {
      logger.warn('Failed to fetch refreshed user after onboarding update:', refreshedUserError);
    }

    return createSuccessResponse(
      {
        user: {
          onboardingStatus: (refreshedUser?.onboarding_status as 'pending' | 'in_progress' | 'completed' | undefined) ?? 'completed',
          onboardingStep: refreshedUser?.onboarding_step ?? onboardingStep,
          onboardingCompletedAt: refreshedUser?.onboarding_completed_at ?? now,
          timezone: refreshedUser?.timezone ?? sanitized.timezone,
        },
      },
      'Coach onboarding updated successfully'
    );
  }
);

export const GET = withErrorHandling(
  withRequestLogging(
    rateLimitedCoachHandler(
      requireAuth(coachProfileHandler)
    ),
    { name: 'GET /api/onboarding/coach' }
  )
);

export const PUT = withErrorHandling(
  withRequestLogging(
    rateLimitedCoachHandler(
      requireAuth(updateCoachProfileHandler)
    ),
    { name: 'PUT /api/onboarding/coach' }
  )
);

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
      logger.error('Error creating/updating coach profile:', profileError);
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
        logger.warn('Error updating avatar URL:', avatarError);
        // Non-critical error, continue with onboarding
      }
    }

    // 3. Delete existing availability slots for this coach
    const { error: deleteError } = await supabase
      .from('coach_availability')
      .delete()
      .eq('coach_id', user.id);

    if (deleteError) {
      logger.error('Error deleting old availability slots:', deleteError);
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
      logger.error('Error creating availability slots:', availabilityError);
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
      logger.warn('Error updating user timezone:', userUpdateError);
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
      logger.error('Error fetching complete profile:', fetchError);
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
      logger.warn('Failed to log audit event:', auditError);
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
    logger.error('Unexpected error during coach onboarding:', error);
    return createErrorResponse(
      'An unexpected error occurred while processing your onboarding. Please try again.',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
}

const coachOnboardingHandler = requireCoach(handleCoachOnboarding) as (
  user: AuthenticatedUser,
  request: NextRequest
) => Promise<NextResponse>;

// Apply middleware: error handling -> logging -> rate limiting -> auth -> role check -> handler
export const POST = withErrorHandling(
  withRequestLogging(
    rateLimit(5, 60000)( // 5 requests per minute
      requireAuth(coachOnboardingHandler)
    ),
    { name: 'POST /api/onboarding/coach' }
  )
);
