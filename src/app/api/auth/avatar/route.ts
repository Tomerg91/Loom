import { NextRequest } from 'next/server';

import { ApiError } from '@/lib/api/errors';
import { ApiResponseHelper } from '@/lib/api/types';
import { config } from '@/lib/config';
import { authService } from '@/lib/services/auth-service';
import { fileService } from '@/lib/services/file-service';

export async function POST(request: NextRequest): Promise<Response> {
  try {
    // Get current user session
    const session = await authService.getSession();
    if (!session?.user) {
      return ApiResponseHelper.unauthorized('Authentication required');
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('avatar') as File;

    if (!file) {
      return ApiResponseHelper.badRequest('No file provided');
    }

    // Validate file
    const validation = fileService.validateFile(file, {
      maxSize: config.file.AVATAR_MAX_SIZE,
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    });

    if (!validation.isValid) {
      return ApiResponseHelper.badRequest(validation.error || 'Invalid file');
    }

    // Upload file
    const uploadResult = await fileService.uploadFile(file, {
      directory: 'avatars',
      userId: session.user.id,
      resize: {
        width: 256,
        height: 256,
        format: 'webp',
      },
    });

    if (!uploadResult.success) {
      throw new ApiError('UPLOAD_FAILED', uploadResult.error || 'Failed to upload file');
    }

    // Update user avatar URL
    const updatedUser = await authService.updateUser(session.user.id, {
      avatarUrl: uploadResult.url,
    });

    return ApiResponseHelper.success({
      message: 'Avatar uploaded successfully',
      user: updatedUser,
      avatarUrl: uploadResult.url,
    });

  } catch (error) {
    console.error('Avatar upload error:', error);
    
    if (error instanceof ApiError) {
      return ApiResponseHelper.error(error.code, error.message);
    }
    
    return ApiResponseHelper.internalError('Failed to upload avatar');
  }
}

export async function DELETE(_request: NextRequest): Promise<Response> {
  try {
    // Get current user session
    const session = await authService.getSession();
    if (!session?.user) {
      return ApiResponseHelper.unauthorized('Authentication required');
    }

    const user = session.user;

    // Delete existing avatar file if it exists
    if (user.avatarUrl) {
      try {
        await fileService.deleteFile(user.avatarUrl);
      } catch (error) {
        console.warn('Failed to delete previous avatar file:', error);
        // Continue with database update even if file deletion fails
      }
    }

    // Update user to remove avatar URL
    const updatedUser = await authService.updateUser(user.id, {
      avatarUrl: null,
    });

    return ApiResponseHelper.success({
      message: 'Avatar removed successfully',
      user: updatedUser,
    });

  } catch (error) {
    console.error('Avatar removal error:', error);
    
    if (error instanceof ApiError) {
      return ApiResponseHelper.error(error.code, error.message);
    }
    
    return ApiResponseHelper.internalError('Failed to remove avatar');
  }
}