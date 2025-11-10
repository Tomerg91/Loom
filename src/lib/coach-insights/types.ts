/**
 * @fileoverview Type definitions for coach insights API and components.
 * These interfaces describe the structure of data returned by the
 * coach insights endpoint and consumed by the insights page component.
 */

/**
 * Represents a single client's progress snapshot for the insights dashboard.
 */
export interface ClientProgressData {
  id: string;
  name: string;
  sessionsCompleted: number;
  totalSessions: number;
  averageMood: number;
  averageProgress: number;
  lastSession: string | null;
}

/**
 * Represents aggregated session metrics for a specific date.
 */
export interface SessionMetricData {
  date: string;
  completed: number;
  cancelled: number;
  total: number;
}

/**
 * Overview metrics and summary statistics for the coach insights.
 */
export interface CoachInsightsOverview {
  totalSessions: number;
  completedSessions: number;
  cancelledSessions: number;
  uniqueClients: number;
  totalHours: number;
  completionRate: number;
  averageMoodRating: number;
  averageProgressRating: number;
  estimatedRevenue: number;
  revenueCurrency: string;
  averageFeedbackRating: number;
  notesCount: number;
}

/**
 * Complete insights response payload from the API.
 */
export interface CoachInsightsResponse {
  overview: CoachInsightsOverview;
  sessionMetrics: SessionMetricData[];
  clientProgress: ClientProgressData[];
  timeRange: string;
  generatedAt: string;
}

/**
 * API wrapper response for coach insights endpoint.
 */
export interface CoachInsightsApiResponse {
  data: CoachInsightsResponse;
  success: boolean;
}
