import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/services/auth-service';
import { adminSystemService } from '@/lib/database/admin-system';
import { ApiResponseHelper } from '@/lib/api/types';
import { applyRateLimit } from '@/lib/security/rate-limit';

export interface AdminMiddlewareOptions {
  requireSuperAdmin?: boolean;
  logActivity?: boolean;
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
  auditAction?: string;
  auditResource?: string;
}

/**
 * Enhanced middleware for admin-only routes with comprehensive security features
 */
export async function adminSecurityMiddleware(
  request: NextRequest,
  options: AdminMiddlewareOptions = {}
) {
  try {
    // 1. Authentication check
    const session = await authService.getSession();
    
    if (!session?.user) {
      return {
        success: false,
        response: ApiResponseHelper.unauthorized('Authentication required')
      };
    }

    // 2. Authorization check
    const isAdmin = session.user.role === 'admin';
    const isSuperAdmin = session.user.role === 'admin' && session.user.email?.includes('@loom.com'); // Example super admin check
    
    if (!isAdmin) {
      await adminSystemService.logAuditEvent(
        session.user.id,
        'security_event',
        'admin_access_denied',
        session.user.id,
        'Unauthorized admin access attempt',
        {
          requestPath: request.nextUrl.pathname,
          userRole: session.user.role,
          timestamp: new Date().toISOString()
        },
        'high',
        getClientIP(request),
        request.headers.get('user-agent') || undefined
      );
      
      return {
        success: false,
        response: ApiResponseHelper.forbidden('Admin privileges required')
      };
    }

    if (options.requireSuperAdmin && !isSuperAdmin) {
      await adminSystemService.logAuditEvent(
        session.user.id,
        'security_event',
        'super_admin_access_denied',
        session.user.id,
        'Unauthorized super admin access attempt',
        {
          requestPath: request.nextUrl.pathname,
          userRole: session.user.role,
          timestamp: new Date().toISOString()
        },
        'critical',
        getClientIP(request),
        request.headers.get('user-agent') || undefined
      );
      
      return {
        success: false,
        response: ApiResponseHelper.forbidden('Super admin privileges required')
      };
    }

    // 3. Rate limiting
    if (options.rateLimit) {
      const rateLimitResult = applyRateLimit(
        request,
        'api', // Using existing rate limit type
        session.user.id
      );
      
      if (!rateLimitResult.allowed) {
        await adminSystemService.logAuditEvent(
          session.user.id,
          'security_event',
          'rate_limit_exceeded',
          session.user.id,
          'Rate limit exceeded for admin operation',
          {
            requestPath: request.nextUrl.pathname,
            rateLimitInfo: {
              remaining: rateLimitResult.remaining,
              resetTime: rateLimitResult.resetTime
            }
          },
          'medium',
          getClientIP(request),
          request.headers.get('user-agent') || undefined
        );
        
        return {
          success: false,
          response: NextResponse.json(
            {
              success: false,
              error: rateLimitResult.message,
              retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
            },
            {
              status: 429,
              headers: rateLimitResult.headers
            }
          )
        };
      }
    }

    // 4. Security headers validation for destructive operations
    const isDestructiveOperation = request.method === 'DELETE' || 
      request.headers.get('x-destructive-operation') === 'true' ||
      request.nextUrl.pathname.includes('maintenance') ||
      request.nextUrl.pathname.includes('cleanup');

    if (isDestructiveOperation) {
      const confirmationHeader = request.headers.get('x-confirm-destructive');
      const intentHeader = request.headers.get('x-operation-intent');
      
      if (!confirmationHeader) {
        return {
          success: false,
          response: ApiResponseHelper.badRequest(
            'Destructive operations require x-confirm-destructive header'
          )
        };
      }
      
      // Optional: require specific intent for high-risk operations
      if (options.auditAction && ['restart_services', 'cleanup_logs', 'system_cleanup'].includes(options.auditAction)) {
        if (!intentHeader || intentHeader !== 'confirmed') {
          return {
            success: false,
            response: ApiResponseHelper.badRequest(
              'High-risk operations require x-operation-intent: confirmed header'
            )
          };
        }
      }
    }

    // 5. Time-based restrictions (optional)
    const now = new Date();
    const hour = now.getHours();
    const isMaintenanceWindow = hour >= 2 && hour <= 6; // 2 AM - 6 AM maintenance window
    
    // Allow certain operations only during maintenance window (if configured)
    if (options.auditAction === 'system_cleanup' && !isMaintenanceWindow) {
      const override = request.headers.get('x-override-time-restriction');
      if (!override || override !== 'confirmed') {
        return {
          success: false,
          response: ApiResponseHelper.badRequest(
            'System cleanup operations are restricted to maintenance window (2 AM - 6 AM) unless overridden'
          )
        };
      }
    }

    // 6. Audit logging
    if (options.logActivity) {
      await adminSystemService.logAuditEvent(
        session.user.id,
        options.auditAction === 'maintenance_action' ? 'maintenance_action' : 'view_data',
        options.auditResource || 'admin_system',
        request.nextUrl.pathname,
        `Admin accessed: ${request.method} ${request.nextUrl.pathname}`,
        {
          method: request.method,
          userAgent: request.headers.get('user-agent'),
          timestamp: new Date().toISOString(),
          sessionInfo: {
            userRole: session.user.role,
            userEmail: session.user.email
          }
        },
        getRequestRiskLevel(request, options),
        getClientIP(request),
        request.headers.get('user-agent') || undefined
      );
    }

    return {
      success: true,
      user: session.user,
      headers: options.rateLimit ? (applyRateLimit(request, 'api', session.user.id).headers || {}) : {}
    };

  } catch (error) {
    console.error('Admin middleware error:', error);
    return {
      success: false,
      response: ApiResponseHelper.internalError('Security validation failed')
    };
  }
}

/**
 * Higher-order function to wrap API routes with admin middleware
 */
export function withAdminSecurity<T extends any[]>(
  handler: (request: NextRequest, context: { user: any; headers: Record<string, string> }, ...args: T) => Promise<NextResponse>,
  options: AdminMiddlewareOptions = {}
) {
  return async function(request: NextRequest, ...args: T): Promise<NextResponse> {
    const middlewareResult = await adminSecurityMiddleware(request, options);
    
    if (!middlewareResult.success) {
      return middlewareResult.response!;
    }
    
    // Add security headers to response
    const response = await handler(request, {
      user: middlewareResult.user!,
      headers: middlewareResult.headers || {}
    }, ...args);
    
    // Add security headers
    const headers = new Headers(response.headers);
    headers.set('X-Admin-Access', 'true');
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'DENY');
    headers.set('X-XSS-Protection', '1; mode=block');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Add rate limit headers if provided
    Object.entries(middlewareResult.headers || {}).forEach(([key, value]) => {
      headers.set(key, value);
    });
    
    return NextResponse.json(
      await response.json(),
      {
        status: response.status,
        headers
      }
    );
  };
}

/**
 * Specialized middleware for maintenance operations
 */
export function withMaintenanceSecurity<T extends any[]>(
  handler: (request: NextRequest, context: { user: any; headers: Record<string, string> }, ...args: T) => Promise<NextResponse>
) {
  return withAdminSecurity(handler, {
    requireSuperAdmin: false, // Regular admin can perform maintenance
    logActivity: true,
    auditAction: 'maintenance_action',
    auditResource: 'system_maintenance',
    rateLimit: {
      maxRequests: 10, // 10 maintenance operations
      windowMs: 60 * 1000 // per minute
    }
  });
}

/**
 * Utility functions
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const remoteAddr = request.headers.get('x-vercel-forwarded-for') || 
                    request.headers.get('cf-connecting-ip') ||
                    request.headers.get('x-client-ip');
  
  return forwarded?.split(',')[0]?.trim() || realIP || remoteAddr || 'unknown';
}

function getRequestRiskLevel(request: NextRequest, options: AdminMiddlewareOptions): 'low' | 'medium' | 'high' | 'critical' {
  // Determine risk level based on operation type
  if (options.auditAction === 'restart_services' || options.auditAction === 'system_cleanup') {
    return 'high';
  }
  
  if (request.method === 'DELETE' || options.auditAction === 'cleanup_logs') {
    return 'medium';
  }
  
  if (request.method === 'POST' || request.method === 'PUT') {
    return 'medium';
  }
  
  return 'low';
}

/**
 * IP whitelist validation (optional security layer)
 */
export function validateAdminIP(request: NextRequest, allowedIPs: string[] = []): boolean {
  if (allowedIPs.length === 0) {
    return true; // No IP restrictions configured
  }
  
  const clientIP = getClientIP(request);
  return allowedIPs.includes(clientIP) || 
         allowedIPs.some(ip => ip.includes('*') && clientIP.startsWith(ip.replace('*', '')));
}

/**
 * Time-based access control
 */
export function validateAdminTimeWindow(
  allowedHours: { start: number; end: number } = { start: 0, end: 23 }
): boolean {
  const currentHour = new Date().getHours();
  return currentHour >= allowedHours.start && currentHour <= allowedHours.end;
}

// Export middleware options type for external use
export type { AdminMiddlewareOptions };