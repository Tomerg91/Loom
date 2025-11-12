/**
 * Analytics Types
 * TypeScript types for analytics, goals, and metrics tracking
 */

// =====================================================================
// EVENT TRACKING TYPES
// =====================================================================

export type EventCategory =
  | 'authentication'
  | 'onboarding'
  | 'session'
  | 'task'
  | 'goal'
  | 'resource'
  | 'engagement'
  | 'system'
  | 'payment';

export interface Event {
  id: string;
  eventName: string;
  eventCategory: EventCategory;
  userId?: string;
  sessionId?: string; // Browser/device session

  // Event metadata
  properties?: Record<string, unknown>;
  context?: {
    userAgent?: string;
    ipAddress?: string;
    device?: string;
    browser?: string;
    os?: string;
    locale?: string;
    timezone?: string;
    referrer?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
  };

  // Related entities
  relatedSessionId?: string; // Coaching session ID
  relatedTaskId?: string;
  relatedGoalId?: string;

  // Timing
  timestamp: string;
  createdAt: string;
}

export interface TrackEventParams {
  eventName: string;
  eventCategory: EventCategory;
  userId?: string;
  properties?: Record<string, unknown>;
  relatedSessionId?: string;
  relatedTaskId?: string;
  relatedGoalId?: string;
}

// =====================================================================
// GOALS TRACKING TYPES
// =====================================================================

export type GoalStatus = 'active' | 'completed' | 'abandoned' | 'paused';
export type GoalPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Goal {
  id: string;
  clientId: string;
  coachId?: string;

  // Goal details
  title: string;
  description?: string;
  category?: string;

  // Goal tracking
  status: GoalStatus;
  priority: GoalPriority;
  progressPercentage: number; // 0-100

  // Dates
  targetDate?: string;
  startedAt: string;
  completedAt?: string;

  // Metrics
  successCriteria?: SuccessCriterion[];
  milestones?: Milestone[];

  // Metadata
  tags?: string[];
  metadata?: Record<string, unknown>;

  createdAt: string;
  updatedAt: string;
}

export interface SuccessCriterion {
  id: string;
  description: string;
  isMet: boolean;
  metAt?: string;
}

export interface Milestone {
  id: string;
  title: string;
  description?: string;
  targetDate?: string;
  completedAt?: string;
  isCompleted: boolean;
}

export interface GoalProgressUpdate {
  id: string;
  goalId: string;
  userId: string;

  // Progress details
  previousPercentage: number;
  newPercentage: number;
  notes?: string;

  // Related entities
  relatedSessionId?: string;
  relatedTaskId?: string;

  createdAt: string;
}

export interface GoalFormData {
  title: string;
  description?: string;
  category?: string;
  priority: GoalPriority;
  targetDate?: string;
  successCriteria?: Omit<SuccessCriterion, 'id' | 'isMet' | 'metAt'>[];
  milestones?: Omit<Milestone, 'id' | 'completedAt' | 'isCompleted'>[];
  tags?: string[];
}

// =====================================================================
// ENGAGEMENT METRICS TYPES
// =====================================================================

export interface UserEngagementMetrics {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD

  // Activity metrics
  sessionsAttended: number;
  tasksCompleted: number;
  goalsUpdated: number;
  resourcesViewed: number;
  resourcesDownloaded: number;
  messagesSent: number;

  // Engagement score (0-100)
  engagementScore: number;

  // Time metrics (in minutes)
  activeTimeMinutes: number;

  createdAt: string;
  updatedAt: string;
}

export interface CoachProductivityMetrics {
  id: string;
  coachId: string;
  date: string; // YYYY-MM-DD

  // Session metrics
  sessionsScheduled: number;
  sessionsCompleted: number;
  sessionsCancelled: number;
  totalSessionMinutes: number;

  // Task management
  tasksCreated: number;
  tasksAssigned: number;

  // Resource management
  resourcesCreated: number;
  resourcesShared: number;

  // Client management
  activeClients: number;
  newClients: number;

  // Productivity score (0-100)
  productivityScore: number;

  createdAt: string;
  updatedAt: string;
}

// =====================================================================
// ONBOARDING FUNNEL TYPES
// =====================================================================

export type OnboardingStep =
  | 'signup_started'
  | 'signup_completed'
  | 'email_verified'
  | 'mfa_setup'
  | 'profile_started'
  | 'profile_completed'
  | 'preferences_completed'
  | 'onboarding_completed';

export interface OnboardingFunnelEvent {
  id: string;
  userId: string;
  step: OnboardingStep;
  completedAt: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface OnboardingFunnelMetrics {
  step: OnboardingStep;
  usersReached: number;
  completionPercentage: number;
  avgTimeToComplete?: number; // In hours
  dropoffRate?: number;
}

// =====================================================================
// SESSION QUALITY TYPES
// =====================================================================

export interface SessionRating {
  id: string;
  sessionId: string;
  userId: string;

  // Ratings (1-5 scale)
  overallRating?: number;
  valueRating?: number;
  communicationRating?: number;

  // Feedback
  feedback?: string;
  wouldRecommend?: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface SessionRatingForm {
  overallRating: number;
  valueRating: number;
  communicationRating: number;
  feedback?: string;
  wouldRecommend: boolean;
}

// =====================================================================
// ANALYTICS DASHBOARD TYPES
// =====================================================================

export interface AnalyticsSummary {
  // Time range
  startDate: string;
  endDate: string;

  // User metrics
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  weeklyActiveClients: number;

  // Session metrics
  totalSessions: number;
  completedSessions: number;
  sessionCompletionRate: number;
  avgSessionDuration: number;

  // Goal metrics
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  goalCompletionRate: number;

  // Engagement metrics
  avgEngagementScore: number;
  avgTaskCompletionRate: number;
  resourceViewCount: number;

  // Coach metrics
  activeCoaches: number;
  avgCoachProductivityScore: number;
  avgSessionsPerCoach: number;
}

export interface FunnelMetrics {
  startDate: string;
  endDate: string;
  totalSignups: number;
  onboardingCompletionRate: number; // Percentage
  steps: OnboardingFunnelMetrics[];
  avgOnboardingTime: number; // In hours
}

export interface CoachProductivitySummary {
  coachId: string;
  coachName: string;
  totalSessions: number;
  sessionsCompleted: number;
  completionRate: number;
  tasksCreated: number;
  resourcesShared: number;
  activeClients: number;
  avgProductivityScore: number;
  performanceRank?: number;
}

export interface ClientEngagementSummary {
  clientId: string;
  clientName: string;
  totalSessions: number;
  tasksCompleted: number;
  goalsUpdated: number;
  resourcesViewed: number;
  avgEngagementScore: number;
  daysActive: number;
  isWeeklyActive: boolean;
  lastActivityDate?: string;
}

export interface GoalCompletionMetrics {
  startDate: string;
  endDate: string;
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  completionRate: number;
  avgCompletionDays: number;
  clientsWithGoals: number;
}

// =====================================================================
// UPTIME MONITORING TYPES
// =====================================================================

export interface UptimeMonitorConfig {
  serviceName: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'HEAD';
  expectedStatusCode: number;
  timeout: number; // In milliseconds
  checkInterval: number; // In minutes
  alertThreshold: number; // Number of failures before alerting
  enabled: boolean;
}

export interface UptimeCheckResult {
  serviceName: string;
  timestamp: string;
  isUp: boolean;
  responseTime: number; // In milliseconds
  statusCode?: number;
  error?: string;
}

export interface ServiceUptimeMetrics {
  serviceName: string;
  uptime: number; // Percentage (0-100)
  avgResponseTime: number; // In milliseconds
  totalChecks: number;
  failedChecks: number;
  lastCheckTime: string;
  lastDowntime?: string;
}

// =====================================================================
// REPORTING TYPES
// =====================================================================

export interface WeeklyReport {
  weekStartDate: string;
  weekEndDate: string;
  generatedAt: string;

  // G1: Onboarding completion rate
  onboardingCompletionRate: number;
  onboardingMetrics: FunnelMetrics;

  // G2: Coach productivity
  avgCoachProductivityScore: number;
  topPerformingCoaches: CoachProductivitySummary[];
  coachMetrics: {
    totalCoaches: number;
    activeCoaches: number;
    avgSessionsPerCoach: number;
    avgTasksCreatedPerCoach: number;
  };

  // G3: Client engagement
  weeklyActiveClients: number;
  totalActiveClients: number;
  clientEngagementRate: number; // Percentage
  avgEngagementScore: number;

  // G4: System uptime
  systemUptime: {
    notifications: ServiceUptimeMetrics;
    mfa: ServiceUptimeMetrics;
    payments: ServiceUptimeMetrics;
    overall: number; // Percentage
  };

  // Additional insights
  insights: {
    title: string;
    description: string;
    type: 'success' | 'warning' | 'info' | 'error';
  }[];

  // Recommendations
  recommendations: string[];
}

export interface ReportRecipient {
  email: string;
  name: string;
  role: 'admin' | 'leadership' | 'stakeholder';
}

export interface ReportSchedule {
  id: string;
  reportType: 'weekly' | 'monthly' | 'quarterly';
  recipients: ReportRecipient[];
  enabled: boolean;
  lastSentAt?: string;
  nextScheduledAt: string;
  createdAt: string;
  updatedAt: string;
}

// =====================================================================
// API REQUEST/RESPONSE TYPES
// =====================================================================

export interface GetAnalyticsSummaryRequest {
  startDate?: string;
  endDate?: string;
  userId?: string;
  role?: 'client' | 'coach' | 'admin';
}

export interface GetFunnelMetricsRequest {
  startDate?: string;
  endDate?: string;
}

export interface GetCoachProductivityRequest {
  coachId?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: 'productivity_score' | 'sessions_completed' | 'tasks_created';
  limit?: number;
}

export interface GetClientEngagementRequest {
  clientId?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: 'engagement_score' | 'tasks_completed' | 'days_active';
  limit?: number;
}

export interface GetGoalMetricsRequest {
  clientId?: string;
  coachId?: string;
  status?: GoalStatus;
  startDate?: string;
  endDate?: string;
}

export interface GetUptimeMetricsRequest {
  serviceName?: string;
  startDate?: string;
  endDate?: string;
}

export interface GenerateReportRequest {
  reportType: 'weekly' | 'monthly' | 'custom';
  startDate: string;
  endDate: string;
  includeInsights?: boolean;
  includeRecommendations?: boolean;
}

export interface AnalyticsApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}
