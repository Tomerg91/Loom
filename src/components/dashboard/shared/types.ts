// Common types for dashboard components

export interface DashboardStats {
  title: string;
  value: string | number;
  icon: React.ComponentType<unknown>;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  description?: string;
}

export interface TimeRangeOption {
  value: string;
  label: string;
}

export interface FilterOption {
  value: string;
  label: string;
}

export interface TabOption {
  value: string;
  label: string;
  testId?: string;
}

export interface LoadingState {
  isLoading: boolean;
  error?: Error | null;
}

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'admin' | 'coach' | 'client';
  status: 'active' | 'inactive' | 'pending';
  avatarUrl?: string;
  createdAt: string;
  lastLoginAt?: string;
  phone?: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  status: 'not_started' | 'in_progress' | 'completed' | 'paused';
  progress: number;
  targetDate: string;
  createdDate: string;
  milestones: Milestone[];
}

export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
  completedDate?: string;
}

/**
 * Dashboard Session type - used for displaying session information in widgets
 * This is a view model that enriches the database Session with computed fields
 */
export interface Session {
  id: string;
  coachName: string;
  coachAvatar?: string;
  date: string;
  duration: number;
  topic: string;
  rating?: number;
  notes?: string;
  keyInsights: string[];
  actionItems: string[];
  status: 'completed' | 'upcoming' | 'cancelled';
}

/**
 * Type guard to check if a database Session can be converted to a dashboard Session
 */
export function isDashboardSession(session: unknown): session is Session {
  return (
    typeof session === 'object' &&
    session !== null &&
    typeof session.id === 'string' &&
    typeof session.coachName === 'string' &&
    typeof session.date === 'string' &&
    typeof session.duration === 'number' &&
    typeof session.topic === 'string' &&
    Array.isArray(session.keyInsights) &&
    Array.isArray(session.actionItems) &&
    ['completed', 'upcoming', 'cancelled'].includes(session.status)
  );
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  earnedDate: string;
  category: string;
  icon: string;
}

export interface Coach {
  id: string;
  firstName: string;
  lastName: string;
  title: string;
  avatarUrl?: string;
  specialties: string[];
  rating: number;
  reviewCount: number;
  hourlyRate: number;
  location: string;
  bio: string;
}

export interface TimeSlot {
  id: string;
  coachId: string;
  date: string;
  time: string;
  duration: number;
  available: boolean;
  sessionType: 'video' | 'phone' | 'in-person';
}

export interface ClientProgress {
  clientId: string;
  clientName: string;
  progressScore: number;
  sessionsCompleted: number;
  goalAchievement: number;
  lastSession: string;
  trend: 'up' | 'down' | 'stable';
}

export interface Feedback {
  clientName: string;
  rating: number;
  comment: string;
  date: string;
  sessionType: string;
}