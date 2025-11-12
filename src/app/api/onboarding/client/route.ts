import { NextRequest } from 'next/server';
import { z } from 'zod';

import {
  createErrorResponse,
  createSuccessResponse,
  HTTP_STATUS,
  rateLimit,
  validateRequestBody,
  withErrorHandling,
} from '@/lib/api/utils';
import { createAuthService } from '@/lib/auth/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { trackOnboardingCompleted, trackOnboardingProgress } from '@/lib/monitoring/event-tracking';

const clientOnboardingSchema = z.object({
  step: z.number().int().min(1).max(3),
  goals: z.array(z.string().min(2).max(120)).min(1).max(10),
  focusAreas: z.array(z.string().min(2).max(120)).min(1).max(10),
  supportPreferences: z.array(z.string().min(2).max(120)).max(10).optional(),
  preferredCommunication: z.enum(['video', 'phone', 'in_person', 'hybrid']),
  sessionFrequency: z.enum(['weekly', 'biweekly', 'monthly', 'flexible']),
  timezone: z.string().min(2).max(64).optional(),
  notes: z.string().max(1200).optional(),
});

const rateLimitedHandler = rateLimit(10, 60_000);

export const GET = withErrorHandling(async () => {
  const authService = createAuthService(true);
  const user = await authService.getCurrentUser();

  if (!user) {
    return createErrorResponse('Not authenticated', HTTP_STATUS.UNAUTHORIZED);
  }

  if (user.role !== 'client') {
    return createErrorResponse('Client access required', HTTP_STATUS.FORBIDDEN);
  }

  const onboardingData = (user.onboardingData as Record<string, unknown> | undefined) ?? {};
  const clientData = (onboardingData.client as Record<string, unknown> | undefined) ?? {};

  return createSuccessResponse({
    preferences: {
      goals: Array.isArray(clientData.goals) ? (clientData.goals as string[]) : [],
      focusAreas: Array.isArray(clientData.focusAreas) ? (clientData.focusAreas as string[]) : [],
      supportPreferences: Array.isArray(clientData.supportPreferences)
        ? (clientData.supportPreferences as string[])
        : [],
      preferredCommunication:
        typeof clientData.preferredCommunication === 'string'
          ? (clientData.preferredCommunication as string)
          : 'video',
      sessionFrequency:
        typeof clientData.sessionFrequency === 'string'
          ? (clientData.sessionFrequency as string)
          : 'weekly',
      timezone:
        typeof clientData.timezone === 'string'
          ? (clientData.timezone as string)
          : user.timezone ?? 'UTC',
      notes: typeof clientData.notes === 'string' ? (clientData.notes as string) : '',
    },
    onboarding: {
      status: user.onboardingStatus ?? 'pending',
      step: user.onboardingStep ?? 0,
      completedAt: user.onboardingCompletedAt ?? null,
    },
  });
});

export const PUT = withErrorHandling(
  rateLimitedHandler(async (request: NextRequest) => {
    const authService = createAuthService(true);
    const user = await authService.getCurrentUser();

    if (!user) {
      return createErrorResponse('Not authenticated', HTTP_STATUS.UNAUTHORIZED);
    }

    if (user.role !== 'client') {
      return createErrorResponse('Client access required', HTTP_STATUS.FORBIDDEN);
    }

    const payload = await request.json();
    const validation = validateRequestBody(clientOnboardingSchema, payload, {
      sanitize: true,
      maxSize: 12 * 1024,
    });

    if (!validation.success) {
      return createErrorResponse(validation.error, HTTP_STATUS.BAD_REQUEST);
    }

    const data = validation.data;
    const admin = createAdminClient();

    const existingData = (user.onboardingData as Record<string, unknown> | undefined) ?? {};

    const updatedOnboardingData = {
      ...existingData,
      client: {
        goals: data.goals,
        focusAreas: data.focusAreas,
        supportPreferences: data.supportPreferences ?? [],
        preferredCommunication: data.preferredCommunication,
        sessionFrequency: data.sessionFrequency,
        timezone: data.timezone ?? user.timezone ?? 'UTC',
        notes: data.notes ?? '',
      },
    };

    const completedAt = new Date().toISOString();
    const nextStep = Math.max(data.step ?? 3, 3);

    const { error: userUpdateError } = await admin
      .from('users')
      .update({
        timezone: data.timezone ?? user.timezone ?? 'UTC',
        onboarding_status: 'completed',
        onboarding_step: nextStep,
        onboarding_completed_at: completedAt,
        onboarding_data: updatedOnboardingData,
      })
      .eq('id', user.id);

    if (userUpdateError) {
      return createErrorResponse('Failed to save onboarding preferences', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }

    // Track onboarding progress and completion
    await trackOnboardingProgress(user.id, 'preferences_completed', {
      goals: data.goals.length,
      focusAreas: data.focusAreas.length,
      preferredCommunication: data.preferredCommunication,
      sessionFrequency: data.sessionFrequency,
    });

    await trackOnboardingCompleted(user.id, 'client', {
      totalSteps: nextStep,
      completionTime: completedAt,
    });

    const refreshedUser = await authService.getCurrentUser({ forceRefresh: true });

    return createSuccessResponse(
      {
        user: {
          onboardingStatus: (refreshedUser?.onboardingStatus ?? 'completed') as
            | 'pending'
            | 'in_progress'
            | 'completed',
          onboardingStep: refreshedUser?.onboardingStep ?? nextStep,
          onboardingCompletedAt: refreshedUser?.onboardingCompletedAt ?? completedAt,
          timezone: refreshedUser?.timezone ?? data.timezone ?? user.timezone ?? 'UTC',
          onboardingData: refreshedUser?.onboardingData ?? updatedOnboardingData,
        },
      },
      'Client onboarding completed successfully'
    );
  })
);
