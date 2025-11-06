import { NextRequest } from 'next/server';

import { ApiError } from '@/lib/api/errors';
import { ApiResponseHelper } from '@/lib/api/types';
import { adminSystemService } from '@/lib/database/admin-system';
import { authService } from '@/lib/services/auth-service';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest): Promise<Response> {
  try {
    // Verify admin access
    const session = await authService.getSession();
    if (!session?.user || session.user.role !== 'admin') {
      return ApiResponseHelper.forbidden('Admin access required');
    }

    // Get system settings
    const systemSettings = await adminSystemService.getSystemSettings();

    return ApiResponseHelper.success(systemSettings);

  } catch (error) {
    logger.error('System settings API error:', error);
    
    if (error instanceof ApiError) {
      return ApiResponseHelper.error(error.code, error.message);
    }
    
    return ApiResponseHelper.internalError('Failed to fetch system settings');
  }
}

export async function PUT(request: NextRequest): Promise<Response> {
  try {
    // Verify admin access
    const session = await authService.getSession();
    if (!session?.user || session.user.role !== 'admin') {
      return ApiResponseHelper.forbidden('Admin access required');
    }

    // Parse request body
    const updates = await request.json();

    // Update system settings
    const updatedSettings = await adminSystemService.updateSystemSettings(updates);

    return ApiResponseHelper.success(updatedSettings);

  } catch (error) {
    logger.error('System settings update API error:', error);
    
    if (error instanceof ApiError) {
      return ApiResponseHelper.error(error.code, error.message);
    }
    
    return ApiResponseHelper.internalError('Failed to update system settings');
  }
}