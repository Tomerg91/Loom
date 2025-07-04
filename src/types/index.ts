export type { Database } from './supabase';

// User types
export type UserRole = 'client' | 'coach' | 'admin';
export type UserStatus = 'active' | 'inactive' | 'suspended';
export type Language = 'en' | 'he';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
  timezone?: string;
  language: Language;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  lastSeenAt?: string;
}

// Session types
export type SessionStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';

export interface Session {
  id: string;
  coachId: string;
  clientId: string;
  title: string;
  description?: string;
  scheduledAt: string;
  durationMinutes: number;
  status: SessionStatus;
  meetingUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  coach?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
  client?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
}

// Coach Notes types
export type PrivacyLevel = 'private' | 'shared_with_client';

export interface CoachNote {
  id: string;
  coachId: string;
  clientId: string;
  sessionId?: string;
  title: string;
  content: string;
  privacyLevel: PrivacyLevel;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

// Reflection types
export interface Reflection {
  id: string;
  clientId: string;
  sessionId?: string;
  content: string;
  moodRating?: number;
  insights?: string;
  goalsForNextSession?: string;
  createdAt: string;
  updatedAt: string;
}

// Notification types
export type NotificationType = 'session_reminder' | 'new_message' | 'session_confirmation' | 'system_update';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  readAt?: string;
  scheduledFor?: string;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Coach Availability types
export interface CoachAvailability {
  id: string;
  coachId: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  isAvailable: boolean;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

// Form types
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phone?: string;
  timezone?: string;
  language: Language;
}

export interface SessionBookingForm {
  coachId: string;
  title: string;
  description?: string;
  scheduledAt: string;
  durationMinutes: number;
}

export interface ReflectionForm {
  sessionId?: string;
  content: string;
  moodRating?: number;
  insights?: string;
  goalsForNextSession?: string;
}

export interface CoachNoteForm {
  clientId: string;
  sessionId?: string;
  title: string;
  content: string;
  privacyLevel: PrivacyLevel;
  tags?: string[];
}

// API Response types
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}