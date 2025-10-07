import { ANALYTICS_CONFIG } from '@/lib/config/analytics-constants';
import type { createClient } from '@/lib/supabase/server';

type SupabaseClientLike = ReturnType<typeof createClient>;

interface CoachSessionRateResult {
  rate: number;
  currency: string;
}

/**
 * Fetches the per-session rate configured for a coach. If no profile exists
 * (or the query fails) we fall back to the default analytics configuration so
 * that revenue calculations still succeed.
 */
export async function getCoachSessionRate(
  supabase: SupabaseClientLike,
  coachId: string
): Promise<CoachSessionRateResult> {
  const { data, error } = await supabase
    .from('coach_profiles')
    .select('session_rate, currency')
    .eq('coach_id', coachId)
    .maybeSingle();

  if (error) {
    console.warn('[coach-profile] Failed to load coach profile for rate', {
      coachId,
      error: error.message,
    });
  }

  if (!data) {
    return {
      rate: ANALYTICS_CONFIG.DEFAULT_SESSION_RATE,
      currency: 'USD',
    };
  }

  const parsedRate = Number(data.session_rate ?? ANALYTICS_CONFIG.DEFAULT_SESSION_RATE);

  return {
    rate: Number.isFinite(parsedRate) ? parsedRate : ANALYTICS_CONFIG.DEFAULT_SESSION_RATE,
    currency: data.currency || 'USD',
  };
}
