import { NextRequest, NextResponse } from 'next/server';
import { fileManagementService } from '@/lib/services/file-management-service';
import { createAuthService } from '@/lib/auth/auth';

/**
 * GET /api/folders - Get folder structure and contents
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
    const folderId = url.searchParams.get('folderId') || null;

    const result = await fileManagementService.getFolderContents(folderId, userId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('GET /api/folders error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/folders - Create a new folder
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
    const { name, parentFolderId, description } = await request.json();

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Folder name is required' },
        { status: 400 }
      );
    }

    const result = await fileManagementService.createFolder(
      name.trim(),
      userId,
      parentFolderId || undefined,
      description || undefined
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    console.error('POST /api/folders error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
