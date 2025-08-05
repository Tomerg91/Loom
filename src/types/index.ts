export type { Database } from './supabase';

// User types
export type UserRole = 'client' | 'coach' | 'admin';
export type UserStatus = 'active' | 'inactive' | 'suspended';
export type Language = 'en' | 'he';

// MFA types
export type MfaMethod = 'totp' | 'backup_code';
export type MfaSessionStatus = 'password_verified' | 'mfa_required' | 'fully_authenticated';

export interface MfaSession {
  id: string;
  sessionToken: string;
  passwordVerified: boolean;
  mfaVerified: boolean;
  deviceFingerprint?: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: string;
  createdAt: string;
}

export interface TrustedDevice {
  id: string;
  deviceFingerprint: string;
  deviceName?: string;
  ipAddress?: string;
  userAgent?: string;
  lastUsedAt: string;
  expiresAt: string;
  createdAt: string;
}

export interface MfaSetupData {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface MfaVerificationData {
  method: MfaMethod;
  code: string;
  rememberDevice?: boolean;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  phone?: string;
  phoneNumber?: string; // Alternative field name for compatibility
  avatarUrl?: string;
  timezone?: string;
  language: Language;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  lastSeenAt?: string;
  // MFA fields
  mfaEnabled?: boolean;
  mfaSetupCompleted?: boolean;
  mfaVerifiedAt?: string;
  rememberDeviceEnabled?: boolean;
  // Additional fields for auth compatibility
  isActive?: boolean;
  emailVerified?: boolean;
  dateOfBirth?: string;
  preferences?: {
    language: string;
    notifications: {
      email: boolean;
      push: boolean;
      inApp: boolean;
    };
    theme: string;
  };
  metadata?: Record<string, unknown>;
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
  duration: number; // Duration in minutes
  durationMinutes: number; // Alias for backwards compatibility
  status: SessionStatus;
  sessionType?: 'video' | 'phone' | 'in-person';
  location?: string;
  meetingUrl?: string;
  notes?: string;
  rating?: number;
  feedback?: string;
  actionItems?: string[];
  goals?: string[];
  createdAt: string;
  updatedAt: string;
  coach: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
  client: {
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

export interface SessionFormData {
  title: string;
  description: string;
  scheduledAt: string;
  duration: number;
  sessionType: 'video' | 'phone' | 'in-person';
  location: string;
  meetingUrl: string;
  notes: string;
  goals: string[];
  coachId: string;
  clientId: string;
}

export type SessionFormField = keyof SessionFormData;

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

// Global window type declarations
declare global {
  interface Window {
    gtag?: (
      command: 'config' | 'event',
      targetId: string,
      config?: Record<string, unknown>
    ) => void;
    posthog?: {
      capture: (eventName: string, properties?: Record<string, unknown>) => void;
      identify: (userId: string, properties?: Record<string, unknown>) => void;
    };
  }
}