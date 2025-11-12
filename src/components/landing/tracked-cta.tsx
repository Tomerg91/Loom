'use client';

/**
 * @file Tracked CTA component that supports A/B testing and analytics.
 * Automatically tracks clicks and experiment views to Google Analytics and PostHog.
 */

import { useEffect, useMemo, useState } from 'react';

import { trackCtaClick, trackExperimentView } from '@/lib/monitoring/analytics';
import type {
  CtaExperiment,
  CtaExperimentVariant,
} from '@/modules/platform/cms/types';

export interface TrackedCtaProps {
  /**
   * Base label for the CTA (used if no experiment is active).
   */
  label: string;

  /**
   * CTA href destination.
   */
  href: string;

  /**
   * Location identifier for analytics (e.g., "hero-primary", "pricing-tier-1").
   */
  location: string;

  /**
   * Current locale for tracking.
   */
  locale: string;

  /**
   * Optional experiment configuration.
   */
  experiment?: CtaExperiment;

  /**
   * Optional className for styling.
   */
  className?: string;

  /**
   * Children render function that receives the resolved label.
   */
  children: (label: string) => React.ReactNode;
}

/**
 * Selects a variant based on weights using a deterministic hash-based approach.
 * This ensures the same user sees the same variant across sessions.
 */
function selectVariant(
  variants: CtaExperimentVariant[],
  sessionId: string
): CtaExperimentVariant {
  if (variants.length === 0) {
    throw new Error('Variants array cannot be empty');
  }

  if (variants.length === 1) {
    return variants[0];
  }

  // Simple hash function for deterministic variant selection
  let hash = 0;
  for (let i = 0; i < sessionId.length; i++) {
    const char = sessionId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Use absolute value and modulo to get a number between 0-100
  const score = Math.abs(hash) % 100;

  // Select variant based on cumulative weights
  let cumulative = 0;
  for (const variant of variants) {
    cumulative += variant.weight ?? 50;
    if (score < cumulative) {
      return variant;
    }
  }

  // Fallback to last variant if weights don't add up to 100
  return variants[variants.length - 1];
}

/**
 * Generates a simple session ID based on timestamp and random value.
 * In production, you might want to use a more sophisticated session tracking system.
 */
function getSessionId(): string {
  if (typeof window === 'undefined') {
    return 'server';
  }

  const storageKey = 'loom_experiment_session_id';
  let sessionId = sessionStorage.getItem(storageKey);

  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem(storageKey, sessionId);
  }

  return sessionId;
}

/**
 * TrackedCta component that supports A/B testing and analytics tracking.
 *
 * Features:
 * - Deterministic variant selection based on session ID
 * - Automatic experiment view tracking
 * - Click tracking with experiment metadata
 * - Locale-aware analytics
 */
export function TrackedCta({
  label,
  href,
  location,
  locale,
  experiment,
  className,
  children,
}: TrackedCtaProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Determine the effective label and variant
  const { effectiveLabel, selectedVariant } = useMemo(() => {
    if (!experiment?.enabled || !experiment.variants || experiment.variants.length === 0) {
      return { effectiveLabel: label, selectedVariant: null };
    }

    if (!mounted) {
      // During SSR, use the base label
      return { effectiveLabel: label, selectedVariant: null };
    }

    const sessionId = getSessionId();
    const variant = selectVariant(experiment.variants, sessionId);
    return { effectiveLabel: variant.label, selectedVariant: variant };
  }, [experiment, label, mounted]);

  // Track experiment view on mount (client-side only)
  useEffect(() => {
    if (
      mounted &&
      experiment?.enabled &&
      experiment.experimentId &&
      selectedVariant
    ) {
      trackExperimentView(
        experiment.experimentId,
        selectedVariant.id,
        location,
        locale
      );
    }
  }, [mounted, experiment, selectedVariant, location, locale]);

  // Handle click tracking
  const handleClick = () => {
    trackCtaClick(
      location,
      effectiveLabel,
      href,
      locale,
      experiment?.enabled ? experiment.experimentId : undefined,
      selectedVariant?.id
    );
  };

  return (
    <div onClick={handleClick} className={className}>
      {children(effectiveLabel)}
    </div>
  );
}
