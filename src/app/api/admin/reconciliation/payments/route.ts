/**
 * Payment Reconciliation API for Finance Stakeholders
 * GET /api/admin/reconciliation/payments
 *
 * Provides detailed payment reports for accounting and reconciliation
 * Requires admin role
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAuthService } from '@/lib/auth/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { applySecurityHeaders } from '@/lib/security/headers';
import { compose, withAuth, withRateLimit } from '@/lib/api/guard';

const querySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['pending', 'paid', 'failed', 'canceled']).optional(),
  provider: z.enum(['tranzila']).optional(),
  format: z.enum(['json', 'csv']).optional().default('json'),
  limit: z.string().optional().default('1000'),
  offset: z.string().optional().default('0'),
});

async function handler(req: NextRequest): Promise<NextResponse> {
  try {
    // Check admin authorization
    const auth = createAuthService(true);
    const user = await auth.getCurrentUser();

    if (!user || user.role !== 'admin') {
      return applySecurityHeaders(
        req,
        NextResponse.json(
          { success: false, error: 'Unauthorized - Admin access required' },
          { status: 403 }
        )
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const params = querySchema.parse({
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      status: searchParams.get('status'),
      provider: searchParams.get('provider'),
      format: searchParams.get('format'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    });

    const admin = createAdminClient();

    // Build query
    let query = admin
      .from('payments')
      .select(
        `
        id,
        user_id,
        amount_cents,
        currency,
        description,
        status,
        provider,
        provider_transaction_id,
        idempotency_key,
        metadata,
        created_at,
        updated_at,
        users!inner(id, email, full_name, subscription_tier)
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false });

    // Apply filters
    if (params.startDate) {
      query = query.gte('created_at', params.startDate);
    }
    if (params.endDate) {
      query = query.lte('created_at', params.endDate);
    }
    if (params.status) {
      query = query.eq('status', params.status);
    }
    if (params.provider) {
      query = query.eq('provider', params.provider);
    }

    // Apply pagination
    const limit = parseInt(params.limit, 10);
    const offset = parseInt(params.offset, 10);
    query = query.range(offset, offset + limit - 1);

    const { data: payments, error, count } = await query;

    if (error) {
      throw error;
    }

    // Calculate summary statistics
    const summary = {
      totalPayments: count || 0,
      totalAmount: payments?.reduce((sum, p) => sum + (p.amount_cents || 0), 0) || 0,
      byStatus: payments?.reduce((acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {},
      byProvider: payments?.reduce((acc, p) => {
        acc[p.provider] = (acc[p.provider] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {},
    };

    // Format as CSV if requested
    if (params.format === 'csv') {
      const csv = generateCSV(payments || []);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="payments-${new Date().toISOString()}.csv"`,
        },
      });
    }

    // Return JSON
    return applySecurityHeaders(
      req,
      NextResponse.json(
        {
          success: true,
          data: payments,
          summary,
          pagination: {
            total: count,
            limit,
            offset,
            hasMore: (count || 0) > offset + limit,
          },
        },
        { status: 200 }
      )
    );
  } catch (error) {
    console.error('Error fetching payment reconciliation data:', error);
    return applySecurityHeaders(
      req,
      NextResponse.json(
        { success: false, error: 'Failed to fetch reconciliation data' },
        { status: 500 }
      )
    );
  }
}

function generateCSV(payments: any[]): string {
  const headers = [
    'Payment ID',
    'Transaction ID',
    'User Email',
    'User Name',
    'Amount',
    'Currency',
    'Status',
    'Provider',
    'Description',
    'Subscription Tier',
    'Created At',
    'Updated At',
  ];

  const rows = payments.map((p) => [
    p.id,
    p.provider_transaction_id || '',
    p.users?.email || '',
    p.users?.full_name || '',
    (p.amount_cents / 100).toFixed(2),
    p.currency,
    p.status,
    p.provider,
    p.description || '',
    p.users?.subscription_tier || '',
    p.created_at,
    p.updated_at,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n');

  return csvContent;
}

export const GET = compose(handler, withRateLimit(), withAuth);
