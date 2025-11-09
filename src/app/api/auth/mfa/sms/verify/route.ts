import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClientWithRequest } from '@/lib/supabase/server';
import { createTwilioSMSService } from '@/lib/services/twilio-sms-service';
import { createSMSOTPManager } from '@/lib/services/sms-otp-manager';
import { createAuthService } from '@/lib/auth/auth';
import {
  createErrorResponse,
  createSuccessResponse,
  HTTP_STATUS,
} from '@/lib/api/utils';

const verifySchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits'),
});

export async function POST(request: NextRequest) {
  try {
    const user = await createAuthService({ isServer: true }).getCurrentUser();

    if (!user) {
      return createErrorResponse('Unauthorized', HTTP_STATUS.UNAUTHORIZED);
    }

    const body = await request.json();
    const validation = verifySchema.safeParse(body);

    if (!validation.success) {
      return createErrorResponse(
        `Validation error: ${validation.error.errors[0].message}`,
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const twilioService = createTwilioSMSService({
      TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID!,
      TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN!,
      TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER!,
    });

    const supabaseResponse = NextResponse.json({});
    const supabase = createServerClientWithRequest(request, supabaseResponse);
    const otpManager = createSMSOTPManager(supabase, twilioService);

    const result = await otpManager.verifyOTP(user.id, validation.data.code);

    if (!result.success) {
      return createErrorResponse(
        result.error || 'Invalid OTP',
        HTTP_STATUS.UNAUTHORIZED
      );
    }

    return createSuccessResponse({
      message: 'SMS OTP verified successfully',
      verified: true,
    });
  } catch (error) {
    console.error('SMS OTP verify error:', error);
    return createErrorResponse(
      'Internal server error',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
}
