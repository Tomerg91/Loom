/**
 * Analytics Consent Management
 *
 * Manages user consent for analytics tracking in compliance with GDPR and privacy regulations:
 * - Cookie consent
 * - Analytics opt-in/opt-out
 * - Data export
 * - Data deletion (Right to be Forgotten)
 */

import { createAdminClient } from '@/modules/platform/supabase/server';
import * as Sentry from '@sentry/nextjs';

// ============================================================================
// TYPES
// ============================================================================

export interface ConsentPreferences {
  userId: string;
  analyticsEnabled: boolean;
  performanceEnabled: boolean;
  marketingEnabled: boolean;
  functionalEnabled: boolean;
  consentDate: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface DataExportRequest {
  userId: string;
  email: string;
  requestDate: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  completedDate?: Date;
  downloadUrl?: string;
  expiresAt?: Date;
}

export interface DataDeletionRequest {
  userId: string;
  email: string;
  requestDate: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  completedDate?: Date;
  deletionConfirmation?: string;
}

// ============================================================================
// CONSENT MANAGEMENT
// ============================================================================

/**
 * Get user's current consent preferences
 */
export async function getUserConsent(userId: string): Promise<ConsentPreferences | null> {
  try {
    const supabase = await createAdminClient();

    const { data, error } = await supabase
      .from('user_consent_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No consent record found - return default
        return null;
      }
      throw error;
    }

    return {
      userId: data.user_id,
      analyticsEnabled: data.analytics_enabled,
      performanceEnabled: data.performance_enabled,
      marketingEnabled: data.marketing_enabled,
      functionalEnabled: data.functional_enabled,
      consentDate: new Date(data.consent_date),
      ipAddress: data.ip_address,
      userAgent: data.user_agent,
    };
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        privacy: 'get_consent',
        user_id: userId,
      },
    });
    return null;
  }
}

/**
 * Update user's consent preferences
 */
export async function updateUserConsent(
  preferences: ConsentPreferences
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createAdminClient();

    const { error } = await supabase.from('user_consent_preferences').upsert({
      user_id: preferences.userId,
      analytics_enabled: preferences.analyticsEnabled,
      performance_enabled: preferences.performanceEnabled,
      marketing_enabled: preferences.marketingEnabled,
      functional_enabled: preferences.functionalEnabled,
      consent_date: preferences.consentDate.toISOString(),
      ip_address: preferences.ipAddress,
      user_agent: preferences.userAgent,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      throw error;
    }

    // Track consent change
    Sentry.captureMessage('User consent updated', {
      level: 'info',
      tags: {
        privacy: 'consent_update',
        user_id: preferences.userId,
      },
      extra: {
        analyticsEnabled: preferences.analyticsEnabled,
        performanceEnabled: preferences.performanceEnabled,
        marketingEnabled: preferences.marketingEnabled,
      },
    });

    // Update PostHog opt-in/opt-out status
    if (typeof window !== 'undefined' && window.posthog) {
      if (preferences.analyticsEnabled) {
        window.posthog.opt_in_capturing?.();
      } else {
        window.posthog.opt_out_capturing?.();
      }
    }

    return { success: true };
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        privacy: 'update_consent',
        user_id: preferences.userId,
      },
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if user has given analytics consent
 */
export async function hasAnalyticsConsent(userId: string): Promise<boolean> {
  const consent = await getUserConsent(userId);

  // Default to opt-out for GDPR compliance
  return consent?.analyticsEnabled ?? false;
}

/**
 * Revoke all analytics consent
 */
export async function revokeAllConsent(userId: string): Promise<void> {
  await updateUserConsent({
    userId,
    analyticsEnabled: false,
    performanceEnabled: false,
    marketingEnabled: false,
    functionalEnabled: true, // Functional cookies remain for basic functionality
    consentDate: new Date(),
  });

  // Opt out of PostHog
  if (typeof window !== 'undefined' && window.posthog) {
    window.posthog.opt_out_capturing?.();
    window.posthog.reset();
  }
}

// ============================================================================
// DATA EXPORT (Right to Access)
// ============================================================================

/**
 * Request user data export
 */
export async function requestDataExport(
  userId: string,
  email: string
): Promise<{ success: boolean; requestId?: string; error?: string }> {
  try {
    const supabase = await createAdminClient();

    const { data, error } = await supabase
      .from('data_export_requests')
      .insert({
        user_id: userId,
        email,
        request_date: new Date().toISOString(),
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) {
      throw error;
    }

    Sentry.captureMessage('Data export requested', {
      level: 'info',
      tags: {
        privacy: 'data_export',
        user_id: userId,
      },
    });

    return { success: true, requestId: data.id };
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        privacy: 'request_data_export',
        user_id: userId,
      },
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Export user analytics data
 */
export async function exportUserAnalyticsData(userId: string): Promise<{
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}> {
  try {
    const supabase = await createAdminClient();

    // Collect all user analytics data
    const [events, onboarding, downloads, mfaLogs, securityEvents] = await Promise.all([
      supabase.from('events').select('*').eq('user_id', userId),
      supabase.from('onboarding_funnel').select('*').eq('user_id', userId),
      supabase.from('download_logs').select('*').eq('user_id', userId),
      supabase.from('mfa_audit_logs').select('*').eq('user_id', userId),
      supabase.from('security_events').select('*').eq('user_id', userId),
    ]);

    const exportData = {
      userId,
      exportDate: new Date().toISOString(),
      events: events.data || [],
      onboardingFunnel: onboarding.data || [],
      downloadLogs: downloads.data || [],
      mfaAuditLogs: mfaLogs.data || [],
      securityEvents: securityEvents.data || [],
      consentPreferences: await getUserConsent(userId),
    };

    Sentry.captureMessage('User data exported', {
      level: 'info',
      tags: {
        privacy: 'data_export',
        user_id: userId,
      },
      extra: {
        eventCount: exportData.events.length,
        totalRecords:
          exportData.events.length +
          exportData.onboardingFunnel.length +
          exportData.downloadLogs.length +
          exportData.mfaAuditLogs.length +
          exportData.securityEvents.length,
      },
    });

    return { success: true, data: exportData };
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        privacy: 'export_data',
        user_id: userId,
      },
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// DATA DELETION (Right to be Forgotten)
// ============================================================================

/**
 * Request user data deletion
 */
export async function requestDataDeletion(
  userId: string,
  email: string
): Promise<{ success: boolean; requestId?: string; error?: string }> {
  try {
    const supabase = await createAdminClient();

    const { data, error } = await supabase
      .from('data_deletion_requests')
      .insert({
        user_id: userId,
        email,
        request_date: new Date().toISOString(),
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) {
      throw error;
    }

    Sentry.captureMessage('Data deletion requested', {
      level: 'warning',
      tags: {
        privacy: 'data_deletion',
        user_id: userId,
      },
    });

    return { success: true, requestId: data.id };
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        privacy: 'request_data_deletion',
        user_id: userId,
      },
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete user analytics data (Right to be Forgotten)
 */
export async function deleteUserAnalyticsData(userId: string): Promise<{
  success: boolean;
  deletedCounts?: Record<string, number>;
  error?: string;
}> {
  try {
    const supabase = await createAdminClient();

    // Delete from all analytics tables
    const [events, onboarding, downloads, mfaLogs, securityEvents, consent] =
      await Promise.all([
        supabase
          .from('events')
          .delete()
          .eq('user_id', userId)
          .select('*', { count: 'exact', head: true }),
        supabase
          .from('onboarding_funnel')
          .delete()
          .eq('user_id', userId)
          .select('*', { count: 'exact', head: true }),
        supabase
          .from('download_logs')
          .delete()
          .eq('user_id', userId)
          .select('*', { count: 'exact', head: true }),
        supabase
          .from('mfa_audit_logs')
          .delete()
          .eq('user_id', userId)
          .select('*', { count: 'exact', head: true }),
        supabase
          .from('security_events')
          .delete()
          .eq('user_id', userId)
          .select('*', { count: 'exact', head: true }),
        supabase
          .from('user_consent_preferences')
          .delete()
          .eq('user_id', userId)
          .select('*', { count: 'exact', head: true }),
      ]);

    const deletedCounts = {
      events: events.count || 0,
      onboardingFunnel: onboarding.count || 0,
      downloadLogs: downloads.count || 0,
      mfaAuditLogs: mfaLogs.count || 0,
      securityEvents: securityEvents.count || 0,
      consentPreferences: consent.count || 0,
    };

    const totalDeleted = Object.values(deletedCounts).reduce((sum, count) => sum + count, 0);

    Sentry.captureMessage('User analytics data deleted', {
      level: 'warning',
      tags: {
        privacy: 'data_deletion',
        user_id: userId,
      },
      extra: {
        deletedCounts,
        totalDeleted,
      },
    });

    // Track deletion metric
    Sentry.metrics.increment('data_deletion', totalDeleted, {
      tags: {
        type: 'analytics',
      },
    });

    return { success: true, deletedCounts };
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        privacy: 'delete_analytics_data',
        user_id: userId,
      },
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// COMPLIANCE CHECKS
// ============================================================================

/**
 * Check GDPR compliance status
 */
export async function checkGDPRCompliance(): Promise<{
  compliant: boolean;
  issues: string[];
}> {
  const issues: string[] = [];

  try {
    const supabase = await createAdminClient();

    // Check for users without consent records
    const { count: usersWithoutConsent } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .is('consent_preference_id', null);

    if (usersWithoutConsent && usersWithoutConsent > 0) {
      issues.push(`${usersWithoutConsent} users without consent records`);
    }

    // Check for pending data export requests older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: oldExportRequests } = await supabase
      .from('data_export_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .lt('request_date', thirtyDaysAgo.toISOString());

    if (oldExportRequests && oldExportRequests > 0) {
      issues.push(`${oldExportRequests} data export requests pending > 30 days`);
    }

    // Check for pending deletion requests older than 30 days
    const { count: oldDeletionRequests } = await supabase
      .from('data_deletion_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .lt('request_date', thirtyDaysAgo.toISOString());

    if (oldDeletionRequests && oldDeletionRequests > 0) {
      issues.push(`${oldDeletionRequests} data deletion requests pending > 30 days`);
    }

    const compliant = issues.length === 0;

    if (!compliant) {
      Sentry.captureMessage('GDPR compliance issues detected', {
        level: 'warning',
        extra: {
          issueCount: issues.length,
          issues,
        },
      });
    }

    return { compliant, issues };
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        compliance: 'gdpr_check',
      },
    });

    return {
      compliant: false,
      issues: ['Error checking compliance'],
    };
  }
}

/**
 * Anonymize user data (alternative to deletion for analytics preservation)
 */
export async function anonymizeUserData(userId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createAdminClient();
    const anonymousId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Anonymize user ID in all analytics tables
    await Promise.all([
      supabase.from('events').update({ user_id: anonymousId }).eq('user_id', userId),
      supabase
        .from('onboarding_funnel')
        .update({ user_id: anonymousId })
        .eq('user_id', userId),
      supabase
        .from('download_logs')
        .update({ user_id: anonymousId })
        .eq('user_id', userId),
    ]);

    Sentry.captureMessage('User data anonymized', {
      level: 'info',
      tags: {
        privacy: 'data_anonymization',
        user_id: userId,
      },
      extra: {
        anonymousId,
      },
    });

    return { success: true };
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        privacy: 'anonymize_data',
        user_id: userId,
      },
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
