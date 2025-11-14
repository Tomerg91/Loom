/**
 * Onboarding Analytics Tracking
 *
 * Enhanced tracking for user onboarding journey including:
 * - Onboarding step progression
 * - Time spent on each step
 * - Completion rates
 * - Drop-off points
 * - Feature discovery
 * - First actions
 */

import { trackEvent, posthogEvent } from './analytics';
import {
  trackOnboardingStep,
  trackOnboardingCompleted,
  trackOnboardingAbandoned,
} from './event-tracking';
import * as Sentry from '@sentry/nextjs';

export interface OnboardingEvent {
  userId: string;
  step: string;
  stepNumber: number;
  totalSteps: number;
  metadata?: Record<string, unknown>;
}

/**
 * Track onboarding step entry
 */
export const trackOnboardingStepStarted = (data: OnboardingEvent) => {
  const eventData = {
    action: 'onboarding_step_started',
    category: 'onboarding',
    label: data.step,
    value: data.stepNumber,
    userId: data.userId,
    properties: {
      step: data.step,
      stepNumber: data.stepNumber,
      totalSteps: data.totalSteps,
      progress: (data.stepNumber / data.totalSteps) * 100,
      timestamp: new Date().toISOString(),
      ...data.metadata,
    },
  };

  trackEvent(eventData);
  posthogEvent('onboarding_step_started', eventData.properties);

  // Track in database
  trackOnboardingStep(
    data.userId,
    data.step,
    data.stepNumber,
    data.totalSteps
  ).catch((error) => {
    Sentry.captureException(error, {
      tags: { event_type: 'onboarding_tracking_error' },
    });
  });
};

/**
 * Track onboarding step completion
 */
export const trackOnboardingStepCompleted = (
  data: OnboardingEvent & {
    timeSpentSeconds?: number;
    interactionCount?: number;
  }
) => {
  const eventData = {
    action: 'onboarding_step_completed',
    category: 'onboarding',
    label: data.step,
    value: data.timeSpentSeconds,
    userId: data.userId,
    properties: {
      step: data.step,
      stepNumber: data.stepNumber,
      totalSteps: data.totalSteps,
      progress: (data.stepNumber / data.totalSteps) * 100,
      timeSpentSeconds: data.timeSpentSeconds,
      interactionCount: data.interactionCount,
      timestamp: new Date().toISOString(),
      ...data.metadata,
    },
  };

  trackEvent(eventData);
  posthogEvent('onboarding_step_completed', eventData.properties);

  // Track time spent on step
  if (data.timeSpentSeconds) {
    Sentry.metrics.distribution(
      'onboarding_step_duration',
      data.timeSpentSeconds,
      {
        tags: {
          step: data.step,
          step_number: `${data.stepNumber}`,
        },
        unit: 'second',
      }
    );
  }

  // Track funnel progress in PostHog
  if (typeof window !== 'undefined' && window.posthog) {
    window.posthog.capture('$funnel_step', {
      funnel_name: 'user_onboarding',
      step: data.stepNumber,
      step_name: data.step,
      completed: true,
      ...eventData.properties,
    });
  }
};

/**
 * Track complete onboarding flow completion
 */
export const trackOnboardingFlowCompleted = (data: {
  userId: string;
  totalTimeSeconds?: number;
  stepsCompleted: number;
  totalSteps: number;
  metadata?: Record<string, unknown>;
}) => {
  const eventData = {
    action: 'onboarding_completed',
    category: 'onboarding',
    label: 'full_flow',
    value: data.totalTimeSeconds,
    userId: data.userId,
    properties: {
      totalTimeSeconds: data.totalTimeSeconds,
      stepsCompleted: data.stepsCompleted,
      totalSteps: data.totalSteps,
      completionRate: (data.stepsCompleted / data.totalSteps) * 100,
      timestamp: new Date().toISOString(),
      ...data.metadata,
    },
  };

  trackEvent(eventData);
  posthogEvent('onboarding_completed', eventData.properties);

  // Track in database
  trackOnboardingCompleted(data.userId).catch((error) => {
    Sentry.captureException(error);
  });

  // Track as business metric
  Sentry.metrics.increment('onboarding_completions', 1, {
    tags: {
      user_id: data.userId,
    },
  });

  // Track total time
  if (data.totalTimeSeconds) {
    Sentry.metrics.distribution(
      'onboarding_total_duration',
      data.totalTimeSeconds,
      {
        unit: 'second',
      }
    );
  }
};

/**
 * Track onboarding abandonment
 */
export const trackOnboardingFlowAbandoned = (data: {
  userId: string;
  step: string;
  stepNumber: number;
  totalSteps: number;
  timeSpentSeconds?: number;
  reason?: 'timeout' | 'manual_exit' | 'error' | 'unknown';
  metadata?: Record<string, unknown>;
}) => {
  const eventData = {
    action: 'onboarding_abandoned',
    category: 'onboarding',
    label: data.step,
    value: data.stepNumber,
    userId: data.userId,
    properties: {
      step: data.step,
      stepNumber: data.stepNumber,
      totalSteps: data.totalSteps,
      progress: (data.stepNumber / data.totalSteps) * 100,
      reason: data.reason,
      timeSpentSeconds: data.timeSpentSeconds,
      timestamp: new Date().toISOString(),
      ...data.metadata,
    },
  };

  trackEvent(eventData);
  posthogEvent('onboarding_abandoned', eventData.properties);

  // Track in database
  trackOnboardingAbandoned(data.userId, data.step).catch((error) => {
    Sentry.captureException(error);
  });

  // Track abandonment metrics
  Sentry.metrics.increment('onboarding_abandonments', 1, {
    tags: {
      step: data.step,
      step_number: `${data.stepNumber}`,
      reason: data.reason || 'unknown',
    },
  });
};

/**
 * Track feature discovery during onboarding
 */
export const trackFeatureDiscovered = (data: {
  userId: string;
  featureName: string;
  featureCategory: string;
  discoveryMethod: 'tutorial' | 'exploration' | 'prompt' | 'suggestion';
  onboardingStep?: string;
  metadata?: Record<string, unknown>;
}) => {
  const eventData = {
    action: 'feature_discovered',
    category: 'onboarding',
    label: data.featureName,
    userId: data.userId,
    properties: {
      featureName: data.featureName,
      featureCategory: data.featureCategory,
      discoveryMethod: data.discoveryMethod,
      onboardingStep: data.onboardingStep,
      timestamp: new Date().toISOString(),
      ...data.metadata,
    },
  };

  trackEvent(eventData);
  posthogEvent('feature_discovered', eventData.properties);

  // Track feature discovery rate
  Sentry.metrics.increment('feature_discoveries', 1, {
    tags: {
      feature: data.featureName,
      method: data.discoveryMethod,
    },
  });
};

/**
 * Track first important action (activation milestone)
 */
export const trackFirstAction = (data: {
  userId: string;
  actionType:
    | 'first_session_booked'
    | 'first_task_created'
    | 'first_goal_set'
    | 'first_resource_uploaded'
    | 'first_client_added'
    | 'first_message_sent';
  timeSinceSignupSeconds?: number;
  timeSinceOnboardingSeconds?: number;
  metadata?: Record<string, unknown>;
}) => {
  const eventData = {
    action: 'first_action',
    category: 'onboarding_activation',
    label: data.actionType,
    userId: data.userId,
    properties: {
      actionType: data.actionType,
      timeSinceSignupSeconds: data.timeSinceSignupSeconds,
      timeSinceOnboardingSeconds: data.timeSinceOnboardingSeconds,
      timestamp: new Date().toISOString(),
      ...data.metadata,
    },
  };

  trackEvent(eventData);
  posthogEvent('first_action', eventData.properties);

  // Track activation milestone
  Sentry.metrics.increment('user_activations', 1, {
    tags: {
      action: data.actionType,
    },
  });

  // Track time to first action
  if (data.timeSinceSignupSeconds) {
    Sentry.metrics.distribution(
      'time_to_first_action',
      data.timeSinceSignupSeconds,
      {
        tags: {
          action: data.actionType,
        },
        unit: 'second',
      }
    );
  }
};

/**
 * Track onboarding tooltip/hint interaction
 */
export const trackOnboardingHintInteraction = (data: {
  userId: string;
  hintId: string;
  action: 'viewed' | 'dismissed' | 'completed' | 'skipped';
  step?: string;
  metadata?: Record<string, unknown>;
}) => {
  const eventData = {
    action: 'onboarding_hint',
    category: 'onboarding',
    label: `${data.hintId}:${data.action}`,
    userId: data.userId,
    properties: {
      hintId: data.hintId,
      hintAction: data.action,
      step: data.step,
      timestamp: new Date().toISOString(),
      ...data.metadata,
    },
  };

  trackEvent(eventData);
  posthogEvent('onboarding_hint_interaction', eventData.properties);
};

/**
 * Track onboarding personalization choices
 */
export const trackOnboardingPersonalization = (data: {
  userId: string;
  personalizationType: 'role_selection' | 'goal_selection' | 'preference_setting' | 'feature_selection';
  selections: string[];
  metadata?: Record<string, unknown>;
}) => {
  const eventData = {
    action: 'onboarding_personalization',
    category: 'onboarding',
    label: data.personalizationType,
    userId: data.userId,
    properties: {
      personalizationType: data.personalizationType,
      selections: data.selections,
      selectionCount: data.selections.length,
      timestamp: new Date().toISOString(),
      ...data.metadata,
    },
  };

  trackEvent(eventData);
  posthogEvent('onboarding_personalization', eventData.properties);

  // Set user properties in PostHog for segmentation
  if (typeof window !== 'undefined' && window.posthog) {
    window.posthog.identify(data.userId, {
      [`onboarding_${data.personalizationType}`]: data.selections,
    });
  }
};

/**
 * Track onboarding re-engagement (user returns to incomplete onboarding)
 */
export const trackOnboardingReengagement = (data: {
  userId: string;
  currentStep: string;
  stepNumber: number;
  daysSinceLastVisit: number;
  metadata?: Record<string, unknown>;
}) => {
  const eventData = {
    action: 'onboarding_reengagement',
    category: 'onboarding',
    label: data.currentStep,
    value: data.daysSinceLastVisit,
    userId: data.userId,
    properties: {
      currentStep: data.currentStep,
      stepNumber: data.stepNumber,
      daysSinceLastVisit: data.daysSinceLastVisit,
      timestamp: new Date().toISOString(),
      ...data.metadata,
    },
  };

  trackEvent(eventData);
  posthogEvent('onboarding_reengagement', eventData.properties);

  // Track reengagement metric
  Sentry.metrics.increment('onboarding_reengagements', 1, {
    tags: {
      step: data.currentStep,
      days_away: `${Math.floor(data.daysSinceLastVisit)}`,
    },
  });
};
