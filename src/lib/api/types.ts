// API response types and interfaces
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

// API Response utility class
export class ApiResponseHelper {
  static success<T>(data: T, message?: string): Response {
    return new Response(JSON.stringify({
      success: true,
      data,
      message,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  static error(code: string, message: string, statusCode: number = 400): Response {
    return new Response(JSON.stringify({
      success: false,
      error: message,
      code,
    }), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  static badRequest(message: string, details?: unknown): Response {
    return new Response(JSON.stringify({
      success: false,
      error: message,
      details,
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  static unauthorized(message: string = 'Unauthorized'): Response {
    return new Response(JSON.stringify({
      success: false,
      error: message,
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  static forbidden(message: string = 'Forbidden'): Response {
    return new Response(JSON.stringify({
      success: false,
      error: message,
    }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  static notFound(message: string = 'Not found'): Response {
    return new Response(JSON.stringify({
      success: false,
      error: message,
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  static internalError(message: string = 'Internal server error'): Response {
    return new Response(JSON.stringify({
      success: false,
      error: message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}