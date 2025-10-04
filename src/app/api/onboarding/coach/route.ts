import { NextRequest } from 'next/server';
import { z } from 'zod';

import { createAuthService } from '@/lib/auth/auth';
import { createAdminClient } from '@/lib/supabase/server';
import {
  createErrorResponse,
  createSuccessResponse,
  HTTP_STATUS,
  rateLimit,
  validateRequestBody,
  withErrorHandling,
} from '@/lib/api/utils';

const availabilitySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});

const coachOnboardingSchema = z.object({
  step: z.number().int().min(1).max(5),
  title: z.string().min(2).max(120).optional(),
  bio: z.string().min(20).max(1200),
  experienceYears: z.number().int().min(0).max(60),
  specialties: z.array(z.string().min(2).max(80)).min(1).max(12),
  credentials: z.array(z.string().min(2).max(120)).max(10).optional(),
  languages: z.array(z.string().min(2).max(32)).min(1).max(5),
  timezone: z.string().min(2).max(64),
  hourlyRate: z.number().min(0).max(2000),
  currency: z.string().min(3).max(3),
  approach: z.string().min(20).max(1200),
  location: z.string().min(2).max(120),
  availability: z.array(availabilitySchema).min(1).max(21),
});

const rateLimitedHandler = rateLimit(10, 60_000);

export const GET = withErrorHandling(async () => {
  const authService = await createAuthService(true);
  const user = await authService.getCurrentUser();

  if (!user) {
    return createErrorResponse('Not authenticated', HTTP_STATUS.UNAUTHORIZED);
  }

  if (user.role !== 'coach') {
    return createErrorResponse('Coach access required', HTTP_STATUS.FORBIDDEN);
  }

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from('coach_profiles')
    .select(
      'title, bio, experience_years, specialties, credentials, languages, timezone, hourly_rate, currency, approach, location'
    )
    .eq('coach_id', user.id)
    .maybeSingle();

  const { data: availabilityRows } = await admin
    .from('coach_availability')
    .select('day_of_week, start_time, end_time, is_available')
    .eq('coach_id', user.id)
    .order('day_of_week', { ascending: true });

  const availability = (availabilityRows || [])
    .filter((row: any) => row.is_available !== false)
    .map((row: any) => ({
      dayOfWeek: Number(row.day_of_week) || 0,
      startTime: typeof row.start_time === 'string' ? row.start_time.slice(0, 5) : '09:00',
      endTime: typeof row.end_time === 'string' ? row.end_time.slice(0, 5) : '17:00',
    }));

  return createSuccessResponse({
    profile: {
      title: profile?.title ?? 'Professional Coach',
      bio: profile?.bio ?? '',
      experienceYears: profile?.experience_years ?? 0,
      specialties: Array.isArray(profile?.specialties) ? profile?.specialties : [],
      credentials: Array.isArray(profile?.credentials) ? profile.credentials : [],
      languages: Array.isArray(profile?.languages) && profile.languages.length > 0
        ? profile.languages
        : [user.language],
      timezone: profile?.timezone ?? user.timezone ?? 'UTC',
      hourlyRate: typeof profile?.hourly_rate === 'number' ? Number(profile.hourly_rate) : 100,
      currency: profile?.currency ?? 'USD',
      approach: profile?.approach ?? '',
      location: profile?.location ?? '',
    },
    availability,
    onboarding: {
      status: user.onboardingStatus ?? 'pending',
      step: user.onboardingStep ?? 0,
      completedAt: user.onboardingCompletedAt ?? null,
    },
  });
});

export const PUT = withErrorHandling(
  rateLimitedHandler(async (request: NextRequest) => {
    const authService = await createAuthService(true);
    const user = await authService.getCurrentUser();

    if (!user) {
      return createErrorResponse('Not authenticated', HTTP_STATUS.UNAUTHORIZED);
    }

    if (user.role !== 'coach') {
      return createErrorResponse('Coach access required', HTTP_STATUS.FORBIDDEN);
    }

    const payload = await request.json();
    const validation = validateRequestBody(coachOnboardingSchema, payload, {
      sanitize: true,
      maxSize: 16 * 1024,
    });

    if (!validation.success) {
      return createErrorResponse(validation.error, HTTP_STATUS.BAD_REQUEST);
    }

    const data = validation.data;
    const admin = createAdminClient();

    const availability = data.availability.map((slot) => ({
      coach_id: user.id,
      day_of_week: slot.dayOfWeek,
      start_time: slot.startTime,
      end_time: slot.endTime,
      is_available: true,
      timezone: data.timezone,
    }));

    const { error: profileError } = await admin.from('coach_profiles').upsert(
      {
        coach_id: user.id,
        title: data.title ?? 'Professional Coach',
        bio: data.bio,
        experience_years: data.experienceYears,
        specialties: data.specialties,
        credentials: data.credentials ?? [],
        languages: data.languages,
        timezone: data.timezone,
        hourly_rate: data.hourlyRate,
        currency: data.currency,
        approach: data.approach,
        location: data.location,
      },
      { onConflict: 'coach_id' }
    );

    if (profileError) {
      return createErrorResponse('Failed to update coach profile', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }

    await admin.from('coach_availability').delete().eq('coach_id', user.id);

    if (availability.length > 0) {
      const { error: availabilityError } = await admin.from('coach_availability').insert(availability);
      if (availabilityError) {
        return createErrorResponse('Failed to update availability', HTTP_STATUS.INTERNAL_SERVER_ERROR);
      }
    }

    const completedAt = new Date().toISOString();
    const nextStep = Math.max(data.step ?? 5, 5);

    const existingOnboardingData =
      (user.onboardingData as Record<string, unknown> | null | undefined) ?? {};

    const updatedOnboardingData = {
      ...existingOnboardingData,
      coach: {
        title: data.title ?? 'Professional Coach',
        bio: data.bio,
        experienceYears: data.experienceYears,
        specialties: data.specialties,
        credentials: data.credentials ?? [],
        languages: data.languages,
        timezone: data.timezone,
        hourlyRate: data.hourlyRate,
        currency: data.currency,
        approach: data.approach,
        location: data.location,
        availability: data.availability,
      },
    };

    const { error: userUpdateError } = await admin
      .from('users')
      .update({
        timezone: data.timezone,
        onboarding_status: 'completed',
        onboarding_step: nextStep,
        onboarding_completed_at: completedAt,
        onboarding_data: updatedOnboardingData,
      })
      .eq('id', user.id);

    if (userUpdateError) {
      return createErrorResponse('Failed to finalize onboarding', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }

    const refreshedUser = await authService.getCurrentUser({ forceRefresh: true });

    return createSuccessResponse(
      {
        user: {
          onboardingStatus: (refreshedUser?.onboardingStatus ?? 'completed') as const,
          onboardingStep: refreshedUser?.onboardingStep ?? nextStep,
          onboardingCompletedAt: refreshedUser?.onboardingCompletedAt ?? completedAt,
          timezone: refreshedUser?.timezone ?? data.timezone,
          onboardingData: refreshedUser?.onboardingData ?? updatedOnboardingData,
        },
      },
      'Coach onboarding completed successfully'
    );
  })
);
