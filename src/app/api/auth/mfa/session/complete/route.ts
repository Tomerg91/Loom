import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createMfaService } from '@/lib/services/mfa-service';

const completeSessionSchema = z.object({
  sessionToken: z
    .string({ required_error: 'Session token is required' })
    .min(1, 'Session token is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { sessionToken } = await completeSessionSchema.parseAsync(body);

    const mfaService = createMfaService(true);
    const result = await mfaService.completeMfaSession(sessionToken);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to complete MFA session',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request format',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    console.error('Error completing MFA session:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to complete MFA session',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405 }
  );
}
