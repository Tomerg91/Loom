/**
 * Analytics Configuration Constants
 * 
 * This file centralizes all configurable values used in analytics calculations
 * to avoid hardcoded values throughout the application.
 */

export const ANALYTICS_CONFIG = {
  // Session pricing configuration
  DEFAULT_SESSION_RATE: 75, // USD per completed session
  
  // Default ratings and performance metrics
  DEFAULT_COACH_RATING: 4.7,
  INDUSTRY_AVERAGE_COMPLETION_RATE: 75, // percentage
  
  // Growth calculation defaults (when historical data is not available)
  DEFAULT_GROWTH_RATES: {
    users: 12, // percentage
    sessions: 8, // percentage
    completion: 15, // percentage
    revenue: 22, // percentage
  },
  
  // Performance thresholds
  PERFORMANCE_THRESHOLDS: {
    excellent: 90,
    good: 75,
    average: 60,
    needs_improvement: 40,
  },
  
  // Data retention and caching
  CACHE_TTL_MINUTES: 15,
  DATA_RETENTION_DAYS: 365,
} as const;

// Type definitions for type safety
export type AnalyticsConfig = typeof ANALYTICS_CONFIG;
export type GrowthRateKey = keyof typeof ANALYTICS_CONFIG.DEFAULT_GROWTH_RATES;
export type PerformanceThreshold = keyof typeof ANALYTICS_CONFIG.PERFORMANCE_THRESHOLDS;

/**
 * Helper function to get session rate (could be extended to support different coach rates)
 */
export function getSessionRate(coachId?: string): number {
  // TODO: In future, could lookup coach-specific rates from database
  return ANALYTICS_CONFIG.DEFAULT_SESSION_RATE;
}

/**
 * Helper function to get coach rating (could be extended to calculate from actual feedback)
 */
export function getDefaultCoachRating(): number {
  // TODO: Calculate from actual session feedback/ratings table
  return ANALYTICS_CONFIG.DEFAULT_COACH_RATING;
}

/**
 * Helper function to calculate growth percentage
 */
export function calculateGrowthRate(current: number, previous: number): number {
  if (previous === 0) return 0;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Helper function to get growth rate with fallback to default
 */
export function getGrowthRateOrDefault(
  current: number, 
  previous: number | null, 
  defaultKey: GrowthRateKey
): number {
  if (previous === null || previous === 0) {
    return ANALYTICS_CONFIG.DEFAULT_GROWTH_RATES[defaultKey];
  }
  return calculateGrowthRate(current, previous);
}

/**
 * Helper function to get performance level based on percentage
 */
export function getPerformanceLevel(percentage: number): PerformanceThreshold {
  if (percentage >= ANALYTICS_CONFIG.PERFORMANCE_THRESHOLDS.excellent) return 'excellent';
  if (percentage >= ANALYTICS_CONFIG.PERFORMANCE_THRESHOLDS.good) return 'good';
  if (percentage >= ANALYTICS_CONFIG.PERFORMANCE_THRESHOLDS.average) return 'average';
  return 'needs_improvement';
}