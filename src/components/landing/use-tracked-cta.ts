'use client';

/**
 * @file Custom hook for tracking CTA clicks and managing A/B test experiments.
 */

import { useEffect, useMemo, useState } from 'react';

import { trackCtaClick, trackExperimentView } from '@/lib/monitoring/analytics';
import type {
  CtaExperiment,
  CtaExperimentVariant,
} from '@/modules/platform/cms/types';

/**
 * Selects a variant based on weights using a deterministic hash-based approach.
 * This ensures the same user sees the same variant across sessions.
 */
function selectVariant(
  experimentId: string | undefined,
  variants: CtaExperimentVariant[],
  sessionId: string
): CtaExperimentVariant {
  if (variants.length === 0) {
    throw new Error('Variants array cannot be empty');
  }

  if (variants.length === 1) {
    return variants[0];
  }

  const hashInput = experimentId ? `${experimentId}:${sessionId}` : sessionId;

  // Simple hash function for deterministic variant selection
  let hash = 0;
  for (let i = 0; i < hashInput.length; i++) {
    const char = hashInput.charCodeAt(i);
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

export interface UseTrackedCtaParams {
  label: string;
  href: string;
  location: string;
  locale: string;
  experiment?: CtaExperiment;
}

export interface UseTrackedCtaResult {
  /** The effective label to display (either base label or experiment variant label) */
  label: string;
  /** Click handler that tracks the CTA click */
  handleClick: () => void;
}

/**
 * Hook for tracking CTA clicks and managing A/B test experiments.
 *
 * @example
 * ```tsx
 * const { label, handleClick } = useTrackedCta({
 *   label: action.label,
 *   href: action.href,
 *   location: 'hero-primary',
 *   locale: 'en',
 *   experiment: action.experiment,
 * });
 *
 * return (
 *   <Button onClick={handleClick}>
 *     {label}
 *   </Button>
 * );
 * ```
 */
export function useTrackedCta({
  label: baseLabel,
  href,
  location,
  locale,
  experiment,
}: UseTrackedCtaParams): UseTrackedCtaResult {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Determine the effective label and variant
  const { effectiveLabel, selectedVariant } = useMemo(() => {
    if (
      !experiment?.enabled ||
      !experiment.variants ||
      experiment.variants.length === 0
    ) {
      return { effectiveLabel: baseLabel, selectedVariant: null };
    }

    if (!mounted) {
      // During SSR, use the base label
      return { effectiveLabel: baseLabel, selectedVariant: null };
    }

    const sessionId = getSessionId();
    const variant = selectVariant(
      experiment.experimentId,
      experiment.variants,
      sessionId
    );
    return { effectiveLabel: variant.label, selectedVariant: variant };
  }, [experiment, baseLabel, mounted]);

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

  // Create click handler
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

  return {
    label: effectiveLabel,
    handleClick,
  };
}
