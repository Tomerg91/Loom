/**
 * Admin Message Retention API
 * Manage message retention policies and archival
 */

import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth/session';
import { supabase } from '@/lib/supabase/client';

// GET /api/admin/messages/retention - Get retention statistics
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get retention statistics
    const { data: stats, error: statsError } = await supabase.rpc(
      'get_message_retention_stats'
    );

    if (statsError) throw statsError;

    // Get active retention policies
    const { data: policies, error: policiesError } = await supabase
      .from('message_retention_policies')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (policiesError) throw policiesError;

    return NextResponse.json({
      stats: stats?.[0] || {},
      policies: policies || [],
    });
  } catch (error) {
    console.error('Failed to fetch retention data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch retention data' },
      { status: 500 }
    );
  }
}

// POST /api/admin/messages/retention/archive - Trigger message archival
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { policyName = 'default_retention' } = body;

    // Trigger archival
    const { data, error } = await supabase.rpc('archive_old_messages', {
      p_policy_name: policyName,
    });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      archivedCount: data?.[0]?.archived_count || 0,
      conversationIds: data?.[0]?.conversation_ids || [],
    });
  } catch (error) {
    console.error('Failed to archive messages:', error);
    return NextResponse.json(
      { error: 'Failed to archive messages' },
      { status: 500 }
    );
  }
}
