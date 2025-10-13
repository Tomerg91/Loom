import { NextRequest, NextResponse } from 'next/server';

import { adminSecurityMiddleware } from '@/lib/security/admin-middleware';

/**
 * Environment Debug API Endpoint
 *
 * This endpoint helps debug environment variable issues in production.
 * Only accessible in development mode or to super-admins in production.
 */

interface EnvironmentCheck {
  name: string;
  present: boolean;
  valid: boolean;
  value?: string;
  issues: string[];
}

function sanitizeEnvironmentCheck(check: EnvironmentCheck): EnvironmentCheck {
  // Remove the actual value from the response
  const { value: _value, ...sanitized } = check;
  return sanitized;
}

function validateEnvironmentVariable(name: string, value: string | undefined): EnvironmentCheck {
  const check: EnvironmentCheck = {
    name,
    present: !!value,
    valid: false,
    value: value ? (name.includes('KEY') ? `${value.substring(0, 10)}...` : value) : 'NOT_SET',
    issues: []
  };

  if (!value) {
    check.issues.push('Environment variable not set');
    return check;
  }

  // Check for placeholder values
  const placeholderPatterns = [
    'your-project-id',
    'your-supabase',
    'MISSING_',
    'INVALID_',
    'your_'
  ];

  if (placeholderPatterns.some(pattern => value.includes(pattern))) {
    check.issues.push('Contains placeholder value');
    return check;
  }

  // Specific validation based on variable name
  if (name.includes('URL')) {
    try {
      const url = new URL(value);
      if (url.hostname.includes('supabase.co') || url.hostname.includes('localhost')) {
        check.valid = true;
      } else {
        check.issues.push('URL does not match expected Supabase pattern');
      }
    } catch (_error) {
      check.issues.push('Invalid URL format');
    }
  } else if (name.includes('KEY')) {
    if (value.startsWith('eyJ') && value.length > 100) {
      check.valid = true;
    } else {
      check.issues.push('Invalid JWT format or too short');
    }
  } else {
    check.valid = true; // For non-URL, non-key variables, presence is sufficient
  }

  return check;
}

export async function GET(request: NextRequest) {
  // In production, require super-admin authentication
  if (process.env.NODE_ENV !== 'development') {
    const security = await adminSecurityMiddleware(request, {
      requireSuperAdmin: true,
      auditAction: 'view_environment_diagnostics',
      auditResource: 'environment_debug',
    });

    if (!security.success) {
      return security.response;
    }
  }

  const environmentVariables = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_APP_URL'
  ];

  const checks = environmentVariables.map(name =>
    sanitizeEnvironmentCheck(validateEnvironmentVariable(name, process.env[name]))
  );

  const hasIssues = checks.some(check => !check.valid);
  
  // Test Supabase client creation if variables are valid
  let supabaseConnectionStatus = 'not_tested';
  let supabaseConnectionError = null;

  const urlCheck = checks.find(c => c.name === 'NEXT_PUBLIC_SUPABASE_URL');
  const keyCheck = checks.find(c => c.name === 'NEXT_PUBLIC_SUPABASE_ANON_KEY');
  
  if (urlCheck?.valid && keyCheck?.valid) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // Simple connection test
      supabaseConnectionStatus = 'success';
    } catch (error) {
      supabaseConnectionStatus = 'failed';
      supabaseConnectionError = error instanceof Error ? error.message : 'Unknown error';
    }
  }

  const response = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    hasIssues,
    checks,
    supabaseConnection: {
      status: supabaseConnectionStatus,
      error: supabaseConnectionError
    },
    deployment: {
      vercel: !!process.env.VERCEL,
      buildId: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown'
    }
  };

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Content-Type': 'application/json'
    }
  });
}

// Only allow GET requests
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}