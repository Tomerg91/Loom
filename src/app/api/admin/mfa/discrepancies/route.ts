import { NextResponse } from 'next/server';
import { getMfaDiscrepancies } from '@/lib/database/mfa-admin';

/**
 * GET /api/admin/mfa/discrepancies
 * Fetch MFA status discrepancies between unified and legacy sources
 * Admin only
 */
export async function GET() {
  try {
    const result = await getMfaDiscrepancies();

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/admin/mfa/discrepancies:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
