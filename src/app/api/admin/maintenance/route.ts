import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { ApiError } from '@/lib/api/errors';
import { ApiResponseHelper } from '@/lib/api/types';

import { rateLimit } from '@/lib/security/rate-limit';
import { authService } from '@/lib/services/auth-service';


const maintenanceActionSchema = z.object({
  action: z.enum([
    'backup_database',
    'database_health_check', 
    'clear_cache',
    'get_cache_stats',
    'export_logs',
    'cleanup_logs',
    'clean_temp_files',
    'system_cleanup',
    'update_configuration',
    'restart_services'
  ]),
  params: z.object({
    // Database backup
    includeBlobs: z.boolean().optional(),
    
    // Cache operations
    cacheType: z.enum(['all', 'sessions', 'users', 'analytics']).optional(),
    
    // Log operations
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    level: z.enum(['info', 'warning', 'error']).optional(),
    olderThanDays: z.number().min(1).max(365).optional(),
    
    // Configuration
    config: z.record(z.any()).optional(),
    
    // Service restart
    services: z.array(z.string()).optional(),
  }).optional(),
});

// Rate limiting specifically for maintenance operations
const maintenanceRateLimit = rateLimit(10, 60 * 1000); // 10 operations per minute

export const POST = maintenanceRateLimit(async function(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify admin access with enhanced checks
    const session = await authService.getSession();
    if (!session?.user) {
      return ApiResponseHelper.unauthorized('Authentication required');
    }
    
    if (session.user.role !== 'admin') {
      return ApiResponseHelper.forbidden('Admin privileges required for maintenance operations');
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return ApiResponseHelper.badRequest('Invalid JSON payload');
    }
    
    const validation = maintenanceActionSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponseHelper.badRequest(
        'Invalid maintenance request',
        validation.error.flatten()
      );
    }

    const { action, params } = validation.data;

    // Additional safety checks for destructive operations
    if (['system_cleanup', 'cleanup_logs', 'restart_services'].includes(action)) {
      if (!request.headers.get('x-confirm-destructive')) {
        return ApiResponseHelper.badRequest(
          'Destructive operations require confirmation header: x-confirm-destructive'
        );
      }
    }

    // Log the maintenance action start
    console.log(`[MAINTENANCE] Admin ${session.user.email} initiated: ${action}`, {
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      params
    });

    // Perform maintenance action with timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Maintenance operation timeout')), 5 * 60 * 1000) // 5 minutes
    );
    
    const operationPromise = adminSystemService.performMaintenanceAction(action, params, session.user.id);
    
    const result = await Promise.race([operationPromise, timeoutPromise]) as any;

    if (!result.success) {
      console.error(`[MAINTENANCE] Failed: ${action}`, {
        error: result.error,
        message: result.message,
        details: result.details
      });
      
      return ApiResponseHelper.error(
        result.error || 'MAINTENANCE_FAILED',
        result.message,
        500
      );
    }

    // Log successful completion
    console.log(`[MAINTENANCE] Completed: ${action}`, {
      timestamp: new Date().toISOString(),
      admin: session.user.email,
      result: result.message
    });

    return ApiResponseHelper.success({
      action,
      status: 'completed',
      message: result.message,
      details: result.details,
      timestamp: new Date().toISOString(),
      executedBy: session.user.email
    });

  } catch (error) {
    console.error('[MAINTENANCE] API error:', error);
    
    if (error instanceof ApiError) {
      return ApiResponseHelper.error(error.code, error.message, error.statusCode || 500);
    }
    
    // Handle timeout errors
    if (error instanceof Error && error.message.includes('timeout')) {
      return ApiResponseHelper.error(
        'OPERATION_TIMEOUT',
        'Maintenance operation timed out. Please check system logs for completion status.',
        408
      );
    }
    
    return ApiResponseHelper.internalError(
      'An unexpected error occurred during maintenance operation'
    );
  }
});

// GET endpoint to check maintenance operation status
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify admin access
    const session = await authService.getSession();
    if (!session?.user || session.user.role !== 'admin') {
      return ApiResponseHelper.forbidden('Admin access required');
    }

    // Get available maintenance actions and their descriptions
    const availableActions = {
      backup_database: {
        name: 'Database Backup',
        description: 'Creates a complete backup of the database',
        parameters: ['includeBlobs'],
        risk: 'low',
        estimatedTime: '30-120 seconds'
      },
      database_health_check: {
        name: 'Database Health Check',
        description: 'Checks database connectivity, performance, and resource usage',
        parameters: [],
        risk: 'none',
        estimatedTime: '5-15 seconds'
      },
      clear_cache: {
        name: 'Clear Cache',
        description: 'Clears application cache to free memory and force refresh',
        parameters: ['cacheType'],
        risk: 'low',
        estimatedTime: '1-5 seconds'
      },
      get_cache_stats: {
        name: 'Cache Statistics',
        description: 'Retrieves current cache usage and performance statistics',
        parameters: [],
        risk: 'none',
        estimatedTime: '1-2 seconds'
      },
      export_logs: {
        name: 'Export System Logs',
        description: 'Exports system logs to a downloadable file',
        parameters: ['startDate', 'endDate', 'level'],
        risk: 'low',
        estimatedTime: '10-60 seconds'
      },
      cleanup_logs: {
        name: 'Cleanup Old Logs',
        description: 'Removes old log entries to free storage space',
        parameters: ['olderThanDays'],
        risk: 'medium',
        estimatedTime: '10-30 seconds'
      },
      clean_temp_files: {
        name: 'Clean Temporary Files',
        description: 'Removes temporary files and cache directories',
        parameters: [],
        risk: 'low',
        estimatedTime: '5-20 seconds'
      },
      system_cleanup: {
        name: 'Complete System Cleanup',
        description: 'Performs comprehensive cleanup of logs, cache, and temporary files',
        parameters: [],
        risk: 'medium',
        estimatedTime: '30-90 seconds'
      },
      update_configuration: {
        name: 'Update Configuration',
        description: 'Updates system configuration settings',
        parameters: ['config'],
        risk: 'high',
        estimatedTime: '2-10 seconds'
      },
      restart_services: {
        name: 'Restart Services',
        description: 'Restarts system services to apply changes or recover from errors',
        parameters: ['services'],
        risk: 'high',
        estimatedTime: '10-30 seconds'
      }
    };

    return ApiResponseHelper.success({
      availableActions,
      rateLimit: {
        maxOperations: 10,
        windowMs: 60000,
        message: '10 maintenance operations allowed per minute'
      },
      securityNote: 'Destructive operations require x-confirm-destructive header'
    });

  } catch (error) {
    console.error('Maintenance status API error:', error);
    return ApiResponseHelper.internalError('Failed to fetch maintenance information');
  }
}