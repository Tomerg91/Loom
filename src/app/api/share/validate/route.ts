import { NextRequest, NextResponse } from 'next/server';
import { temporarySharesDatabase } from '@/lib/database/temporary-shares';

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    const result = await temporarySharesDatabase.validateShareAccess(
      token,
      password
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Share validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate share access' },
      { status: 500 }
    );
  }
}