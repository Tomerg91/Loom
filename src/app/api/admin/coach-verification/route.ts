import { NextRequest } from 'next/server';
import { z } from 'zod';

import {
  createErrorResponse,
  createSuccessResponse,
  HTTP_STATUS,
  requireAdmin,
  validateRequestBody,
  withErrorHandling,
} from '@/lib/api/utils';
import { createAdminClient } from '@/lib/supabase/server';
import { enhancedEmailService } from '@/lib/notifications/enhanced-email-service';

const reviewSchema = z.object({
  coachId: z.string().uuid(),
  action: z.enum(['approve', 'reject']),
  reason: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
});

/**
 * GET /api/admin/coach-verification
 *
 * Get list of coach applications pending verification
 */
export const GET = withErrorHandling(
  requireAdmin(async () => {
    const admin = createAdminClient();

    const { data: pendingCoaches, error } = await admin
      .from('users')
      .select(`
        id,
        email,
        first_name,
        last_name,
        created_at,
        onboarding_status,
        onboarding_completed_at,
        onboarding_data,
        coach_profiles (
          title,
          bio,
          experience_years,
          specializations,
          credentials,
          languages,
          hourly_rate,
          currency,
          verification_status,
          verification_notes,
          verified_at,
          verified_by
        )
      `)
      .eq('role', 'coach')
      .or('onboarding_status.eq.completed,onboarding_status.eq.in_progress')
      .order('onboarding_completed_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch pending coaches:', error);
      return createErrorResponse(
        'Failed to fetch coach applications',
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }

    // Filter for coaches that need verification
    const needsVerification = (pendingCoaches || []).filter(coach => {
      const profile = Array.isArray(coach.coach_profiles)
        ? coach.coach_profiles[0]
        : coach.coach_profiles;

      return profile && (
        !profile.verification_status ||
        profile.verification_status === 'pending'
      );
    });

    return createSuccessResponse({
      coaches: needsVerification,
      total: needsVerification.length,
    });
  })
);

/**
 * POST /api/admin/coach-verification
 *
 * Approve or reject a coach application
 */
export const POST = withErrorHandling(
  requireAdmin(async (user, request: NextRequest) => {
    const payload = await request.json();
    const validation = validateRequestBody(reviewSchema, payload);

    if (!validation.success) {
      return createErrorResponse(validation.error, HTTP_STATUS.BAD_REQUEST);
    }

    const { coachId, action, reason, notes } = validation.data;
    const admin = createAdminClient();

    // Get coach details
    const { data: coach, error: coachError } = await admin
      .from('users')
      .select('id, email, first_name, last_name, role')
      .eq('id', coachId)
      .single();

    if (coachError || !coach) {
      return createErrorResponse('Coach not found', HTTP_STATUS.NOT_FOUND);
    }

    if (coach.role !== 'coach') {
      return createErrorResponse('User is not a coach', HTTP_STATUS.BAD_REQUEST);
    }

    const now = new Date().toISOString();

    if (action === 'approve') {
      // Update coach profile verification status
      const { error: updateError } = await admin
        .from('coach_profiles')
        .update({
          verification_status: 'approved',
          verified_at: now,
          verified_by: user.id,
          verification_notes: notes,
        })
        .eq('coach_id', coachId);

      if (updateError) {
        console.error('Failed to approve coach:', updateError);
        return createErrorResponse(
          'Failed to approve coach application',
          HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
      }

      // Send approval email
      await enhancedEmailService.sendWithRetry(
        coach.email,
        'coach_approved',
        {
          recipientName: coach.first_name || coach.email,
          coachName: `${coach.first_name} ${coach.last_name}`.trim() || coach.email,
        },
        { priority: 'high' }
      );

      return createSuccessResponse(
        { coachId, status: 'approved' },
        'Coach application approved successfully'
      );
    } else {
      // Reject application
      const { error: updateError } = await admin
        .from('coach_profiles')
        .update({
          verification_status: 'rejected',
          verified_at: now,
          verified_by: user.id,
          verification_notes: notes || reason,
        })
        .eq('coach_id', coachId);

      if (updateError) {
        console.error('Failed to reject coach:', updateError);
        return createErrorResponse(
          'Failed to reject coach application',
          HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
      }

      // Send rejection email
      await enhancedEmailService.sendWithRetry(
        coach.email,
        'coach_rejected',
        {
          recipientName: coach.first_name || coach.email,
          coachName: `${coach.first_name} ${coach.last_name}`.trim() || coach.email,
          reason: reason || 'Your application did not meet our current requirements.',
          notes: notes,
        },
        { priority: 'high' }
      );

      return createSuccessResponse(
        { coachId, status: 'rejected' },
        'Coach application rejected'
      );
    }
  })
);
