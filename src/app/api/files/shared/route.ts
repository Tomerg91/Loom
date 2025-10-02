import { NextRequest, NextResponse } from 'next/server';
import { fileManagementService } from '@/lib/services/file-management-service';
import { createAuthService } from '@/lib/auth/auth';

/**
 * GET /api/files/shared - Get files shared with the current user
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authService = await createAuthService(true);
    const user = await authService.getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = user.id;

    const result = await fileManagementService.getSharedFiles(userId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('GET /api/files/shared error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
