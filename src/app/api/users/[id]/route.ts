import { NextRequest } from 'next/server';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  withErrorHandling,
  validateRequestBody,
  HTTP_STATUS
} from '@/lib/api/utils';
import { uuidSchema, updateUserSchema } from '@/lib/api/validation';
import { getUserById, updateUser, deleteUser } from '@/lib/database/users';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/users/[id] - Get user by ID
export const GET = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const { id } = await params;
  
  // Validate UUID format
  const validationResult = uuidSchema.safeParse(id);
  if (!validationResult.success) {
    return createErrorResponse('Invalid user ID format', HTTP_STATUS.BAD_REQUEST);
  }
  
  const user = await getUserById(id);
  
  if (!user) {
    return createErrorResponse('User not found', HTTP_STATUS.NOT_FOUND);
  }
  
  return createSuccessResponse(user);
});

// PUT /api/users/[id] - Update user
export const PUT = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const { id } = await params;
  
  // Validate UUID format
  const validationResult = uuidSchema.safeParse(id);
  if (!validationResult.success) {
    return createErrorResponse('Invalid user ID format', HTTP_STATUS.BAD_REQUEST);
  }
  
  // Parse and validate request body
  const body = await request.json();
  const validation = validateRequestBody(updateUserSchema, body);
  
  if (!validation.success) {
    return createErrorResponse(validation.error, HTTP_STATUS.UNPROCESSABLE_ENTITY);
  }
  
  // Check if user exists
  const existingUser = await getUserById(id);
  if (!existingUser) {
    return createErrorResponse('User not found', HTTP_STATUS.NOT_FOUND);
  }
  
  // Update user
  const updatedUser = await updateUser(id, validation.data);
  
  return createSuccessResponse(updatedUser, 'User updated successfully');
});

// DELETE /api/users/[id] - Delete user
export const DELETE = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const { id } = await params;
  
  // Validate UUID format
  const validationResult = uuidSchema.safeParse(id);
  if (!validationResult.success) {
    return createErrorResponse('Invalid user ID format', HTTP_STATUS.BAD_REQUEST);
  }
  
  // Check if user exists
  const existingUser = await getUserById(id);
  if (!existingUser) {
    return createErrorResponse('User not found', HTTP_STATUS.NOT_FOUND);
  }
  
  // Delete user
  await deleteUser(id);
  
  return createSuccessResponse(null, 'User deleted successfully', HTTP_STATUS.NO_CONTENT);
});

// OPTIONS /api/users/[id] - Handle CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}