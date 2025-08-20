import { NextRequest } from 'next/server';
import { authService } from '@/lib/services/auth-service';
import { userService } from '@/lib/services/user-service';
import { ApiResponseHelper } from '@/lib/api/types';
import { ApiError } from '@/lib/api/errors';
import { z } from 'zod';
import { commonValidators } from '@/lib/validation/common';

const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: commonValidators.email().optional(),
  phone: z.string().optional(),
  role: z.enum(['admin', 'coach', 'client']).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params;
    
    // Verify admin access
    const session = await authService.getSession();
    if (!session?.user || session.user.role !== 'admin') {
      return ApiResponseHelper.forbidden('Admin access required');
    }

    // Get user by ID
    const user = await userService.getUserById(id);
    
    if (!user) {
      return ApiResponseHelper.notFound('User not found');
    }

    return ApiResponseHelper.success(user);

  } catch (error) {
    console.error('Get user API error:', error);
    
    if (error instanceof ApiError) {
      return ApiResponseHelper.error(error.code, error.message);
    }
    
    return ApiResponseHelper.internalError('Failed to fetch user');
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params;
    
    // Verify admin access
    const session = await authService.getSession();
    if (!session?.user || session.user.role !== 'admin') {
      return ApiResponseHelper.forbidden('Admin access required');
    }

    // Parse request body
    const body = await request.json();
    
    const validation = updateUserSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponseHelper.badRequest('Invalid request data', validation.error.errors);
    }

    // Prevent admin from demoting themselves
    if (id === session.user.id && validation.data.role && validation.data.role !== 'admin') {
      return ApiResponseHelper.badRequest('Cannot change your own admin role');
    }

    // Update user
    const updatedUser = await userService.updateUser(id, validation.data);
    
    if (!updatedUser) {
      return ApiResponseHelper.notFound('User not found');
    }

    return ApiResponseHelper.success({
      message: 'User updated successfully',
      user: updatedUser,
    });

  } catch (error) {
    console.error('Update user API error:', error);
    
    if (error instanceof ApiError) {
      return ApiResponseHelper.error(error.code, error.message);
    }
    
    return ApiResponseHelper.internalError('Failed to update user');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params;
    
    // Verify admin access
    const session = await authService.getSession();
    if (!session?.user || session.user.role !== 'admin') {
      return ApiResponseHelper.forbidden('Admin access required');
    }

    // Prevent admin from deleting themselves
    if (id === session.user.id) {
      return ApiResponseHelper.badRequest('Cannot delete your own account');
    }

    // Delete user
    const deleted = await userService.deleteUser(id);
    
    if (!deleted) {
      return ApiResponseHelper.notFound('User not found');
    }

    return ApiResponseHelper.success({
      message: 'User deleted successfully',
    });

  } catch (error) {
    console.error('Delete user API error:', error);
    
    if (error instanceof ApiError) {
      return ApiResponseHelper.error(error.code, error.message);
    }
    
    return ApiResponseHelper.internalError('Failed to delete user');
  }
}