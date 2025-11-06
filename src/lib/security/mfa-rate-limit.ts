/**
 * MFA-specific Rate Limiting and Security Features
 * 
 * This module provides enhanced rate limiting, brute force protection,
 * and audit logging specifically for MFA operations.
 */

import { createServerClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

// Rate limiting configuration
export const MFA_RATE_LIMITS = {
  // Per-user limits
  TOTP_ATTEMPTS_PER_15MIN: 5,
  TOTP_ATTEMPTS_PER_HOUR: 15,
  BACKUP_CODE_ATTEMPTS_PER_15MIN: 3,
  BACKUP_CODE_ATTEMPTS_PER_HOUR: 10,
  
  // Per-IP limits
  IP_ATTEMPTS_PER_15MIN: 20,
  IP_ATTEMPTS_PER_HOUR: 50,
  
  // Block durations
  SHORT_BLOCK_DURATION: 15 * 60 * 1000, // 15 minutes
  MEDIUM_BLOCK_DURATION: 60 * 60 * 1000, // 1 hour
  LONG_BLOCK_DURATION: 4 * 60 * 60 * 1000, // 4 hours
  
  // Progressive blocking thresholds
  PROGRESSIVE_BLOCK_THRESHOLD_1: 10, // First progressive block
  PROGRESSIVE_BLOCK_THRESHOLD_2: 25, // Second progressive block
  PROGRESSIVE_BLOCK_THRESHOLD_3: 50, // Long-term block
} as const;

// Suspicious activity patterns
export const SUSPICIOUS_PATTERNS = {
  RAPID_SUCCESSION_THRESHOLD: 1000, // 1 second between attempts
  SAME_CODE_REPETITION_LIMIT: 3,
  MULTIPLE_METHOD_SWITCHING: 5,
  GEOGRAPHIC_ANOMALY_THRESHOLD: 1000, // km distance threshold
} as const;

interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  resetTime: Date;
  blockDuration?: number;
}

interface SuspiciousActivityResult {
  isSuspicious: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  patterns: string[];
  recommendedAction: 'allow' | 'block' | 'require_additional_verification';
}

/**
 * Enhanced MFA Rate Limiter with progressive blocking
 */
export class MFARateLimiter {
  private supabase: ReturnType<typeof createServerClient>;
  
  constructor() {
    this.supabase = createServerClient();
  }

  /**
   * Check rate limits for MFA attempts
   */
  async checkRateLimit(
    userId: string,
    method: 'totp' | 'backup_code',
    ipAddress?: string
  ): Promise<RateLimitResult> {
    try {
      const now = new Date();
      const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Get recent attempts for this user and method
      const { data: userAttempts, error: userError } = await this.supabase
        .from('mfa_attempts')
        .select('created_at, success, method')
        .eq('user_id', userId)
        .eq('method', method)
        .gte('created_at', oneHourAgo.toISOString())
        .order('created_at', { ascending: false });

      if (userError) {
        logger.error('Error checking user rate limit:', userError);
        return { allowed: false, remainingAttempts: 0, resetTime: now };
      }

      // Count failed attempts in different time windows
      const failedAttempts15Min = userAttempts?.filter(
        (attempt: any) => !attempt.success && new Date(attempt.createdAt || attempt.created_at) >= fifteenMinutesAgo
      ).length || 0;

      const failedAttempts1Hour = userAttempts?.filter(
        attempt => !attempt.success
      ).length || 0;

      // Determine limits based on method
      const limit15Min = method === 'totp' 
        ? MFA_RATE_LIMITS.TOTP_ATTEMPTS_PER_15MIN 
        : MFA_RATE_LIMITS.BACKUP_CODE_ATTEMPTS_PER_15MIN;
      
      const limit1Hour = method === 'totp'
        ? MFA_RATE_LIMITS.TOTP_ATTEMPTS_PER_HOUR
        : MFA_RATE_LIMITS.BACKUP_CODE_ATTEMPTS_PER_HOUR;

      // Check 15-minute window
      if (failedAttempts15Min >= limit15Min) {
        return {
          allowed: false,
          remainingAttempts: 0,
          resetTime: new Date(fifteenMinutesAgo.getTime() + 15 * 60 * 1000),
          blockDuration: MFA_RATE_LIMITS.SHORT_BLOCK_DURATION
        };
      }

      // Check 1-hour window
      if (failedAttempts1Hour >= limit1Hour) {
        return {
          allowed: false,
          remainingAttempts: 0,
          resetTime: new Date(oneHourAgo.getTime() + 60 * 60 * 1000),
          blockDuration: MFA_RATE_LIMITS.MEDIUM_BLOCK_DURATION
        };
      }

      // Check IP-based rate limiting if IP is provided
      if (ipAddress) {
        const ipResult = await this.checkIPRateLimit(ipAddress);
        if (!ipResult.allowed) {
          return ipResult;
        }
      }

      // Calculate remaining attempts
      const remainingAttempts = Math.min(
        limit15Min - failedAttempts15Min,
        limit1Hour - failedAttempts1Hour
      );

      return {
        allowed: true,
        remainingAttempts,
        resetTime: new Date(fifteenMinutesAgo.getTime() + 15 * 60 * 1000)
      };

    } catch (error) {
      logger.error('Rate limit check failed:', error);
      // Fail closed - deny access on error
      return { allowed: false, remainingAttempts: 0, resetTime: new Date() };
    }
  }

  /**
   * Check IP-based rate limiting
   */
  private async checkIPRateLimit(ipAddress: string): Promise<RateLimitResult> {
    try {
      const now = new Date();
      const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const { data: ipAttempts, error } = await this.supabase
        .from('mfa_attempts')
        .select('created_at, success')
        .eq('ip_address', ipAddress)
        .gte('created_at', oneHourAgo.toISOString());

      if (error) {
        logger.error('Error checking IP rate limit:', error);
        return { allowed: false, remainingAttempts: 0, resetTime: now };
      }

      const failedAttempts15Min = ipAttempts?.filter(
        (attempt: any) => !attempt.success && new Date(attempt.createdAt || attempt.created_at) >= fifteenMinutesAgo
      ).length || 0;

      const failedAttempts1Hour = ipAttempts?.filter(
        attempt => !attempt.success
      ).length || 0;

      // Check IP limits
      if (failedAttempts15Min >= MFA_RATE_LIMITS.IP_ATTEMPTS_PER_15MIN) {
        return {
          allowed: false,
          remainingAttempts: 0,
          resetTime: new Date(fifteenMinutesAgo.getTime() + 15 * 60 * 1000),
          blockDuration: MFA_RATE_LIMITS.SHORT_BLOCK_DURATION
        };
      }

      if (failedAttempts1Hour >= MFA_RATE_LIMITS.IP_ATTEMPTS_PER_HOUR) {
        return {
          allowed: false,
          remainingAttempts: 0,
          resetTime: new Date(oneHourAgo.getTime() + 60 * 60 * 1000),
          blockDuration: MFA_RATE_LIMITS.MEDIUM_BLOCK_DURATION
        };
      }

      return {
        allowed: true,
        remainingAttempts: MFA_RATE_LIMITS.IP_ATTEMPTS_PER_15MIN - failedAttempts15Min,
        resetTime: new Date(fifteenMinutesAgo.getTime() + 15 * 60 * 1000)
      };

    } catch (error) {
      logger.error('IP rate limit check failed:', error);
      return { allowed: false, remainingAttempts: 0, resetTime: new Date() };
    }
  }

  /**
   * Analyze suspicious activity patterns
   */
  async analyzeSuspiciousActivity(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
    timeWindow = 60 * 60 * 1000 // 1 hour
  ): Promise<SuspiciousActivityResult> {
    try {
      const now = new Date();
      const windowStart = new Date(now.getTime() - timeWindow);

      // Get recent attempts for analysis
      const { data: attempts, error } = await this.supabase
        .from('mfa_attempts')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', windowStart.toISOString())
        .order('created_at', { ascending: false });

      if (error || !attempts) {
        logger.error('Error analyzing suspicious activity:', error);
        return {
          isSuspicious: false,
          riskLevel: 'low',
          patterns: [],
          recommendedAction: 'allow'
        };
      }

      const patterns: string[] = [];
      let riskLevel: SuspiciousActivityResult['riskLevel'] = 'low';

      // Pattern 1: Rapid succession attempts
      const rapidAttempts = attempts.filter((attempt, index) => {
        if (index === attempts.length - 1) return false;
        const currentTime = new Date(attempt.createdAt || attempt.created_at).getTime();
        const nextTime = new Date(attempts[index + 1].createdAt || attempts[index + 1].created_at).getTime();
        return Math.abs(currentTime - nextTime) < SUSPICIOUS_PATTERNS.RAPID_SUCCESSION_THRESHOLD;
      });

      if (rapidAttempts.length > 3) {
        patterns.push('rapid_succession_attempts');
        riskLevel = 'medium';
      }

      // Pattern 2: Same code repetition
      const codeCounts = new Map<string, number>();
      attempts.forEach(attempt => {
        if (attempt.error_message?.includes('Invalid')) {
          // This is a simplified check - in production, you'd want to hash codes
          const key = `${attempt.method}_${(attempt.createdAt || attempt.created_at).slice(0, 16)}`; // Group by time
          codeCounts.set(key, (codeCounts.get(key) || 0) + 1);
        }
      });

      const maxRepeats = Math.max(...Array.from(codeCounts.values()));
      if (maxRepeats >= SUSPICIOUS_PATTERNS.SAME_CODE_REPETITION_LIMIT) {
        patterns.push('repeated_invalid_codes');
        riskLevel = 'high';
      }

      // Pattern 3: Method switching
      const methodSwitches = attempts.reduce((switches, attempt, index) => {
        if (index === 0) return 0;
        return attempt.method !== attempts[index - 1].method ? switches + 1 : switches;
      }, 0);

      if (methodSwitches >= SUSPICIOUS_PATTERNS.MULTIPLE_METHOD_SWITCHING) {
        patterns.push('frequent_method_switching');
        riskLevel = 'medium';
      }

      // Pattern 4: High failure rate
      const failureRate = attempts.filter(a => !a.success).length / attempts.length;
      if (attempts.length > 10 && failureRate > 0.9) {
        patterns.push('high_failure_rate');
        riskLevel = 'high';
      }

      // Pattern 5: IP address changes (if available)
      if (ipAddress) {
        const ipChanges = new Set(attempts.map(a => a.ip_address).filter(Boolean));
        if (ipChanges.size > 3 && attempts.length > 5) {
          patterns.push('multiple_ip_addresses');
          riskLevel = 'high';
        }
      }

      // Pattern 6: User agent changes (if available)
      if (userAgent) {
        const userAgentChanges = new Set(attempts.map(a => a.user_agent).filter(Boolean));
        if (userAgentChanges.size > 2 && attempts.length > 3) {
          patterns.push('multiple_user_agents');
          riskLevel = 'medium';
        }
      }

      // Determine if activity is suspicious
      const isSuspicious = patterns.length > 0;

      // Upgrade risk level based on pattern combinations
      if (patterns.length >= 3) {
        riskLevel = 'critical';
      } else if (patterns.length >= 2) {
        riskLevel = 'high';
      }

      // Determine recommended action
      let recommendedAction: SuspiciousActivityResult['recommendedAction'] = 'allow';
      if (riskLevel === 'critical') {
        recommendedAction = 'block';
      } else if (riskLevel === 'high') {
        recommendedAction = 'require_additional_verification';
      }

      return {
        isSuspicious,
        riskLevel,
        patterns,
        recommendedAction
      };

    } catch (error) {
      logger.error('Suspicious activity analysis failed:', error);
      return {
        isSuspicious: false,
        riskLevel: 'low',
        patterns: [],
        recommendedAction: 'allow'
      };
    }
  }

  /**
   * Log security event with risk assessment
   */
  async logSecurityEvent(
    userId: string,
    eventType: string,
    riskLevel: 'low' | 'medium' | 'high' | 'critical',
    details: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await this.supabase
        .rpc('log_mfa_event', {
          user_uuid: userId,
          event_type_val: 'verify_failure', // Map to existing enum
          ip_addr: ipAddress,
          user_agent_val: userAgent,
          metadata_val: JSON.stringify({
            security_event_type: eventType,
            risk_level: riskLevel,
            details,
            timestamp: new Date().toISOString()
          })
        });
    } catch (error) {
      logger.error('Failed to log security event:', error);
    }
  }

  /**
   * Progressive blocking based on historical failures
   */
  async getProgressiveBlockDuration(userId: string): Promise<number> {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Get recent failure counts
      const { data: recentFailures, error } = await this.supabase
        .from('mfa_attempts')
        .select('created_at')
        .eq('user_id', userId)
        .eq('success', false)
        .gte('created_at', sevenDaysAgo.toISOString());

      if (error || !recentFailures) {
        return MFA_RATE_LIMITS.SHORT_BLOCK_DURATION;
      }

      const failuresLast24h = recentFailures.filter(
        (f: any) => new Date(f.createdAt || f.created_at) >= twentyFourHoursAgo
      ).length;

      const totalFailures7d = recentFailures.length;

      // Progressive blocking logic
      if (totalFailures7d >= MFA_RATE_LIMITS.PROGRESSIVE_BLOCK_THRESHOLD_3) {
        return MFA_RATE_LIMITS.LONG_BLOCK_DURATION;
      } else if (totalFailures7d >= MFA_RATE_LIMITS.PROGRESSIVE_BLOCK_THRESHOLD_2 || failuresLast24h >= 20) {
        return MFA_RATE_LIMITS.MEDIUM_BLOCK_DURATION;
      } else if (totalFailures7d >= MFA_RATE_LIMITS.PROGRESSIVE_BLOCK_THRESHOLD_1 || failuresLast24h >= 10) {
        return MFA_RATE_LIMITS.SHORT_BLOCK_DURATION;
      }

      return MFA_RATE_LIMITS.SHORT_BLOCK_DURATION;

    } catch (error) {
      logger.error('Progressive block calculation failed:', error);
      return MFA_RATE_LIMITS.SHORT_BLOCK_DURATION;
    }
  }
}

// Export singleton instance
export const mfaRateLimiter = new MFARateLimiter();