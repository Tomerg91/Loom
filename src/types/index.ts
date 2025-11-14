export type { Database } from './supabase';

// Analytics types
export * from './analytics';

// User types
export type UserRole = 'client' | 'coach' | 'admin';
export type UserStatus = 'active' | 'inactive' | 'suspended';
export type Language = 'en' | 'he';
export type SubscriptionTier = 'free' | 'basic' | 'professional' | 'enterprise';

// MFA types
export type MfaMethod = 'totp' | 'backup_code' | 'sms';
export type MfaSessionStatus =
  | 'password_verified'
  | 'mfa_required'
  | 'fully_authenticated';

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
  onboardingStatus?: 'pending' | 'in_progress' | 'completed';
  onboardingStep?: number;
  onboardingCompletedAt?: string;
  onboardingData?: Record<string, unknown>;
  // MFA fields
  mfaEnabled?: boolean;
  mfaSetupCompleted?: boolean;
  mfaVerifiedAt?: string;
  rememberDeviceEnabled?: boolean;
  // Subscription fields
  subscriptionTier?: SubscriptionTier;
  subscriptionExpiresAt?: string;
  subscriptionStartedAt?: string;
  subscriptionMetadata?: Record<string, unknown>;
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
export type SessionStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';
export type SessionType = 'video' | 'phone' | 'in-person';
export type SessionSortBy = 'date' | 'duration' | 'coach' | 'status' | 'title';
export type SortOrder = 'asc' | 'desc';
export type ViewMode = 'list' | 'calendar' | 'timeline';

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
  sessionType?: SessionType;
  location?: string;
  meetingUrl?: string;
  notes?: string;
  rating?: number;
  feedback?: string;
  actionItems?: string[];
  goals?: string[];
  attachments?: SessionAttachment[];
  progressNotes?: SessionProgressNote[];
  cancellationReason?: string;
  rescheduledFromId?: string;
  rescheduledToId?: string;
  timezone?: string;
  metadata?: Record<string, unknown>;
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
  cancellationPolicy?: {
    freeUntilHours: number;
    partialRefundUntilHours: number;
    feeAmount: number;
  };
}

/**
 * Session view model with enriched coach/client information
 * Used when displaying sessions with computed fields for UI
 */
export interface SessionWithCoachInfo extends Session {
  // Enriched fields for UI display
  coachName: string;
  coachAvatar?: string;
  clientName: string;
  clientAvatar?: string;
  keyInsights?: string[];
}

/**
 * Helper to convert a database Session to SessionWithCoachInfo
 */
export function enrichSessionWithCoachInfo(session: Session): SessionWithCoachInfo {
  return {
    ...session,
    coachName: `${session.coach.firstName} ${session.coach.lastName}`.trim(),
    coachAvatar: session.coach.avatarUrl,
    clientName: `${session.client.firstName} ${session.client.lastName}`.trim(),
    clientAvatar: session.client.avatarUrl,
    keyInsights: session.metadata?.keyInsights as string[] | undefined,
  };
}

export interface SessionAttachment {
  id: string;
  sessionId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  uploadedBy: string;
  uploadedAt: string;
  description?: string;
}

export interface SessionProgressNote {
  id: string;
  sessionId: string;
  clientId: string;
  content: string;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SessionFilters {
  status?: SessionStatus[];
  dateRange?: {
    from: Date;
    to: Date;
  };
  coachId?: string;
  sessionType?: SessionType[];
  search?: string;
}

export interface SessionListOptions {
  filters?: SessionFilters;
  sortBy?: SessionSortBy;
  sortOrder?: SortOrder;
  page?: number;
  limit?: number;
  viewMode?: ViewMode;
}

export interface SessionRating {
  id: string;
  sessionId: string;
  clientId: string;
  rating: number; // 1-5 scale
  feedback?: string;
  categories?: {
    communication: number;
    helpfulness: number;
    preparation: number;
    overall: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface SessionRescheduleRequest {
  sessionId: string;
  newDateTime: string;
  reason?: string;
  timezone?: string;
}

export interface SessionCancellation {
  sessionId: string;
  reason: string;
  refundAmount?: number;
  cancellationFee?: number;
  policyApplied?: string;
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
export type NotificationType =
  | 'session_reminder'
  | 'new_message'
  | 'session_confirmation'
  | 'system_update'
  | 'welcome_message'
  | 'goal_achieved'
  | 'appointment_reminder'
  | 'coach_message'
  | 'client_message'
  | 'session_cancelled'
  | 'session_rescheduled'
  | 'reflection_reminder'
  | 'system_announcement'
  | 'payment_reminder'
  | 'mfa_setup_required'
  | 'mfa_setup_completed'
  | 'mfa_backup_codes_generated'
  | 'mfa_method_added'
  | 'mfa_method_removed'
  | 'mfa_backup_code_used'
  | 'mfa_login_failed'
  | 'mfa_account_locked';
export type NotificationChannel = 'email' | 'push' | 'inapp';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  channel?: NotificationChannel;
  priority?: NotificationPriority;
  actionUrl?: string;
  actionLabel?: string;
  expiresAt?: string;
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

// Messaging types
export type ConversationType = 'direct' | 'group';
export type MessageType = 'text' | 'file' | 'system';
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
export type AttachmentType = 'image' | 'document' | 'video' | 'audio' | 'other';

export interface Conversation {
  id: string;
  type: ConversationType;
  title?: string;
  createdBy: string;
  isArchived: boolean;
  isMuted: boolean;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
  participants: User[];
  unreadCount: number;
  lastMessage?: Message;
}

export interface ConversationParticipant {
  id: string;
  conversationId: string;
  userId: string;
  role: string;
  joinedAt: string;
  leftAt?: string;
  isMuted: boolean;
  isArchived: boolean;
  lastReadAt: string;
  createdAt: string;
  updatedAt: string;
  user?: User;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  replyToId?: string;
  type: MessageType;
  content: string;
  metadata?: Record<string, unknown>;
  status: MessageStatus;
  isEdited: boolean;
  editedAt?: string;
  deliveredAt?: string;
  createdAt: string;
  updatedAt: string;
  sender: User;
  replyTo?: Message;
  reactions?: MessageReaction[];
  attachments?: MessageAttachment[];
}

export interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: string;
  user: User;
}

export interface MessageAttachment {
  id: string;
  messageId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  attachmentType: AttachmentType;
  url: string;
  thumbnailUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface MessageReadReceipt {
  id: string;
  messageId: string;
  userId: string;
  readAt: string;
}

export interface TypingIndicator {
  id: string;
  conversationId: string;
  userId: string;
  startedAt: string;
  expiresAt: string;
  user?: User;
}

// Messaging form types
export interface MessageForm {
  content: string;
  attachments: File[];
  replyToId?: string;
}

export interface ConversationSettings {
  isArchived: boolean;
  isMuted: boolean;
  title?: string;
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
      init: (key: string, config: Record<string, unknown>) => void;
      capture: (
        eventName: string,
        properties?: Record<string, unknown>
      ) => void;
      identify: (userId: string, properties?: Record<string, unknown>) => void;
      reset: () => void;
    };
  }
}
