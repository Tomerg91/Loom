// src/lib/services/sms-otp-manager.ts
import { randomBytes } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { TwilioSMSService } from './twilio-sms-service';
import type { Database } from '@/types/supabase';

interface OTPResult {
  success: boolean;
  otpCode?: string;
  error?: string;
}

interface VerifyResult {
  success: boolean;
  verified?: boolean;
  error?: string;
}

interface SMSOTPRecord {
  id: string;
  user_id: string;
  phone_number: string;
  otp_code: string;
  attempts: number;
  max_attempts: number;
  created_at: string;
  expires_at: string;
  verified_at: string | null;
}

// Configuration constants for OTP behavior
const OTP_CONFIG = {
  LENGTH: 6,
  EXPIRY_MINUTES: 5,
  MAX_ATTEMPTS: 5,
} as const;

/**
 * Generates a cryptographically secure random 6-digit OTP code.
 * Uses crypto.randomBytes() for security-critical operations.
 * @param length - Number of digits to generate (default: 6)
 * @returns A string of random digits
 */
function generateOTP(length: number = OTP_CONFIG.LENGTH): string {
  // Use crypto.randomBytes for cryptographically secure random generation
  // This is critical for security to prevent OTP prediction attacks
  const randomBuffer = randomBytes(length);

  let otp = '';
  for (let i = 0; i < length; i++) {
    // Map each random byte (0-255) to a digit (0-9)
    // Using modulo ensures uniform distribution across digits
    otp += (randomBuffer[i] % 10).toString();
  }
  return otp;
}

export function createSMSOTPManager(
  supabase: SupabaseClient<Database>,
  twilioService: TwilioSMSService
) {
  async function generateAndSendOTP(
    userId: string,
    phoneNumber: string
  ): Promise<OTPResult> {
    try {
      // Validate inputs
      if (!userId || userId.trim().length === 0) {
        return {
          success: false,
          error: 'User ID is required',
        };
      }

      if (!phoneNumber || !phoneNumber.startsWith('+')) {
        return {
          success: false,
          error: 'Invalid phone number format',
        };
      }

      const otpCode = generateOTP();
      const expiresAt = new Date(Date.now() + OTP_CONFIG.EXPIRY_MINUTES * 60 * 1000);

      // Store OTP in database
      // Table sms_otp_codes will be created in Task 2 migration
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      const { error: insertError } = await supabase
        .from('sms_otp_codes')
        .insert({
          user_id: userId,
          phone_number: phoneNumber,
          otp_code: otpCode,
          expires_at: expiresAt.toISOString(),
        });

      if (insertError) {
        return {
          success: false,
          error: `Failed to store OTP: ${insertError.message}`,
        };
      }

      // Send SMS
      const smsResult = await twilioService.sendOTP(phoneNumber, otpCode);

      // Log delivery (do NOT log the actual OTP code for security)
      if (smsResult.success) {
        // Table sms_delivery_logs will be created in Task 2 migration
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        await supabase.from('sms_delivery_logs').insert({
          user_id: userId,
          phone_number: phoneNumber,
          message: 'OTP sent',
          twilio_message_sid: smsResult.messageSid,
          status: 'sent',
        });
      }

      return {
        success: smsResult.success,
        otpCode: smsResult.success ? otpCode : undefined,
        error: smsResult.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  }

  async function verifyOTP(
    userId: string,
    otpCode: string,
    options: { expiredOK?: boolean } = {}
  ): Promise<VerifyResult> {
    try {
      // Get the latest unverified OTP for this user
      // Filter for verified_at IS NULL to prevent race condition when user requests multiple OTPs
      // Table sms_otp_codes will be created in Task 2 migration
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      const { data, error: selectError } = await supabase
        .from('sms_otp_codes')
        .select('*')
        .eq('user_id', userId)
        .is('verified_at', null)
        .order('created_at', { ascending: false })
        .limit(1);

      if (selectError || !data || data.length === 0) {
        return {
          success: false,
          error: 'No OTP found for this user',
        };
      }

      const record = data[0] as unknown as SMSOTPRecord;

      // Check expiration
      const now = new Date();
      const expiresAt = new Date(record.expires_at);
      if (now > expiresAt && !options.expiredOK) {
        return {
          success: false,
          error: 'OTP has expired',
        };
      }

      // Check attempts
      if (record.attempts >= record.max_attempts) {
        return {
          success: false,
          error: 'Maximum OTP attempts exceeded',
        };
      }

      // Verify code
      if (record.otp_code !== otpCode) {
        // Increment attempts
        // Table sms_otp_codes will be created in Task 2 migration
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        const { error: updateError } = await supabase
          .from('sms_otp_codes')
          .update({ attempts: record.attempts + 1 })
          .eq('id', record.id);

        if (updateError) {
          console.error('Failed to increment OTP attempts:', updateError);
        }

        return {
          success: false,
          error: 'Invalid OTP code',
        };
      }

      // Mark as verified
      // Table sms_otp_codes will be created in Task 2 migration
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      const { error: verifyError } = await supabase
        .from('sms_otp_codes')
        .update({ verified_at: new Date().toISOString() })
        .eq('id', record.id);

      if (verifyError) {
        console.error('Failed to mark OTP as verified:', verifyError);
        return {
          success: false,
          error: 'Failed to verify OTP',
        };
      }

      return {
        success: true,
        verified: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  }

  return {
    generateAndSendOTP,
    verifyOTP,
  };
}

export type SMSOTPManager = ReturnType<typeof createSMSOTPManager>;
