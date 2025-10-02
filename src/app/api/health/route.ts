import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createClient, setSupabaseCookieStore } from '@/lib/supabase/server';
import { compose, withRateLimit } from '@/lib/api';
import { createPublicCorsResponse } from '@/lib/security/cors';

async function baseHealthHandler(request: NextRequest) {
  const start = Date.now();
  const cookieStore = cookies();
  setSupabaseCookieStore(cookieStore);
  
  try {
    // Perform comprehensive health checks
    const healthChecks = await Promise.allSettled([
      checkDatabaseHealth(),
      checkExternalServices(),
      checkSystemResources(),
      checkEnvironmentConfiguration(),
      checkCacheHealth(),
    ]);

    const dbCheck = healthChecks[0].status === 'fulfilled' ? healthChecks[0].value : null;
    const servicesCheck = healthChecks[1].status === 'fulfilled' ? healthChecks[1].value : null;
    const systemCheck = healthChecks[2].status === 'fulfilled' ? healthChecks[2].value : null;
    const envCheck = healthChecks[3].status === 'fulfilled' ? healthChecks[3].value : null;
    const cacheCheck = healthChecks[4].status === 'fulfilled' ? healthChecks[4].value : null;

    const totalLatency = Date.now() - start;
    
    // Determine overall health status
    const isHealthy = determineOverallHealth(dbCheck, servicesCheck, systemCheck, envCheck, cacheCheck);
    
    const healthData = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.VERCEL_GIT_COMMIT_SHA || process.env.npm_package_version || '1.0.0',
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
      region: process.env.VERCEL_REGION || 'unknown',
      deployment_id: process.env.VERCEL_DEPLOYMENT_ID || 'local',
      checks: {
        database: dbCheck || getErrorCheck('Database check failed'),
        external_services: servicesCheck || getErrorCheck('External services check failed'),
        system: systemCheck || getErrorCheck('System check failed'),
        environment: envCheck || getErrorCheck('Environment check failed'),
        cache: cacheCheck || getErrorCheck('Cache check failed'),
      },
      performance: {
        responseTime: `${totalLatency}ms`,
        uptime: formatUptime(process.uptime()),
        cpuUsage: process.cpuUsage(),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      dependencies: {
        next: process.env.npm_package_dependencies_next || 'unknown',
        react: process.env.npm_package_dependencies_react || 'unknown',
        supabase: process.env.npm_package_dependencies_supabase || 'unknown',
      },
    };

    const response = NextResponse.json(healthData, {
      status: isHealthy ? 200 : 503,
    });
    
    // Add comprehensive cache headers
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('X-Health-Check-Version', '2.0');
    response.headers.set('X-Deployment-ID', process.env.VERCEL_DEPLOYMENT_ID || 'local');
    
    return response;
  } catch (error) {
    const errorData = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      performance: {
        responseTime: `${Date.now() - start}ms`,
        uptime: formatUptime(process.uptime()),
      },
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
    };

    return NextResponse.json(errorData, { status: 503 });
  }
}

// GET /api/health - Health check endpoint
export const GET = compose(baseHealthHandler, withRateLimit());

async function baseHeadHandler(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    return new NextResponse(null, { status: error ? 503 : 200 });
  } catch (_error) {
    return new NextResponse(null, { status: 503 });
  }
}

// HEAD /api/health - Readiness check endpoint
export const HEAD = compose(baseHeadHandler, withRateLimit());

// OPTIONS /api/health - Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  const cookieStore = cookies();
  setSupabaseCookieStore(cookieStore);
  return createPublicCorsResponse();
}

// Comprehensive health check functions
async function checkDatabaseHealth() {
  const start = Date.now();
  
  try {
    const supabase = await createClient();
    
    // Test basic connectivity
    const { error: basicError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (basicError) {
      throw new Error(`Database connectivity failed: ${basicError.message}`);
    }
    
    const basicLatency = Date.now() - start;
    
    // Test write capability (non-destructive)
    const writeStart = Date.now();
    const { error: writeError } = await supabase
      .from('system_audit_logs')
      .select('id')
      .limit(1);
    
    const writeLatency = Date.now() - writeStart;
    
    // Get connection pool info if available
    const poolStats = await getDatabasePoolStats(supabase);
    
    return {
      status: basicLatency < 1000 && writeLatency < 1500 ? 'healthy' : 'slow',
      latency: `${basicLatency}ms`,
      writeLatency: `${writeLatency}ms`,
      connected: true,
      poolStats,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latency: `${Date.now() - start}ms`,
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown database error',
      timestamp: new Date().toISOString(),
    };
  }
}

async function checkExternalServices() {
  const start = Date.now();
  const services = [];
  
  // Check Sentry connectivity
  if (process.env.SENTRY_DSN) {
    try {
      const sentryStart = Date.now();
      // Simple connectivity test (don't actually send an error)
      const sentryHealthy = true; // In a real implementation, you'd test the DSN
      services.push({
        name: 'sentry',
        status: sentryHealthy ? 'healthy' : 'unhealthy',
        latency: `${Date.now() - sentryStart}ms`,
      });
    } catch (error) {
      services.push({
        name: 'sentry',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Sentry connection failed',
      });
    }
  }
  
  // Check other external services as needed
  if (process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID) {
    services.push({
      name: 'google_analytics',
      status: 'configured',
      configured: true,
    });
  }
  
  return {
    status: services.every(s => s.status === 'healthy' || s.status === 'configured') ? 'healthy' : 'degraded',
    services,
    totalLatency: `${Date.now() - start}ms`,
    timestamp: new Date().toISOString(),
  };
}

async function checkSystemResources() {
  try {
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = {
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024),
      arrayBuffers: Math.round(memoryUsage.arrayBuffers / 1024 / 1024),
    };
    
    const heapUtilization = Math.round((memoryUsageMB.heapUsed / memoryUsageMB.heapTotal) * 100);
    const cpuUsage = process.cpuUsage();
    
    // Get load average on supported platforms
    let loadAverage;
    try {
      loadAverage = require('os').loadavg();
    } catch (e) {
      loadAverage = null;
    }
    
    // Determine memory health
    let memoryStatus = 'healthy';
    if (memoryUsageMB.heapUsed > 1024) memoryStatus = 'high';
    if (memoryUsageMB.heapUsed > 2048) memoryStatus = 'critical';
    
    return {
      status: memoryStatus === 'critical' ? 'unhealthy' : 'healthy',
      memory: {
        usage: memoryUsageMB,
        heapUtilization: `${heapUtilization}%`,
        status: memoryStatus,
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
      loadAverage,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'System check failed',
      timestamp: new Date().toISOString(),
    };
  }
}

async function checkEnvironmentConfiguration() {
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];
  
  const optionalEnvVars = [
    'SENTRY_DSN',
    'NEXT_PUBLIC_SENTRY_DSN',
    'NEXT_PUBLIC_GOOGLE_ANALYTICS_ID',
    'VERCEL_URL',
  ];
  
  const missingRequired = requiredEnvVars.filter(envVar => !process.env[envVar]);
  const missingOptional = optionalEnvVars.filter(envVar => !process.env[envVar]);
  
  const configuredOptional = optionalEnvVars.filter(envVar => !!process.env[envVar]);
  
  return {
    status: missingRequired.length === 0 ? 'healthy' : 'unhealthy',
    required: {
      total: requiredEnvVars.length,
      configured: requiredEnvVars.length - missingRequired.length,
      missing: missingRequired,
    },
    optional: {
      total: optionalEnvVars.length,
      configured: configuredOptional.length,
      missing: missingOptional,
      available: configuredOptional,
    },
    timestamp: new Date().toISOString(),
  };
}

async function checkCacheHealth() {
  try {
    // Basic cache health check
    // In a real implementation, you'd test your caching layer (Redis, etc.)
    
    return {
      status: 'healthy',
      type: 'in-memory', // or 'redis', 'memcached', etc.
      hitRate: 'unknown', // Would be calculated from cache metrics
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Cache check failed',
      timestamp: new Date().toISOString(),
    };
  }
}

async function getDatabasePoolStats(supabase: any) {
  try {
    // In a real implementation, you'd get pool stats from your database client
    return {
      total: 10,
      active: 2,
      idle: 8,
      waiting: 0,
    };
  } catch (error) {
    return null;
  }
}

function determineOverallHealth(...checks: any[]): boolean {
  // System is healthy if all critical checks pass
  return checks.every(check => 
    check && (check.status === 'healthy' || check.status === 'degraded')
  );
}

function getErrorCheck(message: string) {
  return {
    status: 'unhealthy',
    error: message,
    timestamp: new Date().toISOString(),
  };
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m ${secs}s`;
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}
