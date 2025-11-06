/**
 * @fileoverview API handler returning the client dashboard overview payload.
 * Reuses the shared server loader so server-side rendering and client
 * refetches remain consistent.
 */

import { NextResponse } from 'next/server';

import { getServerUser } from '@/lib/auth/auth';
import { fetchClientOverviewData } from '@/modules/dashboard/server/client-loaders';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getServerUser();

    if (!user || user.role !== 'client') {
      return NextResponse.json(
        {
          success: false,
          error: 'FORBIDDEN',
          message: 'Client access required',
        },
        { status: 403 }
      );
    }

    const overview = await fetchClientOverviewData(user.id);

    return NextResponse.json(
      { success: true, data: overview },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unable to load client overview data';

    logger.error('Failed to load client overview', error);

    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message },
      { status: 500 }
    );
  }
}
