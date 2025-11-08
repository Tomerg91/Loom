import { NextRequest, NextResponse } from 'next/server';

import { createAuthService } from '@/lib/auth/auth';
import { fileManagementService } from '@/lib/services/file-management-service';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/files/[id] - Get a specific file
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: fileId } = await params;
    
    // Authenticate user
    const authService = createAuthService(true);
    const user = await authService.getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = user.id;

    const result = await fileManagementService.getFile(fileId, userId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error.includes('not found') ? 404 : 403 }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error(`GET /api/files/[id] error:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/files/[id] - Update file metadata
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: fileId } = await params;
    
    // Authenticate user
    const authService = createAuthService(true);
    const user = await authService.getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = user.id;
    
    const updateData = await request.json();

    // Validate allowed fields
    const allowedFields = ['filename', 'description', 'tags', 'file_category'];
    const filteredUpdates = Object.keys(updateData)
      .filter(key => allowedFields.includes(key))
      .reduce((obj: unknown, key) => {
        obj[key] = updateData[key];
        return obj;
      }, {});

    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const result = await fileManagementService.updateFile(fileId, userId, filteredUpdates);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error.includes('not found') ? 404 : 403 }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error(`PATCH /api/files/[id] error:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/files/[id] - Delete a file
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: fileId } = await params;
    
    // Authenticate user
    const authService = createAuthService(true);
    const user = await authService.getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = user.id;

    const result = await fileManagementService.deleteFile(fileId, userId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error.includes('not found') ? 404 : 403 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`DELETE /api/files/[id] error:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
