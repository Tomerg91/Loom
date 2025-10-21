import { NextRequest } from 'next/server';

import { 
  createSuccessResponse, 
  createErrorResponse, 
  withErrorHandling,
  validateRequestBody,
  HTTP_STATUS
} from '@/lib/api/utils';
import { uuidSchema, updateUserSchema } from '@/lib/api/validation';
import { UserService } from '@/lib/database/users';
import { createCorsResponse, applyCorsHeaders } from '@/lib/security/cors';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/users/[id] - Get user by ID
export const GET = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const { id } = await params;
  
  // Authenticate user
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return createErrorResponse(
      'Authentication required',
      HTTP_STATUS.UNAUTHORIZED
    );
  }

  // Get authenticated user from Supabase
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return createErrorResponse(
      'Invalid authentication token',
      HTTP_STATUS.UNAUTHORIZED
    );
  }

  // Get user profile from database
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('id, email, role, status')
    .eq('id', authUser.id)
    .single();

  if (profileError || !userProfile) {
    return createErrorResponse(
      'User profile not found',
      HTTP_STATUS.UNAUTHORIZED
    );
  }

  // Check if user is active
  if (userProfile.status !== 'active') {
    return createErrorResponse(
      'User account is not active',
      HTTP_STATUS.FORBIDDEN
    );
  }

  // Validate UUID format
  const validationResult = uuidSchema.safeParse(id);
  if (!validationResult.success) {
    return createErrorResponse('Invalid user ID format', HTTP_STATUS.BAD_REQUEST);
  }

  // Check if user can access this profile (own profile or admin)
  if (userProfile.id !== id && userProfile.role !== 'admin') {
    return createErrorResponse(
      'Access denied. You can only view your own profile',
      HTTP_STATUS.FORBIDDEN
    );
  }
  
  const userService = new UserService(true);
  const result = await userService.getUserById(id);
  
  if (!result.success) {
    return createErrorResponse(result.error, HTTP_STATUS.NOT_FOUND);
  }
  
  return createSuccessResponse(result.data);
});

// PUT /api/users/[id] - Update user
export const PUT = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const { id } = await params;
  
  // Authenticate user
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return createErrorResponse(
      'Authentication required',
      HTTP_STATUS.UNAUTHORIZED
    );
  }

  // Get authenticated user from Supabase
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return createErrorResponse(
      'Invalid authentication token',
      HTTP_STATUS.UNAUTHORIZED
    );
  }

  // Get user profile from database
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('id, email, role, status')
    .eq('id', authUser.id)
    .single();

  if (profileError || !userProfile) {
    return createErrorResponse(
      'User profile not found',
      HTTP_STATUS.UNAUTHORIZED
    );
  }

  // Check if user is active
  if (userProfile.status !== 'active') {
    return createErrorResponse(
      'User account is not active',
      HTTP_STATUS.FORBIDDEN
    );
  }

  // Validate UUID format
  const validationResult = uuidSchema.safeParse(id);
  if (!validationResult.success) {
    return createErrorResponse('Invalid user ID format', HTTP_STATUS.BAD_REQUEST);
  }

  // Check if user can update this profile (own profile or admin)
  if (userProfile.id !== id && userProfile.role !== 'admin') {
    return createErrorResponse(
      'Access denied. You can only update your own profile',
      HTTP_STATUS.FORBIDDEN
    );
  }
  
  // Parse and validate request body
  const body = await request.json();
  const validation = validateRequestBody(updateUserSchema, body);
  
  if (!validation.success) {
    return createErrorResponse(validation.error, HTTP_STATUS.UNPROCESSABLE_ENTITY);
  }
  
  // Check if user exists
  const userService = new UserService(true);
  const existingUserResult = await userService.getUserById(id);
  if (!existingUserResult.success) {
    return createErrorResponse(existingUserResult.error, HTTP_STATUS.NOT_FOUND);
  }
  
  // Update user
  const updateResult = await userService.updateUser(id, validation.data);
  
  if (!updateResult.success) {
    return createErrorResponse(updateResult.error, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
  
  return createSuccessResponse(updateResult.data, 'User updated successfully');
});

// DELETE /api/users/[id] - Delete user (Admin only)
export const DELETE = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const { id } = await params;
  
  // Authenticate user
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return createErrorResponse(
      'Authentication required',
      HTTP_STATUS.UNAUTHORIZED
    );
  }

  // Get authenticated user from Supabase
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return createErrorResponse(
      'Invalid authentication token',
      HTTP_STATUS.UNAUTHORIZED
    );
  }

  // Get user profile from database
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('id, email, role, status')
    .eq('id', authUser.id)
    .single();

  if (profileError || !userProfile) {
    return createErrorResponse(
      'User profile not found',
      HTTP_STATUS.UNAUTHORIZED
    );
  }

  // Check if user is active
  if (userProfile.status !== 'active') {
    return createErrorResponse(
      'User account is not active',
      HTTP_STATUS.FORBIDDEN
    );
  }

  // Check if user has admin role (required for deleting users)
  if (userProfile.role !== 'admin') {
    return createErrorResponse(
      'Access denied. Required role: admin',
      HTTP_STATUS.FORBIDDEN
    );
  }

  // Validate UUID format
  const validationResult = uuidSchema.safeParse(id);
  if (!validationResult.success) {
    return createErrorResponse('Invalid user ID format', HTTP_STATUS.BAD_REQUEST);
  }
  
  // Check if user exists
  const userService = new UserService(true);
  const existingUserResult = await userService.getUserById(id);
  if (!existingUserResult.success) {
    return createErrorResponse(existingUserResult.error, HTTP_STATUS.NOT_FOUND);
  }
  
  // Delete user
  const deleteResult = await userService.deleteUser(id);
  
  if (!deleteResult.success) {
    return createErrorResponse(deleteResult.error, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
  
  return createSuccessResponse(null, 'User deleted successfully', HTTP_STATUS.NO_CONTENT);
});

// OPTIONS /api/users/[id] - Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return createCorsResponse(request);
}