import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

/**
 * API endpoint to refresh the user_mfa_status_unified materialized view
 * This should be called by a cron job nightly at 2 AM
 *
 * Security: Vercel Cron Secret authentication required
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('CRON_SECRET environment variable not set');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = await createClient();
    const startTime = Date.now();

    // Call the RPC function to refresh the materialized view
    const { error } = await supabase.rpc('refresh_user_mfa_status_unified');

    const duration = Date.now() - startTime;

    if (error) {
      console.error('Error refreshing MFA status view:', error);
      return NextResponse.json(
        {
          error: 'Failed to refresh MFA status view',
          details: error.message,
          duration_ms: duration
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'MFA status view refreshed successfully',
      duration_ms: duration,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Unexpected error in refresh-mfa-status:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
