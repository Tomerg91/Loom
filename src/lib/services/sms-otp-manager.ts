// src/lib/services/sms-otp-manager.ts
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

function generateOTP(length: number = 6): string {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
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
      const otpCode = generateOTP(6);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

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

      // Log delivery
      if (smsResult.success) {
        // Table sms_delivery_logs will be created in Task 2 migration
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        await supabase.from('sms_delivery_logs').insert({
          user_id: userId,
          phone_number: phoneNumber,
          message: `OTP: ${otpCode}`,
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
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async function verifyOTP(
    userId: string,
    otpCode: string,
    options: { expiredOK?: boolean } = {}
  ): Promise<VerifyResult> {
    try {
      // Get the latest OTP for this user
      // Table sms_otp_codes will be created in Task 2 migration
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      const { data, error: selectError } = await supabase
        .from('sms_otp_codes')
        .select('*')
        .eq('user_id', userId)
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
        await supabase
          .from('sms_otp_codes')
          .update({ attempts: record.attempts + 1 })
          .eq('id', record.id);

        return {
          success: false,
          error: 'Invalid OTP code',
        };
      }

      // Mark as verified
      // Table sms_otp_codes will be created in Task 2 migration
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      await supabase
        .from('sms_otp_codes')
        .update({ verified_at: new Date().toISOString() })
        .eq('id', record.id);

      return {
        success: true,
        verified: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  return {
    generateAndSendOTP,
    verifyOTP,
  };
}

export type SMSOTPManager = ReturnType<typeof createSMSOTPManager>;
