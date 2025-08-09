// API response types and interfaces
import { NextResponse } from 'next/server';
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Request query parameters
export interface PaginationQuery {
  page?: string;
  limit?: string;
}

export interface SortQuery {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterQuery {
  [key: string]: string | string[] | undefined;
}

// Standard API query interface
export interface ApiQuery extends PaginationQuery, SortQuery, FilterQuery {}

// Session-related API types
export interface CreateSessionRequest {
  title: string;
  description?: string;
  scheduledAt: string;
  duration: number;
  coachId: string;
  clientId: string;
  meetingUrl?: string;
}

export interface UpdateSessionRequest {
  title?: string;
  description?: string;
  scheduledAt?: string;
  duration?: number;
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  meetingUrl?: string;
  notes?: string;
}

// User-related API types
export interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  role: 'client' | 'coach';
  phone?: string;
  timezone?: string;
  language?: string;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  timezone?: string;
  language?: string;
  avatar?: string;
  bio?: string;
}

// Notification-related API types
export interface CreateNotificationRequest {
  userId: string;
  type: 'session_reminder' | 'new_message' | 'session_confirmation' | 'system_update';
  title: string;
  content: string;
  scheduledFor?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateNotificationRequest {
  isRead?: boolean;
  isArchived?: boolean;
}

// Coach notes API types
export interface CreateNoteRequest {
  clientId: string;
  sessionId?: string;
  title: string;
  content: string;
  isPrivate: boolean;
  tags?: string[];
}

export interface UpdateNoteRequest {
  title?: string;
  content?: string;
  isPrivate?: boolean;
  tags?: string[];
}

// Client reflections API types
export interface CreateReflectionRequest {
  sessionId?: string;
  content: string;
  moodRating?: number;
  insights?: string;
  nextSessionGoals?: string;
}

export interface UpdateReflectionRequest {
  content?: string;
  moodRating?: number;
  insights?: string;
  nextSessionGoals?: string;
}

// Coach availability API types
export interface AvailabilitySlot {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
}

export interface CreateAvailabilityRequest {
  slots: AvailabilitySlot[];
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface UpdateAvailabilityRequest {
  slots?: AvailabilitySlot[];
  effectiveFrom?: string;
  effectiveTo?: string;
  isActive?: boolean;
}

// Authentication API types
export interface SignUpRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'client' | 'coach';
  phone?: string;
  language: 'en' | 'he';
  acceptedTerms: boolean;
}

export interface SignUpResponse {
  user: {
    id: string;
    email: string;
    role: 'client' | 'coach' | 'admin';
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
    language: 'en' | 'he';
    status: string;
  };
  message: string;
}

export interface SignInRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface SignInResponse {
  user: {
    id: string;
    email: string;
    role: 'client' | 'coach' | 'admin';
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
    language: 'en' | 'he';
    status: string;
    lastSeenAt?: string;
  };
  message: string;
}

export interface AuthError {
  code: string;
  message: string;
  details?: {
    email?: string;
    remainingTime?: number;
    validationErrors?: unknown[];
  };
}

// API Response utility class
export class ApiResponseHelper {
  static success<T>(data: T, message?: string): NextResponse {
    return NextResponse.json({
      success: true,
      data,
      message,
    }, {
      status: 200,
    });
  }

  static error(code: string, message: string, statusCode: number = 400): NextResponse {
    return NextResponse.json({
      success: false,
      error: message,
      code,
    }, {
      status: statusCode,
    });
  }

  static badRequest(message: string, details?: unknown): NextResponse {
    return NextResponse.json({
      success: false,
      error: message,
      details,
    }, {
      status: 400,
    });
  }

  static unauthorized(message: string = 'Unauthorized'): NextResponse {
    return NextResponse.json({
      success: false,
      error: message,
    }, {
      status: 401,
    });
  }

  static forbidden(message: string = 'Forbidden'): NextResponse {
    return NextResponse.json({
      success: false,
      error: message,
    }, {
      status: 403,
    });
  }

  static notFound(message: string = 'Not found'): NextResponse {
    return NextResponse.json({
      success: false,
      error: message,
    }, {
      status: 404,
      
    });
  }

  static internalError(message: string = 'Internal server error'): NextResponse {
    return NextResponse.json({
      success: false,
      error: message,
    }, {
      status: 500,
      
    });
  }
}