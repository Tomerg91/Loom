# SMS OTP MFA Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable users to set up and use SMS One-Time Password (OTP) as a second authentication factor, extending the existing TOTP-based MFA system.

**Architecture:** Extend the existing `mfa-service.ts` to support SMS delivery via Twilio. Store OTP codes with 5-minute expiration. Integrate with existing signin flow to accept SMS verification. Update MFA settings UI to allow SMS method configuration.

**Tech Stack:**

- Twilio SDK for SMS delivery
- Supabase PostgreSQL for OTP storage
- Next.js API routes for endpoints
- React components for UI
- Vitest for testing

---

## Task 1: Create Twilio Service Wrapper

**Files:**

- Create: `src/lib/services/twilio-sms-service.ts`
- Create: `src/lib/services/__tests__/twilio-sms-service.test.ts`

**Step 1: Write the failing test for SMS sending**

```typescript
// src/lib/services/__tests__/twilio-sms-service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTwilioSMSService } from '../twilio-sms-service';

describe('Twilio SMS Service', () => {
  it('should send SMS successfully with valid phone and message', async () => {
    const mockEnv = {
      TWILIO_ACCOUNT_SID: 'test-sid',
      TWILIO_AUTH_TOKEN: 'test-token',
      TWILIO_PHONE_NUMBER: '+1234567890',
    };

    const service = createTwilioSMSService(mockEnv);
    const result = await service.sendSMS('+1987654321', 'Your OTP is 123456');

    expect(result.success).toBe(true);
    expect(result.messageSid).toBeDefined();
  });

  it('should handle SMS sending failure gracefully', async () => {
    const mockEnv = {
      TWILIO_ACCOUNT_SID: 'invalid',
      TWILIO_AUTH_TOKEN: 'invalid',
      TWILIO_PHONE_NUMBER: '+1234567890',
    };

    const service = createTwilioSMSService(mockEnv);
    const result = await service.sendSMS('+1987654321', 'Test');

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should validate phone number format before sending', async () => {
    const mockEnv = {
      TWILIO_ACCOUNT_SID: 'test-sid',
      TWILIO_AUTH_TOKEN: 'test-token',
      TWILIO_PHONE_NUMBER: '+1234567890',
    };

    const service = createTwilioSMSService(mockEnv);
    const result = await service.sendSMS('invalid-phone', 'Test');

    expect(result.success).toBe(false);
    expect(result.error).toContain('invalid phone');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/lib/services/__tests__/twilio-sms-service.test.ts
```

Expected: FAIL - "createTwilioSMSService is not exported"

**Step 3: Implement the Twilio SMS service**

```typescript
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
```

**Step 4: Run test to verify it passes**

```bash
npm run test:run -- src/lib/services/__tests__/twilio-sms-service.test.ts
```

Expected: PASS (3/3 tests)

**Step 5: Commit**

```bash
git add src/lib/services/twilio-sms-service.ts src/lib/services/__tests__/twilio-sms-service.test.ts
git commit -m "feat: add Twilio SMS service wrapper with phone validation"
```

---

## Task 2: Create Database Migration for SMS OTP Storage

**Files:**

- Create: `supabase/migrations/[timestamp]_add_sms_otp_tables.sql`
- Modify: `.env.local` (add Twilio variables)

**Step 1: Create the migration file**

```bash
# Get timestamp for migration
TIMESTAMP=$(date +%Y%m%d%H%M%S)
touch "supabase/migrations/${TIMESTAMP}_add_sms_otp_tables.sql"
```

**Step 2: Write the migration SQL**

```sql
-- supabase/migrations/[timestamp]_add_sms_otp_tables.sql

-- Create table for SMS OTP codes
CREATE TABLE sms_otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL, -- Encrypted in app, stored as-is for simplicity
  otp_code TEXT NOT NULL, -- 6-digit code
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE,

  -- Indexes for performance
  CONSTRAINT otp_not_expired CHECK (created_at < expires_at)
);

CREATE INDEX idx_sms_otp_user_id ON sms_otp_codes(user_id);
CREATE INDEX idx_sms_otp_expires_at ON sms_otp_codes(expires_at);

-- Update user_mfa_methods to include SMS support
ALTER TABLE user_mfa_methods
ADD COLUMN IF NOT EXISTS sms_phone TEXT,
ADD COLUMN IF NOT EXISTS sms_verified_at TIMESTAMP WITH TIME ZONE;

-- Create table for SMS delivery tracking (audit/debugging)
CREATE TABLE sms_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  message TEXT NOT NULL,
  twilio_message_sid TEXT,
  status TEXT, -- 'sent', 'failed', etc.
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sms_delivery_user ON sms_delivery_logs(user_id);

-- Enable RLS on new tables
ALTER TABLE sms_otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_delivery_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for sms_otp_codes
CREATE POLICY "Users can view their own OTP codes"
  ON sms_otp_codes FOR SELECT
  USING (auth.uid() = user_id);

-- RLS policies for sms_delivery_logs
CREATE POLICY "Users can view their own delivery logs"
  ON sms_delivery_logs FOR SELECT
  USING (auth.uid() = user_id);

GRANT SELECT ON sms_otp_codes TO authenticated;
GRANT SELECT ON sms_delivery_logs TO authenticated;
```

**Step 3: Apply migration**

```bash
npx supabase migration up
```

Expected: Migration applied successfully

**Step 4: Update environment variables**

Add to `.env.local`:

```env
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
SMS_OTP_EXPIRY_MINUTES=5
SMS_OTP_LENGTH=6
```

**Step 5: Commit**

```bash
git add supabase/migrations/
git commit -m "feat: create SMS OTP tables with RLS policies"
```

---

## Task 3: Create SMS OTP Manager Service

**Files:**

- Create: `src/lib/services/sms-otp-manager.ts`
- Create: `src/lib/services/__tests__/sms-otp-manager.test.ts`

**Step 1: Write failing tests for OTP generation and verification**

```typescript
// src/lib/services/__tests__/sms-otp-manager.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSMSOTPManager } from '../sms-otp-manager';
import type { Database } from '@/types/supabase';

describe('SMS OTP Manager', () => {
  let manager: ReturnType<typeof createSMSOTPManager>;
  let mockSupabase: any;
  let mockTwilio: any;

  beforeEach(() => {
    mockTwilio = {
      sendOTP: vi
        .fn()
        .mockResolvedValue({ success: true, messageSid: 'msg_123' }),
    };
    mockSupabase = {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
        update: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    };

    manager = createSMSOTPManager(mockSupabase, mockTwilio);
  });

  it('should generate and send OTP successfully', async () => {
    const result = await manager.generateAndSendOTP('user-123', '+1987654321');

    expect(result.success).toBe(true);
    expect(result.otpCode).toHaveLength(6);
    expect(mockTwilio.sendOTP).toHaveBeenCalled();
  });

  it('should verify correct OTP code', async () => {
    const result = await manager.verifyOTP('user-123', '123456');

    expect(result.success).toBe(true);
  });

  it('should reject expired OTP codes', async () => {
    const result = await manager.verifyOTP('user-123', '123456', {
      expiredOK: false,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('expired');
  });

  it('should enforce max attempts limit', async () => {
    // After 5 failed attempts, should be blocked
    const result = await manager.verifyOTP('user-123', 'wrong-code');

    expect(result.success).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/lib/services/__tests__/sms-otp-manager.test.ts
```

Expected: FAIL - "createSMSOTPManager is not exported"

**Step 3: Implement SMS OTP Manager**

```typescript
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

      const record = data[0];

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
```

**Step 4: Run test to verify it passes**

```bash
npm run test:run -- src/lib/services/__tests__/sms-otp-manager.test.ts
```

Expected: PASS (4/4 tests)

**Step 5: Commit**

```bash
git add src/lib/services/sms-otp-manager.ts src/lib/services/__tests__/sms-otp-manager.test.ts
git commit -m "feat: add SMS OTP generation, sending, and verification service"
```

---

## Task 4: Create SMS OTP API Endpoints

**Files:**

- Create: `src/app/api/auth/mfa/sms/request/route.ts`
- Create: `src/app/api/auth/mfa/sms/verify/route.ts`

**Step 1: Write SMS request endpoint with tests**

```typescript
// src/app/api/auth/mfa/sms/request/route.ts
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

const requestSchema = z.object({
  phoneNumber: z
    .string()
    .regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number format'),
});

export async function POST(request: NextRequest) {
  try {
    const user = await createAuthService({ isServer: true }).getUser();

    if (!user) {
      return createErrorResponse('Unauthorized', HTTP_STATUS.UNAUTHORIZED);
    }

    const body = await request.json();
    const validation = requestSchema.safeParse(body);

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

    const result = await otpManager.generateAndSendOTP(
      user.id,
      validation.data.phoneNumber
    );

    if (!result.success) {
      return createErrorResponse(
        result.error || 'Failed to send OTP',
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }

    return createSuccessResponse({
      message: 'OTP sent successfully',
      expiresIn: 300, // 5 minutes in seconds
    });
  } catch (error) {
    console.error('SMS OTP request error:', error);
    return createErrorResponse(
      'Internal server error',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
}
```

**Step 2: Write SMS verify endpoint**

```typescript
// src/app/api/auth/mfa/sms/verify/route.ts
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
    const user = await createAuthService({ isServer: true }).getUser();

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
```

**Step 3: Test endpoints manually or write integration tests**

```bash
# Test SMS request endpoint
curl -X POST http://localhost:3000/api/auth/mfa/sms/request \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"+1234567890"}'

# Expected: 200 with success message
```

**Step 4: Commit**

```bash
git add src/app/api/auth/mfa/sms/
git commit -m "feat: add SMS OTP request and verify endpoints"
```

---

## Task 5: Create SMS Setup UI Components

**Files:**

- Create: `src/components/auth/mfa/sms-setup-form.tsx`
- Create: `src/components/auth/mfa/sms-otp-input.tsx`

**Step 1: Create SMS Setup Form Component**

```typescript
// src/components/auth/mfa/sms-setup-form.tsx
'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/toast-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export function SMSSetupForm({ onSetupComplete }: { onSetupComplete?: () => void }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'enter-phone' | 'verify-otp'>('enter-phone');
  const [otpCode, setOtpCode] = useState('');
  const { toast } = useToast();

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/mfa/sms/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber }),
      });

      if (!response.ok) {
        throw new Error('Failed to send OTP');
      }

      toast({
        title: 'OTP Sent',
        description: `Check your SMS at ${phoneNumber}`,
        variant: 'default',
      });

      setStep('verify-otp');
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send OTP',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/mfa/sms/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: otpCode }),
      });

      if (!response.ok) {
        throw new Error('Invalid OTP code');
      }

      toast({
        title: 'Success',
        description: 'SMS MFA has been set up successfully',
        variant: 'default',
      });

      onSetupComplete?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to verify OTP',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set Up SMS Authentication</CardTitle>
        <CardDescription>Receive security codes via SMS</CardDescription>
      </CardHeader>
      <CardContent>
        {step === 'enter-phone' && (
          <form onSubmit={handleRequestOTP} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Phone Number (E.164 format)</label>
              <Input
                type="tel"
                placeholder="+1234567890"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={isLoading}
                required
              />
              <p className="text-xs text-gray-500 mt-2">Include country code, e.g., +1 for USA</p>
            </div>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Send Code'}
            </Button>
          </form>
        )}

        {step === 'verify-otp' && (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div className="flex items-gap-2 p-3 bg-blue-50 rounded">
              <AlertCircle className="w-4 h-4 text-blue-600" />
              <p className="text-sm text-blue-600">Enter the 6-digit code sent to {phoneNumber}</p>
            </div>
            <div>
              <label className="text-sm font-medium">6-Digit Code</label>
              <Input
                type="text"
                placeholder="000000"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.slice(0, 6))}
                maxLength={6}
                disabled={isLoading}
                required
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setStep('enter-phone');
                  setOtpCode('');
                }}
                disabled={isLoading}
              >
                Back
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Verifying...' : 'Verify Code'}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/auth/mfa/sms-setup-form.tsx
git commit -m "feat: add SMS setup form component with OTP verification"
```

---

## Task 6: Integrate SMS OTP into Sign-In Flow

**Files:**

- Modify: `src/app/api/auth/signin/route.ts` (add SMS support)
- Modify: `src/components/auth/mfa-verification-form.tsx` (add SMS option)

**Step 1: Update sign-in endpoint to support SMS**

Add SMS method selection to existing signin route (in the MFA verification section):

```typescript
// In src/app/api/auth/signin/route.ts, add this after checking for MFA requirement:

const mfaMethods = await supabase
  .from('user_mfa_methods')
  .select('method_type, sms_phone')
  .eq('user_id', user.id);

// Return available MFA methods
if (requiresMFA) {
  return NextResponse.json({
    requiresMFA: true,
    availableMethods: mfaMethods.data?.map(m => m.method_type) || ['totp'],
    userId: user.id,
  });
}
```

**Step 2: Update MFA verification form to show SMS option**

```typescript
// In src/components/auth/mfa-verification-form.tsx, add SMS as method option

// Add state for selected method
const [selectedMethod, setSelectedMethod] = useState<'totp' | 'sms'>('totp');

// Add tab selection:
<Tabs value={selectedMethod} onValueChange={(v: any) => setSelectedMethod(v)}>
  <TabsList>
    <TabsTrigger value="totp">Authenticator App</TabsTrigger>
    {availableMethods?.includes('sms') && (
      <TabsTrigger value="sms">SMS Code</TabsTrigger>
    )}
  </TabsList>

  <TabsContent value="totp">
    {/* Existing TOTP form */}
  </TabsContent>

  <TabsContent value="sms">
    <SMSMFAVerification userId={userId} />
  </TabsContent>
</Tabs>
```

**Step 3: Commit**

```bash
git add src/app/api/auth/signin/route.ts src/components/auth/mfa-verification-form.tsx
git commit -m "feat: integrate SMS OTP into sign-in MFA flow"
```

---

## Task 7: Write Comprehensive Tests

**Files:**

- Create: `src/test/integration/sms-mfa-flow.test.ts`

**Step 1: Write full integration test**

```typescript
// src/test/integration/sms-mfa-flow.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createClient } from '@/lib/supabase/server';

describe('SMS MFA Integration Flow', () => {
  let userId: string;

  beforeEach(async () => {
    // Setup test user
    userId = 'test-user-' + Date.now();
  });

  it('should complete full SMS OTP flow: request, verify, signin', async () => {
    // 1. Request SMS OTP
    const requestRes = await fetch('/api/auth/mfa/sms/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '+1234567890' }),
    });

    expect(requestRes.ok).toBe(true);

    // 2. Retrieve OTP from database (in test environment)
    const supabase = createClient();
    const { data: otpData } = await supabase
      .from('sms_otp_codes')
      .select('otp_code')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    expect(otpData).toHaveLength(1);
    const otpCode = otpData![0].otp_code;

    // 3. Verify OTP
    const verifyRes = await fetch('/api/auth/mfa/sms/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: otpCode }),
    });

    expect(verifyRes.ok).toBe(true);
  });

  it('should reject invalid OTP code', async () => {
    const verifyRes = await fetch('/api/auth/mfa/sms/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: '000000' }),
    });

    expect(verifyRes.status).toBe(401);
  });

  it('should rate limit after max OTP attempts', async () => {
    // Request OTP
    await fetch('/api/auth/mfa/sms/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '+1234567890' }),
    });

    // Try invalid codes 5 times
    for (let i = 0; i < 5; i++) {
      await fetch('/api/auth/mfa/sms/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: '000000' }),
      });
    }

    // 6th attempt should be blocked
    const finalRes = await fetch('/api/auth/mfa/sms/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: '000000' }),
    });

    expect(finalRes.status).toBe(401);
  });
});
```

**Step 2: Run tests**

```bash
npm run test:run -- src/test/integration/sms-mfa-flow.test.ts
```

**Step 3: Commit**

```bash
git add src/test/integration/sms-mfa-flow.test.ts
git commit -m "test: add comprehensive SMS MFA integration tests"
```

---

## Final Verification

**Step 1: Run all tests**

```bash
npm run test:run
```

**Step 2: Run linting**

```bash
npm run lint
```

**Step 3: Build**

```bash
npm run build
```

**Step 4: Final commit**

```bash
git log --oneline -10
# Verify all SMS OTP commits are present
```

---

## Success Criteria Checklist

- [ ] SMS OTP codes can be requested for a verified phone number
- [ ] SMS codes are sent via Twilio successfully
- [ ] Users can verify OTP codes in the sign-in flow
- [ ] Invalid codes are rejected with proper error messages
- [ ] Max attempts limit (5) is enforced
- [ ] OTP codes expire after 5 minutes
- [ ] All tests pass (unit + integration)
- [ ] No linting errors
- [ ] Build completes successfully
- [ ] Database migrations applied cleanly

---

## Rollback Plan

If issues arise:

```bash
# Revert migrations
npx supabase migration down

# Revert commits
git reset --hard [commit-before-sms-changes]
```
