/**
 * Marketing Analytics Tracking
 *
 * Tracks marketing conversion events including:
 * - Lead capture
 * - Signup flow progression
 * - Landing page interactions
 * - Marketing campaign effectiveness
 * - CTA performance
 * - A/B test variants
 */

import { trackEvent, posthogEvent } from './analytics';
import { trackEngagementEvent } from './event-tracking';
import * as Sentry from '@sentry/nextjs';

export interface MarketingConversionEvent {
  userId?: string;
  sessionId?: string;
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  referrer?: string;
  landingPage?: string;
  experimentId?: string;
  variantId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Track landing page view with marketing context
 */
export const trackLandingPageView = (data: MarketingConversionEvent) => {
  const eventData = {
    action: 'landing_page_view',
    category: 'marketing',
    label: data.landingPage,
    userId: data.userId,
    properties: {
      source: data.source,
      medium: data.medium,
      campaign: data.campaign,
      content: data.content,
      term: data.term,
      referrer: data.referrer,
      landingPage: data.landingPage,
      experimentId: data.experimentId,
      variantId: data.variantId,
      timestamp: new Date().toISOString(),
      ...data.metadata,
    },
  };

  trackEvent(eventData);
  posthogEvent('landing_page_view', eventData.properties);

  // Track in database for retention analysis
  trackEngagementEvent(
    data.userId || 'anonymous',
    'landing_page_view',
    data.landingPage || 'unknown',
    data.metadata
  ).catch((error) => {
    Sentry.captureException(error, {
      tags: { event_type: 'marketing_tracking_error' },
    });
  });
};

/**
 * Track lead capture (email signup, contact form, etc.)
 */
export const trackLeadCapture = (data: MarketingConversionEvent & {
  leadType: 'email_signup' | 'contact_form' | 'demo_request' | 'trial_signup' | 'waitlist';
  email?: string;
}) => {
  const eventData = {
    action: 'lead_capture',
    category: 'marketing_conversion',
    label: data.leadType,
    userId: data.userId,
    properties: {
      leadType: data.leadType,
      source: data.source,
      medium: data.medium,
      campaign: data.campaign,
      content: data.content,
      experimentId: data.experimentId,
      variantId: data.variantId,
      landingPage: data.landingPage,
      timestamp: new Date().toISOString(),
      ...data.metadata,
    },
  };

  trackEvent(eventData);
  posthogEvent('lead_capture', eventData.properties);

  // Track in database
  trackEngagementEvent(
    data.userId || 'anonymous',
    'lead_capture',
    data.leadType,
    {
      ...data.metadata,
      source: data.source,
      campaign: data.campaign,
    }
  ).catch((error) => {
    Sentry.captureException(error, {
      tags: { event_type: 'marketing_tracking_error' },
    });
  });

  // Track as business metric in Sentry
  Sentry.metrics.increment('lead_capture', 1, {
    tags: {
      type: data.leadType,
      source: data.source || 'unknown',
      campaign: data.campaign || 'none',
    },
  });
};

/**
 * Track signup flow progression
 */
export const trackSignupStep = (data: MarketingConversionEvent & {
  step: 'started' | 'email_entered' | 'password_created' | 'profile_created' | 'completed' | 'abandoned';
  stepNumber: number;
  totalSteps: number;
}) => {
  const eventData = {
    action: 'signup_step',
    category: 'marketing_conversion',
    label: data.step,
    value: data.stepNumber,
    userId: data.userId,
    properties: {
      step: data.step,
      stepNumber: data.stepNumber,
      totalSteps: data.totalSteps,
      progress: (data.stepNumber / data.totalSteps) * 100,
      source: data.source,
      medium: data.medium,
      campaign: data.campaign,
      experimentId: data.experimentId,
      variantId: data.variantId,
      timestamp: new Date().toISOString(),
      ...data.metadata,
    },
  };

  trackEvent(eventData);
  posthogEvent('signup_step', eventData.properties);

  // Track conversion funnel in PostHog
  if (typeof window !== 'undefined' && window.posthog) {
    window.posthog.capture('$funnel_step', {
      funnel_name: 'user_signup',
      step: data.stepNumber,
      step_name: data.step,
      ...eventData.properties,
    });
  }

  // Track abandonment
  if (data.step === 'abandoned') {
    Sentry.metrics.increment('signup_abandonment', 1, {
      tags: {
        step: `${data.stepNumber}`,
        source: data.source || 'unknown',
      },
    });
  }

  // Track completion
  if (data.step === 'completed') {
    Sentry.metrics.increment('signup_completion', 1, {
      tags: {
        source: data.source || 'unknown',
        campaign: data.campaign || 'none',
      },
    });
  }
};

/**
 * Track CTA (Call-to-Action) click with A/B testing context
 */
export const trackCTAClick = (data: MarketingConversionEvent & {
  ctaId: string;
  ctaText: string;
  ctaLocation: string;
  ctaType: 'primary' | 'secondary' | 'text_link';
  destination?: string;
}) => {
  const eventData = {
    action: 'cta_click',
    category: 'marketing',
    label: `${data.ctaLocation}:${data.ctaText}`,
    userId: data.userId,
    properties: {
      ctaId: data.ctaId,
      ctaText: data.ctaText,
      ctaLocation: data.ctaLocation,
      ctaType: data.ctaType,
      destination: data.destination,
      experimentId: data.experimentId,
      variantId: data.variantId,
      source: data.source,
      campaign: data.campaign,
      timestamp: new Date().toISOString(),
      ...data.metadata,
    },
  };

  trackEvent(eventData);
  posthogEvent('cta_click', eventData.properties);

  // Track CTA effectiveness
  Sentry.metrics.increment('cta_clicks', 1, {
    tags: {
      cta_id: data.ctaId,
      location: data.ctaLocation,
      type: data.ctaType,
      experiment: data.experimentId || 'none',
    },
  });
};

/**
 * Track marketing campaign conversion
 */
export const trackCampaignConversion = (data: MarketingConversionEvent & {
  conversionType: 'signup' | 'trial' | 'purchase' | 'booking' | 'download';
  conversionValue?: number;
  currency?: string;
}) => {
  const eventData = {
    action: 'campaign_conversion',
    category: 'marketing_conversion',
    label: data.conversionType,
    value: data.conversionValue,
    userId: data.userId,
    properties: {
      conversionType: data.conversionType,
      conversionValue: data.conversionValue,
      currency: data.currency,
      source: data.source,
      medium: data.medium,
      campaign: data.campaign,
      content: data.content,
      term: data.term,
      experimentId: data.experimentId,
      variantId: data.variantId,
      timestamp: new Date().toISOString(),
      ...data.metadata,
    },
  };

  trackEvent(eventData);
  posthogEvent('campaign_conversion', eventData.properties);

  // Track conversion value in Sentry
  if (data.conversionValue) {
    Sentry.metrics.distribution('conversion_value', data.conversionValue, {
      tags: {
        type: data.conversionType,
        campaign: data.campaign || 'none',
        source: data.source || 'unknown',
      },
      unit: data.currency || 'usd',
    });
  }

  // Track conversion count
  Sentry.metrics.increment('conversions', 1, {
    tags: {
      type: data.conversionType,
      campaign: data.campaign || 'none',
      source: data.source || 'unknown',
    },
  });
};

/**
 * Track A/B test variant view
 */
export const trackExperimentView = (data: MarketingConversionEvent & {
  experimentName: string;
  variantName: string;
  controlGroup: boolean;
}) => {
  const eventData = {
    action: 'experiment_view',
    category: 'experiments',
    label: `${data.experimentName}:${data.variantName}`,
    userId: data.userId,
    properties: {
      experimentId: data.experimentId,
      experimentName: data.experimentName,
      variantId: data.variantId,
      variantName: data.variantName,
      controlGroup: data.controlGroup,
      timestamp: new Date().toISOString(),
      ...data.metadata,
    },
  };

  trackEvent(eventData);
  posthogEvent('$feature_flag_called', {
    $feature_flag: data.experimentName,
    $feature_flag_response: data.variantName,
    ...eventData.properties,
  });

  // Track experiment exposure
  Sentry.metrics.increment('experiment_exposures', 1, {
    tags: {
      experiment: data.experimentName,
      variant: data.variantName,
      control: data.controlGroup ? 'yes' : 'no',
    },
  });
};

/**
 * Track user referral
 */
export const trackReferral = (data: MarketingConversionEvent & {
  referrerId: string;
  referralCode?: string;
  referralProgram?: string;
}) => {
  const eventData = {
    action: 'referral',
    category: 'marketing_growth',
    label: data.referralProgram || 'default',
    userId: data.userId,
    properties: {
      referrerId: data.referrerId,
      referralCode: data.referralCode,
      referralProgram: data.referralProgram,
      timestamp: new Date().toISOString(),
      ...data.metadata,
    },
  };

  trackEvent(eventData);
  posthogEvent('referral', eventData.properties);

  // Track referral metric
  Sentry.metrics.increment('referrals', 1, {
    tags: {
      program: data.referralProgram || 'default',
    },
  });
};

/**
 * Track newsletter signup
 */
export const trackNewsletterSignup = (data: MarketingConversionEvent & {
  email: string;
  frequency?: 'daily' | 'weekly' | 'monthly';
  topics?: string[];
}) => {
  const eventData = {
    action: 'newsletter_signup',
    category: 'marketing_growth',
    label: data.frequency || 'weekly',
    userId: data.userId,
    properties: {
      frequency: data.frequency,
      topics: data.topics,
      source: data.source,
      campaign: data.campaign,
      timestamp: new Date().toISOString(),
      ...data.metadata,
    },
  };

  trackEvent(eventData);
  posthogEvent('newsletter_signup', eventData.properties);

  // Track in database
  trackEngagementEvent(
    data.userId || 'anonymous',
    'newsletter_signup',
    data.frequency || 'weekly',
    data.metadata
  ).catch((error) => {
    Sentry.captureException(error);
  });
};
