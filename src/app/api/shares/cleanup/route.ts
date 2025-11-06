import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

import { temporarySharesDatabase } from '@/lib/database/temporary-shares';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

// POST /api/shares/cleanup - Cleanup expired temporary shares
// This endpoint should be called by a cron job or scheduled task
export async function POST(request: NextRequest) {
  try {
    // Verify the request is authorized (cron job or admin)
    const headersList = await headers();
    const authHeader = headersList.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // Check for cron secret or service role authentication
    if (cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { error: 'Unauthorized - Invalid cron secret' },
          { status: 401 }
        );
      }
    } else {
      // Fall back to user authentication for manual cleanup
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      // Check if user has admin role (implement your admin check logic)
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (profileError || profile?.role !== 'admin') {
        return NextResponse.json(
          { error: 'Unauthorized - Admin access required' },
          { status: 403 }
        );
      }
    }

    // Perform cleanup
    const cleanedCount = await temporarySharesDatabase.cleanupExpiredShares();

    // Log the cleanup operation
    logger.debug(`Cleaned up ${cleanedCount} expired temporary shares`);

    // Optionally, get statistics about remaining shares
    const supabase = await createClient();
    const { data: stats, error: statsError } = await supabase
      .from('temporary_file_shares')
      .select('is_active')
      .eq('is_active', true);

    const activeShares = stats?.length || 0;

    return NextResponse.json({
      success: true,
      cleanup_results: {
        expired_shares_cleaned: cleanedCount,
        active_shares_remaining: activeShares,
        cleanup_timestamp: new Date().toISOString(),
      },
      message: `Successfully cleaned up ${cleanedCount} expired shares. ${activeShares} active shares remain.`,
    });

  } catch (error) {
    logger.error('Cleanup expired shares error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/shares/cleanup - Get cleanup statistics (admin only)
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has admin role
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Get statistics about shares
    const now = new Date();
    
    const [activeShares, expiredShares, totalShares, recentAccesses] = await Promise.all([
      supabase
        .from('temporary_file_shares')
        .select('id')
        .eq('is_active', true)
        .gt('expires_at', now.toISOString()),
      
      supabase
        .from('temporary_file_shares')
        .select('id')
        .or(`is_active.eq.false,expires_at.lt.${now.toISOString()}`),
      
      supabase
        .from('temporary_file_shares')
        .select('id'),
      
      supabase
        .from('temporary_share_access_logs')
        .select('id')
        .gt('accessed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
    ]);

    const statistics = {
      active_shares: activeShares.data?.length || 0,
      expired_or_inactive_shares: expiredShares.data?.length || 0,
      total_shares: totalShares.data?.length || 0,
      recent_accesses_24h: recentAccesses.data?.length || 0,
      last_checked: now.toISOString(),
    };

    return NextResponse.json({
      statistics,
      cleanup_recommended: statistics.expired_or_inactive_shares > 0,
    });

  } catch (error) {
    logger.error('Get cleanup statistics error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}