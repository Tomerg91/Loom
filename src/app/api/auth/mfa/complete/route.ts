import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  createErrorResponse,
  createSuccessResponse,
  HTTP_STATUS,
  rateLimit,
  validateRequestBody,
  withErrorHandling,
  withRequestLogging,
} from '@/lib/api/utils';
import { createAuthService } from '@/lib/auth/auth';
import { createCorsResponse, applyCorsHeaders } from '@/lib/security/cors';
import { createServerClientWithRequest } from '@/lib/supabase/server';

const mfaCompletionSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  rememberDevice: z.boolean().optional(),
  rememberMe: z.boolean().optional(),
});

const rateLimitedHandler = rateLimit(20, 60000, {
  blockDuration: 15 * 60 * 1000,
  enableSuspiciousActivityDetection: true,
  skipSuccessfulRequests: true,
});

const forwardSupabaseCookies = (
  source: NextResponse,
  target: NextResponse
): void => {
  source.cookies.getAll().forEach(cookie => {
    target.cookies.set({
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      expires: cookie.expires,
      httpOnly: cookie.httpOnly,
      maxAge: cookie.maxAge,
      sameSite: cookie.sameSite,
      secure: cookie.secure,
      priority: cookie.priority,
    });
  });
};

export const POST = withErrorHandling(
  withRequestLogging(
    rateLimitedHandler(async (request: NextRequest) => {
      const supabaseResponse = NextResponse.next();
      const supabase = createServerClientWithRequest(request, supabaseResponse);

      let body: unknown;
      try {
        body = await request.json();
      } catch (_error) {
        body = {};
      }

      const validation = validateRequestBody(mfaCompletionSchema, body, {
        sanitize: true,
        maxDepth: 3,
        maxSize: 2 * 1024,
      });

      if (!validation.success) {
        console.warn('Invalid MFA completion request:', {
          ip: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent'),
          validationErrors: validation.error.details,
        });

        return createErrorResponse(
          validation.error.message,
          HTTP_STATUS.BAD_REQUEST
        );
      }

      const { userId } = validation.data;

      const { data: sessionResult, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) {
        console.warn('Failed to read Supabase session before MFA completion:', {
          userId,
          error: sessionError.message,
        });
      }

      if (!sessionResult?.session) {
        console.warn('MFA completion attempted without active session', {
          userId,
          ip: request.headers.get('x-forwarded-for') || 'unknown',
        });

        return createErrorResponse(
          'Authentication session not found',
          HTTP_STATUS.UNAUTHORIZED
        );
      }

      let activeSession = sessionResult.session;

      const { data: refreshedSession, error: refreshError } =
        await supabase.auth.refreshSession();

      if (refreshError) {
        console.warn('Failed to refresh Supabase session after MFA verification:', {
          userId,
          error: refreshError.message,
        });
      }

      if (refreshedSession?.session) {
        activeSession = refreshedSession.session;
      }

      const authService = createAuthService({
        isServer: true,
        supabaseClient: supabase,
      });
      const currentUser = await authService.getCurrentUser({
        forceRefresh: true,
      });

      if (!currentUser || currentUser.id !== userId) {
        console.error('User mismatch detected during MFA completion:', {
          expectedUserId: userId,
          actualUserId: currentUser?.id,
        });

        return createErrorResponse(
          'Authentication error occurred',
          HTTP_STATUS.UNAUTHORIZED
        );
      }

      const sanitizedUser = {
        id: currentUser.id,
        email: currentUser.email,
        role: currentUser.role,
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        avatarUrl: currentUser.avatarUrl,
        language: currentUser.language,
        status: currentUser.status,
        lastSeenAt: currentUser.lastSeenAt,
        onboardingStatus: currentUser.onboardingStatus,
        onboardingStep: currentUser.onboardingStep,
        onboardingCompletedAt: currentUser.onboardingCompletedAt,
        mfaEnabled: currentUser.mfaEnabled ?? true,
      } as const;

      let backupCodesRemaining: number | undefined;
      const warnings: string[] = [];

      try {
        const { createMfaService } = await import('@/lib/services/mfa-service');
        const mfaService = createMfaService(true);
        const status = await mfaService.getMFAStatus(userId);

        if (status) {
          backupCodesRemaining = status.backupCodesRemaining;

          if (status.backupCodesRemaining === 0) {
            warnings.push(
              'This was your last backup code. Generate new backup codes immediately.'
            );
          } else if (
            status.backupCodesRemaining > 0 &&
            status.backupCodesRemaining <= 2
          ) {
            warnings.push(
              `You have only ${status.backupCodesRemaining} backup codes remaining. Consider generating new ones.`
            );
          }
        }
      } catch (error) {
        console.warn('Failed to load MFA status after verification:', {
          userId,
          error: error instanceof Error ? error.message : 'unknown error',
        });
      }

      const sessionPayload =
        activeSession?.access_token && activeSession?.refresh_token
          ? {
              accessToken: activeSession.access_token,
              refreshToken: activeSession.refresh_token,
              expiresAt: activeSession.expires_at ?? null,
            }
          : null;

      if (!sessionPayload) {
        console.warn('MFA completion succeeded but session tokens were not available', {
          userId,
        });
      }

      const response = createSuccessResponse(
        {
          user: sanitizedUser,
          session: sessionPayload,
          mfa: {
            backupCodesRemaining,
            warnings: warnings.length > 0 ? warnings : undefined,
          },
          message: 'MFA verification complete',
        },
        'MFA session refreshed'
      );

      forwardSupabaseCookies(supabaseResponse, response);

      response.cookies.set({
        name: 'mfa_pending',
        value: '',
        path: '/',
        expires: new Date(0),
        httpOnly: false,
        sameSite: 'strict',
        secure: true,
      });

      return applyCorsHeaders(response, request);
    }),
    { name: 'auth:mfa-complete' }
  )
);

export function OPTIONS(request: NextRequest) {
  return createCorsResponse(request);
}
