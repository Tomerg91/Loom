/**
 * @fileoverview API handler returning the aggregated coach dashboard overview.
 * The endpoint reuses the server loader so both server-rendered and client
 * initiated requests share a single implementation.
 */

import { NextResponse } from 'next/server';

import { getServerUser } from '@/lib/auth/auth';
import { fetchCoachOverviewData } from '@/modules/dashboard/server/loaders';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getServerUser();

    if (!user || user.role !== 'coach') {
      return NextResponse.json(
        {
          success: false,
          error: 'FORBIDDEN',
          message: 'Coach access required',
        },
        { status: 403 }
      );
    }

    const overview = await fetchCoachOverviewData(user.id);

    return NextResponse.json(
      { success: true, data: overview },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unable to load coach overview data';

    logger.error('Failed to load coach overview', error);

    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message },
      { status: 500 }
    );
  }
}
