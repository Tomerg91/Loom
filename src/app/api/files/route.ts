import { NextRequest, NextResponse } from 'next/server';

import { createAuthService } from '@/lib/auth/auth';
import { fileManagementService } from '@/lib/services/file-management-service';

/**
 * GET /api/files - Get files with filtering and pagination
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
    const url = new URL(request.url);
    
    // Parse query parameters
    const searchParams = {
      query: url.searchParams.get('query') || undefined,
      fileTypes: url.searchParams.get('fileTypes')?.split(',') || undefined,
      fileCategory: (url.searchParams.get('fileCategory') as any) || undefined,
      sessionId: url.searchParams.get('sessionId') || undefined,
      tags: url.searchParams.get('tags')?.split(',') || undefined,
      ownerId: url.searchParams.get('ownerId') || undefined,
      sharedWithMe: url.searchParams.get('sharedWithMe') === 'true',
      limit: parseInt(url.searchParams.get('limit') || '50'),
      offset: parseInt(url.searchParams.get('offset') || '0'),
      sortBy: (url.searchParams.get('sortBy') as any) || 'created_at',
      sortOrder: (url.searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
    };

    // If no ownerId specified, default to current user
    if (!searchParams.ownerId && !searchParams.sharedWithMe) {
      searchParams.ownerId = userId;
    }

    const result = await fileManagementService.getFiles(searchParams);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('GET /api/files error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/files - Upload a new file
 */
export async function POST(request: NextRequest) {
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
    
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Parse options
    const options = {
      sessionId: formData.get('sessionId') as string || undefined,
      description: formData.get('description') as string || undefined,
      tags: formData.get('tags') ? (formData.get('tags') as string).split(',') : undefined,
      fileCategory: (formData.get('fileCategory') as any) || 'document',
    };

    const result = await fileManagementService.uploadFile(file, userId, options);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    console.error('POST /api/files error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
