import { NextRequest, NextResponse } from 'next/server';
import {
  createSuccessResponse,
  createErrorResponse,
  withErrorHandling,
  requireAuth,
  handlePreflight,
  HTTP_STATUS,
  type AuthenticatedUser
} from '@/lib/api/utils';
import { rateLimit } from '@/lib/security/rate-limit';
import { createMfaService } from '@/lib/services/mfa-service';

// GET /api/auth/mfa-status - Get user's MFA status (server-side only)
export const GET = withErrorHandling(
  rateLimit(60, 60000)( // 60 requests per minute
    requireAuth(async (user: AuthenticatedUser, request: NextRequest) => {
      try {
        const mfaService = createMfaService(true); // Server-side service
        
        // Get MFA status from database (not from client-side data)
        const mfaStatus = await mfaService.getMFAStatus(user.id);
        
        // Check for MFA session from HTTP-only cookies (server-side only)
        const mfaSessionCookie = request.cookies.get('mfa_session')?.value;
        let mfaSessionValid = false;
        let mfaVerified = false;
        
        if (mfaSessionCookie) {
          try {
            const { session } = await mfaService.validateMfaSession(mfaSessionCookie);
            mfaSessionValid = !!session;
            mfaVerified = session?.mfaVerified || false;
          } catch (error) {
            // Invalid MFA session - ignore and continue
            console.warn('Invalid MFA session cookie:', error);
          }
        }
        
        return createSuccessResponse({
          mfaStatus: {
            isEnabled: mfaStatus.isEnabled,
            isSetup: mfaStatus.isSetup,
            backupCodesRemaining: mfaStatus.backupCodesRemaining,
          },
          isMfaSession: mfaSessionValid,
          mfaVerified: mfaVerified,
          mfaRequired: mfaStatus.isEnabled
        });
      } catch (error) {
        console.error('Error fetching MFA status:', error);
        return createErrorResponse(
          'Failed to fetch MFA status',
          HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
      }
    })
  )
);

// OPTIONS /api/auth/mfa-status - Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handlePreflight(request);
}