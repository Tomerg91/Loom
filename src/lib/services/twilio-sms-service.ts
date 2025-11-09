// src/lib/services/twilio-sms-service.ts
import twilio from 'twilio';

interface TwilioConfig {
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
  TWILIO_PHONE_NUMBER: string;
}

interface SMSResult {
  success: boolean;
  messageSid?: string;
  error?: string;
}

// Validate phone number format (E.164)
function isValidPhoneNumber(phone: string): boolean {
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phone);
}

export function createTwilioSMSService(config: TwilioConfig) {
  // Validate sender phone number format
  if (!isValidPhoneNumber(config.TWILIO_PHONE_NUMBER)) {
    throw new Error('TWILIO_PHONE_NUMBER must be in E.164 format (e.g., +1234567890)');
  }

  const client = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);

  async function sendSMS(toPhone: string, message: string): Promise<SMSResult> {
    try {
      // Validate phone number
      if (!isValidPhoneNumber(toPhone)) {
        return {
          success: false,
          error: 'invalid phone number format (must be E.164: +1234567890)',
        };
      }

      // Validate message
      if (!message || message.length === 0) {
        return {
          success: false,
          error: 'message cannot be empty',
        };
      }

      // Send SMS via Twilio
      const result = await client.messages.create({
        body: message,
        from: config.TWILIO_PHONE_NUMBER,
        to: toPhone,
      });

      return {
        success: true,
        messageSid: result.sid,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error sending SMS',
      };
    }
  }

  async function sendOTP(toPhone: string, otp: string): Promise<SMSResult> {
    const message = `Your Loom authentication code is: ${otp}. This code expires in 5 minutes. Do not share it with anyone.`;
    return sendSMS(toPhone, message);
  }

  return {
    sendSMS,
    sendOTP,
  };
}

export type TwilioSMSService = ReturnType<typeof createTwilioSMSService>;
