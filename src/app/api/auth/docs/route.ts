import { NextResponse } from 'next/server';

const authApiDocs = {
  title: 'Loom Authentication API',
  version: '1.0.0',
  description: 'REST API endpoints for user authentication and profile management',
  baseUrl: '/api/auth',
  endpoints: {
    'POST /signup': {
      description: 'Register a new user account',
      body: {
        email: 'string (required) - User email address',
        password: 'string (required) - Password (min 8 characters)',
        firstName: 'string (required) - User first name',
        lastName: 'string (required) - User last name',
        role: 'enum (required) - User role: client, coach, or admin',
        phone: 'string (optional) - Phone number',
        language: 'enum (optional) - Language preference: en or he (default: en)',
      },
      responses: {
        201: 'User created successfully',
        400: 'Invalid request data or user already exists',
        500: 'Internal server error',
      },
    },
    'POST /signin': {
      description: 'Authenticate an existing user',
      body: {
        email: 'string (required) - User email address',
        password: 'string (required) - User password',
      },
      responses: {
        200: 'Authentication successful',
        401: 'Invalid credentials',
        400: 'Invalid request data',
        500: 'Internal server error',
      },
    },
    'POST /signout': {
      description: 'Sign out the current user',
      body: 'None',
      responses: {
        200: 'Successfully signed out',
        400: 'Sign out error',
        500: 'Internal server error',
      },
    },
    'GET /me': {
      description: 'Get current authenticated user profile',
      body: 'None',
      responses: {
        200: 'User profile returned',
        401: 'Not authenticated',
        500: 'Internal server error',
      },
    },
    'GET /session': {
      description: 'Get current user session information',
      body: 'None',
      responses: {
        200: 'Session information returned',
        500: 'Internal server error',
      },
    },
    'DELETE /session': {
      description: 'Terminate current user session',
      body: 'None',
      responses: {
        200: 'Session terminated successfully',
        400: 'Session termination error',
        500: 'Internal server error',
      },
    },
    'POST /reset-password': {
      description: 'Send password reset email',
      body: {
        email: 'string (required) - User email address',
      },
      responses: {
        200: 'Reset email sent successfully',
        400: 'Invalid email or reset error',
        500: 'Internal server error',
      },
    },
    'POST /update-password': {
      description: 'Update user password (requires authentication)',
      body: {
        password: 'string (required) - New password (min 8 characters)',
        confirmPassword: 'string (required) - Confirm new password',
      },
      responses: {
        200: 'Password updated successfully',
        400: 'Invalid password or passwords do not match',
        401: 'Not authenticated',
        500: 'Internal server error',
      },
    },
    'GET /profile': {
      description: 'Get user profile (requires authentication)',
      body: 'None',
      responses: {
        200: 'User profile returned',
        401: 'Not authenticated',
        500: 'Internal server error',
      },
    },
    'PUT /profile': {
      description: 'Update user profile (requires authentication)',
      body: {
        firstName: 'string (optional) - User first name',
        lastName: 'string (optional) - User last name',
        phone: 'string (optional) - Phone number',
        bio: 'string (optional) - User bio (for coaches)',
        location: 'string (optional) - User location',
        website: 'string (optional) - Website URL',
        avatarUrl: 'string (optional) - Avatar image URL',
        language: 'enum (optional) - Language preference: en or he',
        specialties: 'array (optional) - List of specialties (for coaches)',
      },
      responses: {
        200: 'Profile updated successfully',
        400: 'Invalid request data or update error',
        401: 'Not authenticated',
        500: 'Internal server error',
      },
    },
    'POST /verify': {
      description: 'Verify email token for account confirmation',
      body: {
        token_hash: 'string (required) - Verification token hash',
        type: 'enum (optional) - Token type: signup, recovery, email_change, phone_change (default: signup)',
      },
      responses: {
        200: 'Token verified successfully',
        400: 'Invalid or expired token',
        500: 'Internal server error',
      },
    },
    'GET /verify': {
      description: 'Handle verification callback redirect',
      query: {
        token_hash: 'string (required) - Verification token hash',
        type: 'string (optional) - Token type',
      },
      responses: {
        302: 'Redirect to frontend verification page',
        400: 'Missing token hash',
        500: 'Internal server error',
      },
    },
  },
  schemas: {
    AuthUser: {
      id: 'string - Unique user identifier',
      email: 'string - User email address',
      role: 'enum - User role: client, coach, or admin',
      firstName: 'string - User first name',
      lastName: 'string - User last name',
      avatarUrl: 'string - Avatar image URL',
      language: 'enum - Language preference: en or he',
    },
    ApiResponse: {
      success: 'boolean - Indicates if request was successful',
      user: 'AuthUser - User object (when applicable)',
      message: 'string - Success message (when applicable)',
      error: 'string - Error message (when applicable)',
      details: 'array - Validation error details (when applicable)',
    },
  },
  authentication: {
    type: 'Cookie-based authentication',
    description: 'Authentication is handled via HTTP-only cookies set by Supabase Auth.',
    headers: {
      'Content-Type': 'application/json',
    },
    cookies: {
      'sb-access-token': 'JWT access token',
      'sb-refresh-token': 'JWT refresh token',
    },
  },
  errorHandling: {
    format: 'All errors follow a consistent format',
    structure: {
      success: false,
      error: 'string - Human-readable error message',
      details: 'array - Additional error details for validation errors',
    },
    commonErrors: {
      400: 'Bad Request - Invalid request data',
      401: 'Unauthorized - Authentication required or invalid credentials',
      403: 'Forbidden - Insufficient permissions',
      404: 'Not Found - Resource not found',
      429: 'Too Many Requests - Rate limit exceeded',
      500: 'Internal Server Error - Server-side error',
    },
  },
  examples: {
    signup: {
      request: {
        method: 'POST',
        url: '/api/auth/signup',
        body: {
          email: 'user@example.com',
          password: 'securepassword123',
          firstName: 'John',
          lastName: 'Doe',
          role: 'client',
          language: 'en',
        },
      },
      response: {
        success: true,
        user: {
          id: 'user-uuid',
          email: 'user@example.com',
          role: 'client',
          firstName: 'John',
          lastName: 'Doe',
          language: 'en',
        },
        message: 'User account created successfully. Please check your email for verification.',
      },
    },
    signin: {
      request: {
        method: 'POST',
        url: '/api/auth/signin',
        body: {
          email: 'user@example.com',
          password: 'securepassword123',
        },
      },
      response: {
        success: true,
        user: {
          id: 'user-uuid',
          email: 'user@example.com',
          role: 'client',
          firstName: 'John',
          lastName: 'Doe',
          language: 'en',
        },
      },
    },
  },
};

export async function GET() {
  return NextResponse.json(authApiDocs, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}