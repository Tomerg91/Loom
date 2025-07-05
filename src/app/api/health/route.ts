import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/health - Health check endpoint
export async function GET(request: NextRequest) {
  const start = Date.now();
  
  try {
    // Check database connection
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (error) {
      throw new Error(`Database check failed: ${error.message}`);
    }

    const dbLatency = Date.now() - start;
    
    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = {
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024),
    };

    // Check environment variables
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
    ];
    
    const missingEnvVars = requiredEnvVars.filter(
      envVar => !process.env[envVar]
    );

    const totalLatency = Date.now() - start;
    
    // Determine health status
    const isHealthy = dbLatency < 1000 && missingEnvVars.length === 0;
    
    const healthData = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {
        database: {
          status: dbLatency < 1000 ? 'healthy' : 'slow',
          latency: `${dbLatency}ms`,
          connected: !error,
        },
        memory: {
          status: memoryUsageMB.heapUsed < 512 ? 'healthy' : 'high',
          usage: memoryUsageMB,
          heapUtilization: `${Math.round((memoryUsageMB.heapUsed / memoryUsageMB.heapTotal) * 100)}%`,
        },
        environment: {
          status: missingEnvVars.length === 0 ? 'healthy' : 'missing_vars',
          missingVars: missingEnvVars,
        },
      },
      performance: {
        responseTime: `${totalLatency}ms`,
        uptime: process.uptime(),
        cpuUsage: process.cpuUsage(),
      },
    };

    const response = NextResponse.json(healthData, {
      status: isHealthy ? 200 : 503,
    });
    
    // Add cache headers
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
    
  } catch (error) {
    const errorData = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      performance: {
        responseTime: `${Date.now() - start}ms`,
        uptime: process.uptime(),
      },
    };

    return NextResponse.json(errorData, { status: 503 });
  }
}

// HEAD /api/health - Readiness check endpoint
export async function HEAD(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    return new NextResponse(null, { status: error ? 503 : 200 });
  } catch (error) {
    return new NextResponse(null, { status: 503 });
  }
}

// OPTIONS /api/health - Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}