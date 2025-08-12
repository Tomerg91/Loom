import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/services/auth-service';
import { getMfaEnforcementSettings, saveMfaEnforcementSettings } from '@/lib/database/mfa-admin';
import { ApiResponseHelper } from '@/lib/api/types';
import { ApiError } from '@/lib/api/errors';
import { rateLimit } from '@/lib/security/rate-limit';
import { z } from 'zod';

const mfaSettingsSchema = z.object({
  globalRequirement: z.enum(['disabled', 'optional', 'required', 'required_new_users']),
  roleRequirements: z.object({
    admin: z.enum(['optional', 'required']),
    coach: z.enum(['optional', 'required']),
    client: z.enum(['optional', 'required']),
  }),
  gracePeriodDays: z.number().min(0).max(365),
  backupCodesRequired: z.boolean(),
  trustedDeviceExpiry: z.number().min(1).max(365),
});

// Apply rate limiting for MFA settings operations
const getHandler = rateLimit(20, 60000)( // 20 requests per minute for getting settings
  async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Verify admin access
      const session = await authService.getSession();
      if (!session?.user || session.user.role !== 'admin') {
        return ApiResponseHelper.forbidden('Admin access required for MFA settings');
      }

      // Fetch MFA enforcement settings
      const result = await getMfaEnforcementSettings();
      if (!result.success) {
        return ApiResponseHelper.internalError(result.error || 'Failed to fetch MFA settings');
      }

      return ApiResponseHelper.success(result.data);

    } catch (error) {
      console.error('Get MFA settings API error:', error);
      
      if (error instanceof ApiError) {
        return ApiResponseHelper.error(error.code, error.message);
      }
      
      return ApiResponseHelper.internalError('Failed to fetch MFA settings');
    }
  }
);

const postHandler = rateLimit(10, 60000)( // 10 requests per minute for updating settings
  async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Verify admin access
      const session = await authService.getSession();
      if (!session?.user || session.user.role !== 'admin') {
        return ApiResponseHelper.forbidden('Admin access required for MFA settings');
      }

      // Parse and validate request body
      const body = await request.json();
      const validation = mfaSettingsSchema.safeParse(body);
      if (!validation.success) {
        return ApiResponseHelper.badRequest(
          'Invalid MFA settings data',
          validation.error.issues
        );
      }

      const settings = validation.data;
      const adminUserId = session.user.id;

      // Save MFA enforcement settings
      const result = await saveMfaEnforcementSettings(settings, adminUserId);
      if (!result.success) {
        return ApiResponseHelper.internalError(result.error || 'Failed to save MFA settings');
      }

      return ApiResponseHelper.success(
        { 
          message: 'MFA settings updated successfully',
          settings,
          updatedBy: adminUserId,
          timestamp: new Date().toISOString()
        },
        200
      );

    } catch (error) {
      console.error('Save MFA settings API error:', error);
      
      if (error instanceof ApiError) {
        return ApiResponseHelper.error(error.code, error.message);
      }

      // Handle JSON parsing errors
      if (error instanceof SyntaxError) {
        return ApiResponseHelper.badRequest('Invalid JSON in request body');
      }
      
      return ApiResponseHelper.internalError('Failed to save MFA settings');
    }
  }
);

export async function GET(request: NextRequest): Promise<Response> {
  return getHandler(request);
}

export async function POST(request: NextRequest): Promise<Response> {
  return postHandler(request);
}

// Also support PUT for consistency with RESTful conventions
export async function PUT(request: NextRequest): Promise<Response> {
  return postHandler(request);
}