/**
 * Server-Side Event Tracking
 * Comprehensive event tracking system that writes events to the database
 * for funnel analytics, engagement metrics, and productivity tracking.
 */

import { createClient } from '@/lib/supabase/server';
import type {
  EventCategory,
  TrackEventParams,
  OnboardingStep,
} from '@/types/analytics';

/**
 * Track an event in the database
 */
export async function trackEvent(params: TrackEventParams): Promise<void> {
  try {
    const supabase = await createClient();

    const eventData = {
      event_name: params.eventName,
      event_category: params.eventCategory,
      user_id: params.userId,
      properties: params.properties || {},
      context: await getEventContext(),
      related_session_id: params.relatedSessionId,
      related_task_id: params.relatedTaskId,
      related_goal_id: params.relatedGoalId,
    };

    const { error } = await supabase.from('events').insert(eventData);

    if (error) {
      console.error('Failed to track event:', error);
      // Don't throw - analytics failures shouldn't break the app
    }
  } catch (error) {
    console.error('Error tracking event:', error);
  }
}

/**
 * Get event context (device, browser, etc.)
 * This should be called from the client and passed to server actions
 */
export function getEventContext(): Record<string, unknown> {
  if (typeof window === 'undefined') {
    return {};
  }

  return {
    userAgent: navigator.userAgent,
    locale: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    referrer: document.referrer || undefined,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
  };
}

// =====================================================================
// AUTHENTICATION EVENTS
// =====================================================================

/**
 * Track signup started
 */
export async function trackSignupStarted(
  email: string,
  properties?: Record<string, unknown>
): Promise<void> {
  await trackEvent({
    eventName: 'signup_started',
    eventCategory: 'authentication',
    properties: {
      email,
      ...properties,
    },
  });
}

/**
 * Track signup completed
 */
export async function trackSignupCompleted(
  userId: string,
  role: string,
  properties?: Record<string, unknown>
): Promise<void> {
  await trackEvent({
    eventName: 'signup_completed',
    eventCategory: 'authentication',
    userId,
    properties: {
      role,
      ...properties,
    },
  });

  // Also record in onboarding funnel
  await recordOnboardingStep(userId, 'signup_completed');
}

/**
 * Track login
 */
export async function trackLogin(
  userId: string,
  method: string,
  properties?: Record<string, unknown>
): Promise<void> {
  await trackEvent({
    eventName: 'login',
    eventCategory: 'authentication',
    userId,
    properties: {
      method,
      ...properties,
    },
  });
}

/**
 * Track MFA setup
 */
export async function trackMfaSetup(
  userId: string,
  method: string,
  properties?: Record<string, unknown>
): Promise<void> {
  await trackEvent({
    eventName: 'mfa_setup',
    eventCategory: 'authentication',
    userId,
    properties: {
      method,
      ...properties,
    },
  });

  // Also record in onboarding funnel
  await recordOnboardingStep(userId, 'mfa_setup');
}

// =====================================================================
// ONBOARDING EVENTS
// =====================================================================

/**
 * Record onboarding step completion
 */
export async function recordOnboardingStep(
  userId: string,
  step: OnboardingStep,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.from('onboarding_funnel').insert({
      user_id: userId,
      step,
      metadata: metadata || {},
    });

    if (error) {
      console.error('Failed to record onboarding step:', error);
    }
  } catch (error) {
    console.error('Error recording onboarding step:', error);
  }
}

/**
 * Track onboarding progress
 */
export async function trackOnboardingProgress(
  userId: string,
  step: string,
  properties?: Record<string, unknown>
): Promise<void> {
  await trackEvent({
    eventName: 'onboarding_progress',
    eventCategory: 'onboarding',
    userId,
    properties: {
      step,
      ...properties,
    },
  });

  // Map step to funnel step
  const stepMap: Record<string, OnboardingStep> = {
    profile_started: 'profile_started',
    profile_completed: 'profile_completed',
    preferences_completed: 'preferences_completed',
  };

  const funnelStep = stepMap[step];
  if (funnelStep) {
    await recordOnboardingStep(userId, funnelStep, properties);
  }
}

/**
 * Track onboarding completion
 */
export async function trackOnboardingCompleted(
  userId: string,
  role: string,
  properties?: Record<string, unknown>
): Promise<void> {
  await trackEvent({
    eventName: 'onboarding_completed',
    eventCategory: 'onboarding',
    userId,
    properties: {
      role,
      ...properties,
    },
  });

  // Record in onboarding funnel
  await recordOnboardingStep(userId, 'onboarding_completed', properties);
}

// =====================================================================
// SESSION EVENTS
// =====================================================================

/**
 * Track session booked
 */
export async function trackSessionBooked(
  userId: string,
  sessionId: string,
  coachId: string,
  properties?: Record<string, unknown>
): Promise<void> {
  await trackEvent({
    eventName: 'session_booked',
    eventCategory: 'session',
    userId,
    relatedSessionId: sessionId,
    properties: {
      coachId,
      ...properties,
    },
  });
}

/**
 * Track session completed
 */
export async function trackSessionCompleted(
  userId: string,
  sessionId: string,
  durationMinutes: number,
  properties?: Record<string, unknown>
): Promise<void> {
  await trackEvent({
    eventName: 'session_completed',
    eventCategory: 'session',
    userId,
    relatedSessionId: sessionId,
    properties: {
      durationMinutes,
      ...properties,
    },
  });
}

/**
 * Track session cancelled
 */
export async function trackSessionCancelled(
  userId: string,
  sessionId: string,
  reason?: string,
  properties?: Record<string, unknown>
): Promise<void> {
  await trackEvent({
    eventName: 'session_cancelled',
    eventCategory: 'session',
    userId,
    relatedSessionId: sessionId,
    properties: {
      reason,
      ...properties,
    },
  });
}

/**
 * Track session rated
 */
export async function trackSessionRated(
  userId: string,
  sessionId: string,
  rating: number,
  properties?: Record<string, unknown>
): Promise<void> {
  await trackEvent({
    eventName: 'session_rated',
    eventCategory: 'session',
    userId,
    relatedSessionId: sessionId,
    properties: {
      rating,
      ...properties,
    },
  });
}

// =====================================================================
// TASK EVENTS
// =====================================================================

/**
 * Track task created
 */
export async function trackTaskCreated(
  userId: string,
  taskId: string,
  properties?: Record<string, unknown>
): Promise<void> {
  await trackEvent({
    eventName: 'task_created',
    eventCategory: 'task',
    userId,
    relatedTaskId: taskId,
    properties,
  });
}

/**
 * Track task updated
 */
export async function trackTaskUpdated(
  userId: string,
  taskId: string,
  properties?: Record<string, unknown>
): Promise<void> {
  await trackEvent({
    eventName: 'task_updated',
    eventCategory: 'task',
    userId,
    relatedTaskId: taskId,
    properties,
  });
}

/**
 * Track task completed
 */
export async function trackTaskCompleted(
  userId: string,
  taskId: string,
  properties?: Record<string, unknown>
): Promise<void> {
  await trackEvent({
    eventName: 'task_completed',
    eventCategory: 'task',
    userId,
    relatedTaskId: taskId,
    properties,
  });
}

// =====================================================================
// GOAL EVENTS
// =====================================================================

/**
 * Track goal created
 */
export async function trackGoalCreated(
  userId: string,
  goalId: string,
  properties?: Record<string, unknown>
): Promise<void> {
  await trackEvent({
    eventName: 'goal_created',
    eventCategory: 'goal',
    userId,
    relatedGoalId: goalId,
    properties,
  });
}

/**
 * Track goal updated
 */
export async function trackGoalUpdated(
  userId: string,
  goalId: string,
  properties?: Record<string, unknown>
): Promise<void> {
  await trackEvent({
    eventName: 'goal_updated',
    eventCategory: 'goal',
    userId,
    relatedGoalId: goalId,
    properties,
  });
}

/**
 * Track goal progress
 */
export async function trackGoalProgress(
  userId: string,
  goalId: string,
  previousPercentage: number,
  newPercentage: number,
  properties?: Record<string, unknown>
): Promise<void> {
  await trackEvent({
    eventName: 'goal_progress',
    eventCategory: 'goal',
    userId,
    relatedGoalId: goalId,
    properties: {
      previousPercentage,
      newPercentage,
      ...properties,
    },
  });

  // Also record in goal_progress_updates table
  try {
    const supabase = await createClient();
    await supabase.from('goal_progress_updates').insert({
      goal_id: goalId,
      user_id: userId,
      previous_percentage: previousPercentage,
      new_percentage: newPercentage,
      notes: properties?.notes as string | undefined,
      related_session_id: properties?.sessionId as string | undefined,
      related_task_id: properties?.taskId as string | undefined,
    });
  } catch (error) {
    console.error('Failed to record goal progress update:', error);
  }
}

/**
 * Track goal completed
 */
export async function trackGoalCompleted(
  userId: string,
  goalId: string,
  properties?: Record<string, unknown>
): Promise<void> {
  await trackEvent({
    eventName: 'goal_completed',
    eventCategory: 'goal',
    userId,
    relatedGoalId: goalId,
    properties,
  });
}

// =====================================================================
// RESOURCE EVENTS
// =====================================================================

/**
 * Track resource viewed
 */
export async function trackResourceViewed(
  userId: string,
  resourceId: string,
  properties?: Record<string, unknown>
): Promise<void> {
  await trackEvent({
    eventName: 'resource_viewed',
    eventCategory: 'resource',
    userId,
    properties: {
      resourceId,
      ...properties,
    },
  });
}

/**
 * Track resource downloaded
 */
export async function trackResourceDownloaded(
  userId: string,
  resourceId: string,
  properties?: Record<string, unknown>
): Promise<void> {
  await trackEvent({
    eventName: 'resource_downloaded',
    eventCategory: 'resource',
    userId,
    properties: {
      resourceId,
      ...properties,
    },
  });
}

/**
 * Track resource shared
 */
export async function trackResourceShared(
  userId: string,
  resourceId: string,
  properties?: Record<string, unknown>
): Promise<void> {
  await trackEvent({
    eventName: 'resource_shared',
    eventCategory: 'resource',
    userId,
    properties: {
      resourceId,
      ...properties,
    },
  });
}

/**
 * Track resource created (for coaches)
 */
export async function trackResourceCreated(
  userId: string,
  resourceId: string,
  properties?: Record<string, unknown>
): Promise<void> {
  await trackEvent({
    eventName: 'resource_created',
    eventCategory: 'resource',
    userId,
    properties: {
      resourceId,
      ...properties,
    },
  });
}

// =====================================================================
// ENGAGEMENT EVENTS
// =====================================================================

/**
 * Track message sent
 */
export async function trackMessageSent(
  userId: string,
  conversationId: string,
  properties?: Record<string, unknown>
): Promise<void> {
  await trackEvent({
    eventName: 'message_sent',
    eventCategory: 'engagement',
    userId,
    properties: {
      conversationId,
      ...properties,
    },
  });
}

/**
 * Track feature used
 */
export async function trackFeatureUsed(
  userId: string,
  featureName: string,
  properties?: Record<string, unknown>
): Promise<void> {
  await trackEvent({
    eventName: 'feature_used',
    eventCategory: 'engagement',
    userId,
    properties: {
      featureName,
      ...properties,
    },
  });
}

// =====================================================================
// PAYMENT EVENTS
// =====================================================================

/**
 * Track payment initiated
 */
export async function trackPaymentInitiated(
  userId: string,
  amount: number,
  currency: string,
  properties?: Record<string, unknown>
): Promise<void> {
  await trackEvent({
    eventName: 'payment_initiated',
    eventCategory: 'payment',
    userId,
    properties: {
      amount,
      currency,
      ...properties,
    },
  });
}

/**
 * Track payment completed
 */
export async function trackPaymentCompleted(
  userId: string,
  amount: number,
  currency: string,
  properties?: Record<string, unknown>
): Promise<void> {
  await trackEvent({
    eventName: 'payment_completed',
    eventCategory: 'payment',
    userId,
    properties: {
      amount,
      currency,
      ...properties,
    },
  });
}

/**
 * Track payment failed
 */
export async function trackPaymentFailed(
  userId: string,
  amount: number,
  currency: string,
  reason: string,
  properties?: Record<string, unknown>
): Promise<void> {
  await trackEvent({
    eventName: 'payment_failed',
    eventCategory: 'payment',
    userId,
    properties: {
      amount,
      currency,
      reason,
      ...properties,
    },
  });
}

// =====================================================================
// BATCH EVENT TRACKING
// =====================================================================

/**
 * Track multiple events at once
 */
export async function trackEventsBatch(
  events: TrackEventParams[]
): Promise<void> {
  try {
    const supabase = await createClient();
    const context = await getEventContext();

    const eventData = events.map((event) => ({
      event_name: event.eventName,
      event_category: event.eventCategory,
      user_id: event.userId,
      properties: event.properties || {},
      context,
      related_session_id: event.relatedSessionId,
      related_task_id: event.relatedTaskId,
      related_goal_id: event.relatedGoalId,
    }));

    const { error } = await supabase.from('events').insert(eventData);

    if (error) {
      console.error('Failed to track batch events:', error);
    }
  } catch (error) {
    console.error('Error tracking batch events:', error);
  }
}
