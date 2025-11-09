'use client';

import { useState } from 'react';
import { AlertCircle } from 'lucide-react';

import { useToast } from '@/components/ui/toast-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded">
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
