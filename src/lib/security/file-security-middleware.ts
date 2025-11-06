import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export interface SecurityCheckResult {
  allowed: boolean;
  reason?: string;
  headers?: Record<string, string>;
  statusCode?: number;
}

/**
 * Comprehensive file security middleware
 */
export class FileSecurityMiddleware {
  private static readonly SUSPICIOUS_IPS = new Set<string>();
  private static readonly BLOCKED_IPS = new Set<string>();
  private static readonly HONEYPOT_PATHS = new Set([
    '/api/files/.env',
    '/api/files/config.json',
    '/api/files/admin',
    '/api/files/wp-admin',
    '/api/files/phpinfo.php',
  ]);

  /**
   * Main security check that orchestrates all security validations
   */
  static async performSecurityCheck(request: NextRequest): Promise<SecurityCheckResult> {
    try {
      // 1. IP-based security checks
      const ipCheck = await this.checkIPSecurity(request);
      if (!ipCheck.allowed) return ipCheck;

      // 2. Request validation
      const requestCheck = await this.validateRequest(request);
      if (!requestCheck.allowed) return requestCheck;

      // 3. User authentication and authorization
      const authCheck = await this.checkAuthentication(request);
      if (!authCheck.allowed) return authCheck;

      // 4. Rate limiting (handled by individual endpoints)
      
      // 5. Content security checks (for uploads)
      if (request.method === 'POST' && request.url.includes('/upload')) {
        const contentCheck = await this.checkUploadSecurity(request);
        if (!contentCheck.allowed) return contentCheck;
      }

      // 6. CSRF protection
      const csrfCheck = await this.checkCSRFProtection(request);
      if (!csrfCheck.allowed) return csrfCheck;

      return { allowed: true };

    } catch (error) {
      logger.error('Security check failed:', error);
      return {
        allowed: false,
        reason: 'Security validation error',
        statusCode: 500,
      };
    }
  }

  /**
   * IP-based security checks
   */
  private static async checkIPSecurity(request: NextRequest): Promise<SecurityCheckResult> {
    const headersList = await headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    const realIp = headersList.get('x-real-ip');
    const clientIp = forwardedFor?.split(',')[0] || realIp || request.ip || 'unknown';

    // Check if IP is blocked
    if (this.BLOCKED_IPS.has(clientIp)) {
      return {
        allowed: false,
        reason: 'IP address is blocked',
        statusCode: 403,
      };
    }

    // Honeypot check - detect bots and malicious actors
    const pathname = new URL(request.url).pathname;
    if (this.HONEYPOT_PATHS.has(pathname)) {
      // Add to suspicious IPs and potentially block
      this.SUSPICIOUS_IPS.add(clientIp);
      await this.logSuspiciousActivity(clientIp, 'honeypot_access', pathname);
      
      return {
        allowed: false,
        reason: 'Access to restricted resource',
        statusCode: 404, // Return 404 to not reveal it's a honeypot
      };
    }

    // Check for suspicious IP behavior patterns
    if (this.SUSPICIOUS_IPS.has(clientIp)) {
      // Additional scrutiny for suspicious IPs
      const suspiciousCheck = await this.checkSuspiciousIPBehavior(clientIp, request);
      if (!suspiciousCheck.allowed) {
        return suspiciousCheck;
      }
    }

    // Geographic restrictions (if configured)
    const geoCheck = await this.checkGeographicRestrictions(clientIp);
    if (!geoCheck.allowed) return geoCheck;

    return { allowed: true };
  }

  /**
   * Request validation and sanitization
   */
  private static async validateRequest(request: NextRequest): Promise<SecurityCheckResult> {
    const url = new URL(request.url);
    
    // Check for path traversal attacks
    if (url.pathname.includes('..') || url.pathname.includes('%2e%2e')) {
      return {
        allowed: false,
        reason: 'Path traversal attempt detected',
        statusCode: 400,
      };
    }

    // Check for SQL injection patterns in query parameters
    const sqlInjectionPatterns = [
      /(\bUNION\b.*\bSELECT\b)/i,
      /(\bSELECT\b.*\bFROM\b)/i,
      /(\bINSERT\b.*\bINTO\b)/i,
      /(\bDELETE\b.*\bFROM\b)/i,
      /(\bDROP\b.*\bTABLE\b)/i,
      /(\bALTER\b.*\bTABLE\b)/i,
      /(\bEXEC\b.*\()/i,
      /(\bxp_cmdshell\b)/i,
    ];

    const queryString = url.search;
    for (const pattern of sqlInjectionPatterns) {
      if (pattern.test(queryString)) {
        const headersList = await headers();
        const clientIp = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown';
        await this.logSuspiciousActivity(clientIp, 'sql_injection_attempt', queryString);
        
        return {
          allowed: false,
          reason: 'Malicious query detected',
          statusCode: 400,
        };
      }
    }

    // Check for XSS patterns in parameters
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
      /<embed\b[^<]*>/gi,
    ];

    for (const [key, value] of url.searchParams.entries()) {
      for (const pattern of xssPatterns) {
        if (pattern.test(value)) {
          const headersList = await headers();
          const clientIp = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown';
          await this.logSuspiciousActivity(clientIp, 'xss_attempt', `${key}=${value}`);
          
          return {
            allowed: false,
            reason: 'Potentially malicious content detected',
            statusCode: 400,
          };
        }
      }
    }

    // Validate User-Agent header
    const headersList = await headers();
    const userAgent = headersList.get('user-agent');
    
    if (!userAgent || userAgent.length < 10) {
      return {
        allowed: false,
        reason: 'Invalid or missing User-Agent header',
        statusCode: 400,
      };
    }

    // Check for automated/bot requests (beyond normal rate limiting)
    const suspiciousUserAgents = [
      /curl/i,
      /wget/i,
      /python/i,
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
    ];

    // Allow legitimate bots but track them
    if (suspiciousUserAgents.some(pattern => pattern.test(userAgent))) {
      const clientIp = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown';
      this.SUSPICIOUS_IPS.add(clientIp);
    }

    return { allowed: true };
  }

  /**
   * Authentication and authorization checks
   */
  private static async checkAuthentication(request: NextRequest): Promise<SecurityCheckResult> {
    try {
      const supabase = await createClient();
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        return {
          allowed: false,
          reason: 'Authentication required',
          statusCode: 401,
        };
      }

      // Check if user account is active and not suspended
      const { data: userProfile } = await supabase
        .from('users')
        .select('role, is_active, suspended_at')
        .eq('id', user.id)
        .single();

      if (!userProfile) {
        return {
          allowed: false,
          reason: 'User profile not found',
          statusCode: 404,
        };
      }

      if (!userProfile.is_active || userProfile.suspended_at) {
        return {
          allowed: false,
          reason: 'Account is suspended or inactive',
          statusCode: 403,
        };
      }

      // Check for session hijacking indicators
      const sessionCheck = await this.checkSessionSecurity(user, request);
      if (!sessionCheck.allowed) return sessionCheck;

      return { allowed: true };

    } catch (error) {
      logger.error('Authentication check failed:', error);
      return {
        allowed: false,
        reason: 'Authentication validation failed',
        statusCode: 500,
      };
    }
  }

  /**
   * Upload-specific security checks
   */
  private static async checkUploadSecurity(request: NextRequest): Promise<SecurityCheckResult> {
    try {
      // Check Content-Type header
      const contentType = request.headers.get('content-type');
      if (!contentType || !contentType.includes('multipart/form-data')) {
        return {
          allowed: false,
          reason: 'Invalid content type for file upload',
          statusCode: 400,
        };
      }

      // Check Content-Length to prevent extremely large uploads
      const contentLength = request.headers.get('content-length');
      if (contentLength) {
        const size = parseInt(contentLength);
        const maxSize = 500 * 1024 * 1024; // 500MB max
        
        if (size > maxSize) {
          return {
            allowed: false,
            reason: 'File size exceeds maximum allowed limit',
            statusCode: 413,
          };
        }
      }

      return { allowed: true };

    } catch (error) {
      logger.error('Upload security check failed:', error);
      return {
        allowed: false,
        reason: 'Upload validation failed',
        statusCode: 400,
      };
    }
  }

  /**
   * CSRF protection
   */
  private static async checkCSRFProtection(request: NextRequest): Promise<SecurityCheckResult> {
    // For state-changing operations, check CSRF token
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      const headersList = await headers();
      const origin = headersList.get('origin');
      
      // In production, implement proper CSRF token validation
      // For now, check that request comes from same origin
      if (origin) {
        const requestOrigin = new URL(request.url).origin;
        if (origin !== requestOrigin) {
          return {
            allowed: false,
            reason: 'CSRF protection: Invalid origin',
            statusCode: 403,
          };
        }
      }
    }

    return { allowed: true };
  }

  /**
   * Check for suspicious IP behavior patterns
   */
  private static async checkSuspiciousIPBehavior(
    clientIp: string, 
    request: NextRequest
  ): Promise<SecurityCheckResult> {
    // This would typically check against a database of recent requests
    // For now, implement basic rate limiting for suspicious IPs
    
    // Suspicious IPs get more restrictive rate limits
    // const suspiciousRateLimit = 10; // 10 requests per minute
    // const timeWindow = 60 * 1000; // 1 minute
    
    // This is a simplified implementation
    // In production, you'd use a distributed cache like Redis
    return { allowed: true }; // Allow for now but with increased monitoring
  }

  /**
   * Geographic restrictions
   */
  private static async checkGeographicRestrictions(clientIp: string): Promise<SecurityCheckResult> {
    // In production, you might want to restrict access from certain countries
    // This would integrate with a GeoIP service
    
    // For now, allow all geographic locations
    return { allowed: true };
  }

  /**
   * Session security checks
   */
  private static async checkSessionSecurity(
    user: any, 
    request: NextRequest
  ): Promise<SecurityCheckResult> {
    const headersList = await headers();

    // In production, you might want to:
    // 1. Track user sessions and detect concurrent sessions from different IPs
    // 2. Check for sudden changes in User-Agent or IP
    // 3. Validate session tokens haven't been tampered with

    return { allowed: true };
  }

  /**
   * Log suspicious activity
   */
  private static async logSuspiciousActivity(
    clientIp: string,
    activityType: string,
    details: string
  ): Promise<void> {
    try {
      const supabase = await createClient();
      
      await supabase
        .from('security_logs')
        .insert({
          ip_address: clientIp,
          activity_type: activityType,
          details: details,
          timestamp: new Date().toISOString(),
          severity: this.getSeverityLevel(activityType),
        });

      // If activity is severe enough, consider temporary IP blocking
      if (this.shouldBlockIP(activityType)) {
        this.BLOCKED_IPS.add(clientIp);
        
        // Log the IP block
        await supabase
          .from('security_logs')
          .insert({
            ip_address: clientIp,
            activity_type: 'ip_blocked',
            details: `IP blocked due to ${activityType}`,
            timestamp: new Date().toISOString(),
            severity: 'high',
          });
      }

    } catch (error) {
      logger.error('Failed to log suspicious activity:', error);
    }
  }

  /**
   * Determine severity level for different types of suspicious activity
   */
  private static getSeverityLevel(activityType: string): 'low' | 'medium' | 'high' | 'critical' {
    switch (activityType) {
      case 'sql_injection_attempt':
      case 'xss_attempt':
      case 'path_traversal_attempt':
        return 'critical';
      
      case 'honeypot_access':
      case 'suspicious_user_agent':
        return 'high';
      
      case 'rate_limit_exceeded':
      case 'invalid_request_format':
        return 'medium';
      
      default:
        return 'low';
    }
  }

  /**
   * Determine if IP should be blocked based on activity type
   */
  private static shouldBlockIP(activityType: string): boolean {
    const blockableActivities = [
      'sql_injection_attempt',
      'xss_attempt',
      'path_traversal_attempt',
      'repeated_honeypot_access',
    ];
    
    return blockableActivities.includes(activityType);
  }

  /**
   * Generate security headers for response
   */
  static getSecurityHeaders(): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https:;",
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    };
  }

  /**
   * Clean up blocked IPs periodically (should be called by a background job)
   */
  static cleanupBlockedIPs(): void {
    // In production, this would be more sophisticated
    // For now, clear blocked IPs every hour (this is just for demonstration)
    setInterval(() => {
      this.BLOCKED_IPS.clear();
      this.SUSPICIOUS_IPS.clear();
    }, 60 * 60 * 1000); // 1 hour
  }
}

/**
 * Middleware function to be used in API routes
 */
export async function applyFileSecurityMiddleware(request: NextRequest): Promise<NextResponse | null> {
  const securityCheck = await FileSecurityMiddleware.performSecurityCheck(request);
  
  if (!securityCheck.allowed) {
    return NextResponse.json(
      { 
        error: securityCheck.reason || 'Access denied',
        timestamp: new Date().toISOString(),
      },
      { 
        status: securityCheck.statusCode || 403,
        headers: FileSecurityMiddleware.getSecurityHeaders(),
      }
    );
  }

  return null; // Allow request to proceed
}
