import { NextRequest, NextResponse } from 'next/server';

import { compose, withRateLimit } from '@/lib/api';
import { temporarySharesDatabase } from '@/lib/database/temporary-shares';
export const POST = compose(async function POST(request: NextRequest) {
  try {
    const logData = await request.json();

    if (!logData.share_id) {
      return NextResponse.json(
        { error: 'share_id is required' },
        { status: 400 }
      );
    }

    // Add client IP if available
    const clientIp = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    const enrichedLogData = {
      ...logData,
      client_ip: clientIp,
    };

    await temporarySharesDatabase.logShareAccess(enrichedLogData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Share logging error:', error);
    return NextResponse.json(
      { error: 'Failed to log share access' },
      { status: 500 }
    );
  }
}, withRateLimit());
