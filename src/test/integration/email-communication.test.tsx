import { screen, waitFor, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';

import { renderWithProviders, mockUser, setupTestEnvironment } from '@/test/utils';

// Mock Next.js navigation
const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  usePathname: () => '/auth/verify',
}));

// Mock email service
const mockEmailService = {
  sendVerificationEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendSessionReminder: vi.fn(),
  sendWelcomeEmail: vi.fn(),
  sendNotificationEmail: vi.fn(),
  verifyEmailCode: vi.fn(),
  subscribeToNewsletter: vi.fn(),
  unsubscribeFromNewsletter: vi.fn(),
};

vi.mock('@/lib/services/email-service', () => ({
  emailService: mockEmailService,
}));

// Mock SMS service
const mockSmsService = {
  sendVerificationSMS: vi.fn(),
  sendSessionReminder: vi.fn(),
  sendUrgentNotification: vi.fn(),
};

vi.mock('@/lib/services/sms-service', () => ({
  smsService: mockSmsService,
}));

// Mock push notification service
const mockPushService = {
  sendPushNotification: vi.fn(),
  subscribeToPush: vi.fn(),
  unsubscribeFromPush: vi.fn(),
};

vi.mock('@/lib/services/push-service', () => ({
  pushService: mockPushService,
}));

// Mock toast notifications
const mockToast = vi.fn();
vi.mock('@/lib/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Email verification component
const EmailVerificationFlow = ({ email, userId }: { email: string; userId: string }) => {
  const [verificationCode, setVerificationCode] = React.useState('');
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [resendCooldown, setResendCooldown] = React.useState(0);

  const handleSendVerification = async () => {
    try {
      await mockEmailService.sendVerificationEmail(email, userId);
      setResendCooldown(60); // 60 second cooldown
      
      mockToast({
        title: 'Verification Email Sent',
        description: `Check your email at ${email}`,
        variant: 'default',
      });
    } catch (_error) {
      mockToast({
        title: 'Failed to Send Email',
        description: 'Please try again later',
        variant: 'destructive',
      });
    }
  };

  const handleVerifyCode = async () => {
    setIsVerifying(true);
    try {
      const result = await mockEmailService.verifyEmailCode(email, verificationCode);
      
      if (result.valid) {
        mockToast({
          title: 'Email Verified',
          description: 'Your email has been successfully verified',
          variant: 'default',
        });
        mockPush('/dashboard');
      } else {
        mockToast({
          title: 'Invalid Code',
          description: 'Please check the code and try again',
          variant: 'destructive',
        });
      }
    } catch (error) {
      mockToast({
        title: 'Verification Failed',
        description: 'An error occurred during verification',
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  React.useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  return (
    <div>
      <h2>Verify Your Email</h2>
      <p>We sent a verification code to {email}</p>
      
      <input
        type="text"
        value={verificationCode}
        onChange={(e) => setVerificationCode(e.target.value)}
        placeholder="Enter verification code"
        data-testid="verification-code-input"
      />
      
      <button
        onClick={handleVerifyCode}
        disabled={isVerifying || !verificationCode}
        data-testid="verify-button"
      >
        {isVerifying ? 'Verifying...' : 'Verify Email'}
      </button>
      
      <button
        onClick={handleSendVerification}
        disabled={resendCooldown > 0}
        data-testid="resend-button"
      >
        {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
      </button>
    </div>
  );
};

// Password reset flow component
const PasswordResetFlow = ({ email }: { email: string }) => {
  const [resetCode, setResetCode] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [step, setStep] = React.useState<'request' | 'verify' | 'reset'>('request' as 'request' | 'verify' | 'reset');

  const handleRequestReset = async () => {
    try {
      await mockEmailService.sendPasswordResetEmail(email);
      setStep('verify');
      
      mockToast({
        title: 'Reset Email Sent',
        description: 'Check your email for reset instructions',
        variant: 'default',
      });
    } catch (error) {
      mockToast({
        title: 'Failed to Send Reset Email',
        description: 'Please try again later',
        variant: 'destructive',
      });
    }
  };

  const handleVerifyResetCode = async () => {
    try {
      const result = await mockEmailService.verifyEmailCode(email, resetCode);
      
      if (result.valid) {
        setStep('reset');
      } else {
        mockToast({
          title: 'Invalid Reset Code',
          description: 'Please check the code and try again',
          variant: 'destructive',
        });
      }
    } catch (error) {
      mockToast({
        title: 'Verification Failed',
        description: 'An error occurred during verification',
        variant: 'destructive',
      });
    }
  };

  const handlePasswordReset = async () => {
    if (newPassword !== confirmPassword) {
      mockToast({
        title: 'Passwords Do Not Match',
        description: 'Please ensure both passwords are identical',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Would call actual password reset API
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      mockToast({
        title: 'Password Reset Successful',
        description: 'You can now sign in with your new password',
        variant: 'default',
      });
      
      mockPush('/auth/signin');
    } catch (error) {
      mockToast({
        title: 'Password Reset Failed',
        description: 'Please try again later',
        variant: 'destructive',
      });
    }
  };

  return (
    <div data-testid={`reset-step-${step}`}>
      {step === 'request' && (
        <div>
          <h2>Reset Password</h2>
          <p>Enter your email to receive reset instructions</p>
          <button onClick={handleRequestReset} data-testid="request-reset-button">
            Send Reset Email
          </button>
        </div>
      )}

      {step === 'verify' && (
        <div>
          <h2>Enter Reset Code</h2>
          <input
            type="text"
            value={resetCode}
            onChange={(e) => setResetCode(e.target.value)}
            placeholder="Enter reset code"
            data-testid="reset-code-input"
          />
          <button onClick={handleVerifyResetCode} data-testid="verify-reset-button">
            Verify Code
          </button>
        </div>
      )}

      {step === 'reset' && (
        <div>
          <h2>Set New Password</h2>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password"
            data-testid="new-password-input"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm password"
            data-testid="confirm-password-input"
          />
          <button onClick={handlePasswordReset} data-testid="reset-password-button">
            Reset Password
          </button>
        </div>
      )}
    </div>
  );
};

// Multi-channel notification manager
const NotificationManager = ({ userId, preferences }: { 
  userId: string; 
  preferences: {
    email: boolean;
    sms: boolean;
    push: boolean;
  }
}) => {
  const [testMessage, setTestMessage] = React.useState('');

  const sendMultiChannelNotification = async (message: string, priority: 'low' | 'medium' | 'high') => {
    const channels = [];

    try {
      // Always send email if enabled
      if (preferences.email) {
        await mockEmailService.sendNotificationEmail(userId, {
          subject: 'Loom Notification',
          message,
          priority,
        });
        channels.push('email');
      }

      // Send SMS for medium/high priority if enabled
      if (preferences.sms && priority !== 'low') {
        if (priority === 'high') {
          await mockSmsService.sendUrgentNotification(userId, message);
        } else {
          // Would use regular SMS service for medium priority
        }
        channels.push('sms');
      }

      // Send push notification if enabled
      if (preferences.push) {
        await mockPushService.sendPushNotification(userId, {
          title: 'Loom Notification',
          body: message,
          priority,
        });
        channels.push('push');
      }

      mockToast({
        title: 'Notification Sent',
        description: `Sent via: ${channels.join(', ')}`,
        variant: 'default',
      });
    } catch (error) {
      mockToast({
        title: 'Notification Failed',
        description: 'Some channels may have failed',
        variant: 'destructive',
      });
    }
  };

  return (
    <div>
      <h3>Test Multi-Channel Notifications</h3>
      <input
        type="text"
        value={testMessage}
        onChange={(e) => setTestMessage(e.target.value)}
        placeholder="Test message"
        data-testid="test-message-input"
      />
      
      <div>
        <button
          onClick={() => sendMultiChannelNotification(testMessage, 'low')}
          data-testid="send-low-priority"
        >
          Send Low Priority
        </button>
        <button
          onClick={() => sendMultiChannelNotification(testMessage, 'medium')}
          data-testid="send-medium-priority"
        >
          Send Medium Priority
        </button>
        <button
          onClick={() => sendMultiChannelNotification(testMessage, 'high')}
          data-testid="send-high-priority"
        >
          Send High Priority
        </button>
      </div>

      <div data-testid="channel-status">
        <p>Email: {preferences.email ? 'Enabled' : 'Disabled'}</p>
        <p>SMS: {preferences.sms ? 'Enabled' : 'Disabled'}</p>
        <p>Push: {preferences.push ? 'Enabled' : 'Disabled'}</p>
      </div>
    </div>
  );
};

// Session reminder system
const SessionReminderSystem = () => {
  const [reminderSettings, setReminderSettings] = React.useState({
    email24h: true,
    email1h: true,
    sms15m: false,
    push5m: true,
  });

  const sendSessionReminders = async (sessionId: string, sessionTime: Date) => {
    const now = new Date();
    const timeDiff = sessionTime.getTime() - now.getTime();
    const hoursUntilSession = timeDiff / (1000 * 60 * 60);

    try {
      // 24 hour email reminder
      if (reminderSettings.email24h && hoursUntilSession <= 24) {
        await mockEmailService.sendSessionReminder(sessionId, '24h');
      }

      // 1 hour email reminder
      if (reminderSettings.email1h && hoursUntilSession <= 1) {
        await mockEmailService.sendSessionReminder(sessionId, '1h');
      }

      // 15 minute SMS reminder
      if (reminderSettings.sms15m && hoursUntilSession <= 0.25) {
        await mockSmsService.sendSessionReminder(sessionId);
      }

      // 5 minute push notification
      if (reminderSettings.push5m && hoursUntilSession <= (5 / 60)) {
        await mockPushService.sendPushNotification(mockUser.id, {
          title: 'Session Starting Soon',
          body: 'Your coaching session starts in 5 minutes',
          data: { sessionId },
        });
      }

      mockToast({
        title: 'Reminders Sent',
        description: 'Session reminders sent based on your preferences',
        variant: 'default',
      });
    } catch (error) {
      mockToast({
        title: 'Reminder Failed',
        description: 'Some reminders may not have been sent',
        variant: 'destructive',
      });
    }
  };

  const handleTestReminders = () => {
    const futureSession = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
    sendSessionReminders('test-session-123', futureSession);
  };

  return (
    <div>
      <h3>Session Reminder Settings</h3>
      
      <div data-testid="reminder-settings">
        <label>
          <input
            type="checkbox"
            checked={reminderSettings.email24h}
            onChange={(e) => setReminderSettings((prev: typeof reminderSettings) => ({ 
              ...prev, 
              email24h: e.target.checked 
            }))}
          />
          Email 24 hours before
        </label>
        
        <label>
          <input
            type="checkbox"
            checked={reminderSettings.email1h}
            onChange={(e) => setReminderSettings(prev => ({ 
              ...prev, 
              email1h: e.target.checked 
            }))}
          />
          Email 1 hour before
        </label>
        
        <label>
          <input
            type="checkbox"
            checked={reminderSettings.sms15m}
            onChange={(e) => setReminderSettings(prev => ({ 
              ...prev, 
              sms15m: e.target.checked 
            }))}
          />
          SMS 15 minutes before
        </label>
        
        <label>
          <input
            type="checkbox"
            checked={reminderSettings.push5m}
            onChange={(e) => setReminderSettings(prev => ({ 
              ...prev, 
              push5m: e.target.checked 
            }))}
          />
          Push notification 5 minutes before
        </label>
      </div>

      <button onClick={handleTestReminders} data-testid="test-reminders">
        Test Session Reminders
      </button>
    </div>
  );
};

describe('Email and Communication Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupTestEnvironment();

    // Mock React hooks
    let stateIndex = 0;
    const mockStates: any[] = [
      ['', vi.fn()], // verificationCode
      [false, vi.fn()], // isVerifying
      [0, vi.fn()], // resendCooldown
      ['', vi.fn()], // resetCode
      ['', vi.fn()], // newPassword
      ['', vi.fn()], // confirmPassword
      ['request', vi.fn()], // step
      ['', vi.fn()], // testMessage
      [{ email24h: true, email1h: true, sms15m: false, push5m: true }, vi.fn()], // reminderSettings
    ];

    React.useState.mockImplementation(() => mockStates[stateIndex++]);
    React.useEffect.mockImplementation((fn) => fn());
    React.useCallback.mockImplementation((fn) => fn);

    // Default successful service mocks
    mockEmailService.sendVerificationEmail.mockResolvedValue({ sent: true, messageId: 'msg-123' });
    mockEmailService.verifyEmailCode.mockResolvedValue({ valid: true });
    mockEmailService.sendPasswordResetEmail.mockResolvedValue({ sent: true, resetToken: 'reset-123' });
    mockSmsService.sendVerificationSMS.mockResolvedValue({ sent: true, messageId: 'sms-123' });
    mockPushService.sendPushNotification.mockResolvedValue({ sent: true, notificationId: 'push-123' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Email Verification Workflow', () => {
    it('completes email verification flow successfully', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <EmailVerificationFlow email={mockUser.email} userId={mockUser.id} />
      );

      expect(screen.getByText(`We sent a verification code to ${mockUser.email}`)).toBeInTheDocument();

      // Send initial verification email
      const resendButton = screen.getByTestId('resend-button');
      await user.click(resendButton);

      await waitFor(() => {
        expect(mockEmailService.sendVerificationEmail).toHaveBeenCalledWith(
          mockUser.email,
          mockUser.id
        );
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Verification Email Sent',
        description: `Check your email at ${mockUser.email}`,
        variant: 'default',
      });

      // Enter verification code
      const codeInput = screen.getByTestId('verification-code-input');
      await user.type(codeInput, '123456');

      // Verify code
      const verifyButton = screen.getByTestId('verify-button');
      await user.click(verifyButton);

      await waitFor(() => {
        expect(mockEmailService.verifyEmailCode).toHaveBeenCalledWith(
          mockUser.email,
          '123456'
        );
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Email Verified',
        description: 'Your email has been successfully verified',
        variant: 'default',
      });

      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });

    it('handles invalid verification codes', async () => {
      const user = userEvent.setup();
      mockEmailService.verifyEmailCode.mockResolvedValue({ valid: false });

      renderWithProviders(
        <EmailVerificationFlow email={mockUser.email} userId={mockUser.id} />
      );

      const codeInput = screen.getByTestId('verification-code-input');
      await user.type(codeInput, '000000');

      const verifyButton = screen.getByTestId('verify-button');
      await user.click(verifyButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Invalid Code',
          description: 'Please check the code and try again',
          variant: 'destructive',
        });
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('enforces resend cooldown period', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <EmailVerificationFlow email={mockUser.email} userId={mockUser.id} />
      );

      // First send should work
      const resendButton = screen.getByTestId('resend-button');
      await user.click(resendButton);

      await waitFor(() => {
        expect(mockEmailService.sendVerificationEmail).toHaveBeenCalledTimes(1);
      });

      // Button should be disabled during cooldown
      expect(resendButton).toBeDisabled();
      expect(resendButton).toHaveTextContent(/Resend in \d+s/);

      // Mock cooldown state change
      const setResendCooldown = React.useState.mock.results[2].value[1];
      act(() => {
        setResendCooldown(0);
      });

      await waitFor(() => {
        expect(resendButton).not.toBeDisabled();
        expect(resendButton).toHaveTextContent('Resend Code');
      });
    });

    it('handles email service failures gracefully', async () => {
      const user = userEvent.setup();
      mockEmailService.sendVerificationEmail.mockRejectedValue(new Error('SMTP server unavailable'));

      renderWithProviders(
        <EmailVerificationFlow email={mockUser.email} userId={mockUser.id} />
      );

      const resendButton = screen.getByTestId('resend-button');
      await user.click(resendButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Failed to Send Email',
          description: 'Please try again later',
          variant: 'destructive',
        });
      });
    });
  });

  describe('Password Reset Workflow', () => {
    it('completes full password reset flow', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PasswordResetFlow email={mockUser.email} />);

      // Step 1: Request reset
      expect(screen.getByTestId('reset-step-request')).toBeInTheDocument();

      const requestButton = screen.getByTestId('request-reset-button');
      await user.click(requestButton);

      await waitFor(() => {
        expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalledWith(mockUser.email);
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Reset Email Sent',
        description: 'Check your email for reset instructions',
        variant: 'default',
      });

      // Mock step change
      const setStep = React.useState.mock.results[6].value[1];
      act(() => {
        setStep('verify');
      });

      // Step 2: Verify reset code
      await waitFor(() => {
        expect(screen.getByTestId('reset-step-verify')).toBeInTheDocument();
      });

      const resetCodeInput = screen.getByTestId('reset-code-input');
      await user.type(resetCodeInput, 'RESET123');

      const verifyResetButton = screen.getByTestId('verify-reset-button');
      await user.click(verifyResetButton);

      await waitFor(() => {
        expect(mockEmailService.verifyEmailCode).toHaveBeenCalledWith(
          mockUser.email,
          'RESET123'
        );
      });

      // Mock step change to reset
      act(() => {
        setStep('reset');
      });

      // Step 3: Set new password
      await waitFor(() => {
        expect(screen.getByTestId('reset-step-reset')).toBeInTheDocument();
      });

      const newPasswordInput = screen.getByTestId('new-password-input');
      const confirmPasswordInput = screen.getByTestId('confirm-password-input');

      await user.type(newPasswordInput, 'newSecurePassword123!');
      await user.type(confirmPasswordInput, 'newSecurePassword123!');

      const resetPasswordButton = screen.getByTestId('reset-password-button');
      await user.click(resetPasswordButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Password Reset Successful',
          description: 'You can now sign in with your new password',
          variant: 'default',
        });
      });

      expect(mockPush).toHaveBeenCalledWith('/auth/signin');
    });

    it('validates password confirmation matching', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PasswordResetFlow email={mockUser.email} />);

      // Mock being on reset step
      const setStep = React.useState.mock.results[6].value[1];
      act(() => {
        setStep('reset');
      });

      await waitFor(() => {
        expect(screen.getByTestId('reset-step-reset')).toBeInTheDocument();
      });

      const newPasswordInput = screen.getByTestId('new-password-input');
      const confirmPasswordInput = screen.getByTestId('confirm-password-input');

      await user.type(newPasswordInput, 'password1');
      await user.type(confirmPasswordInput, 'password2');

      const resetPasswordButton = screen.getByTestId('reset-password-button');
      await user.click(resetPasswordButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Passwords Do Not Match',
          description: 'Please ensure both passwords are identical',
          variant: 'destructive',
        });
      });

      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('Multi-Channel Notification System', () => {
    it('sends notifications through enabled channels based on priority', async () => {
      const user = userEvent.setup();
      const preferences = {
        email: true,
        sms: true,
        push: true,
      };

      renderWithProviders(
        <NotificationManager userId={mockUser.id} preferences={preferences} />
      );

      expect(screen.getByTestId('channel-status')).toHaveTextContent('Email: Enabled');
      expect(screen.getByTestId('channel-status')).toHaveTextContent('SMS: Enabled');
      expect(screen.getByTestId('channel-status')).toHaveTextContent('Push: Enabled');

      const messageInput = screen.getByTestId('test-message-input');
      await user.type(messageInput, 'Test urgent message');

      // Test high priority (should use all channels)
      const highPriorityButton = screen.getByTestId('send-high-priority');
      await user.click(highPriorityButton);

      await waitFor(() => {
        expect(mockEmailService.sendNotificationEmail).toHaveBeenCalledWith(
          mockUser.id,
          expect.objectContaining({
            subject: 'Loom Notification',
            message: 'Test urgent message',
            priority: 'high',
          })
        );

        expect(mockSmsService.sendUrgentNotification).toHaveBeenCalledWith(
          mockUser.id,
          'Test urgent message'
        );

        expect(mockPushService.sendPushNotification).toHaveBeenCalledWith(
          mockUser.id,
          expect.objectContaining({
            title: 'Loom Notification',
            body: 'Test urgent message',
            priority: 'high',
          })
        );
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Notification Sent',
        description: 'Sent via: email, sms, push',
        variant: 'default',
      });
    });

    it('respects channel preferences for low priority notifications', async () => {
      const user = userEvent.setup();
      const preferences = {
        email: true,
        sms: true,
        push: false,
      };

      renderWithProviders(
        <NotificationManager userId={mockUser.id} preferences={preferences} />
      );

      const messageInput = screen.getByTestId('test-message-input');
      await user.type(messageInput, 'Low priority update');

      // Test low priority (should only use email, not SMS)
      const lowPriorityButton = screen.getByTestId('send-low-priority');
      await user.click(lowPriorityButton);

      await waitFor(() => {
        expect(mockEmailService.sendNotificationEmail).toHaveBeenCalledWith(
          mockUser.id,
          expect.objectContaining({
            priority: 'low',
          })
        );

        // SMS should not be sent for low priority
        expect(mockSmsService.sendUrgentNotification).not.toHaveBeenCalled();

        // Push disabled in preferences
        expect(mockPushService.sendPushNotification).not.toHaveBeenCalled();
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Notification Sent',
        description: 'Sent via: email',
        variant: 'default',
      });
    });

    it('handles partial delivery failures', async () => {
      const user = userEvent.setup();
      const preferences = {
        email: true,
        sms: true,
        push: true,
      };

      // Mock SMS failure
      mockSmsService.sendUrgentNotification.mockRejectedValue(new Error('SMS service unavailable'));

      renderWithProviders(
        <NotificationManager userId={mockUser.id} preferences={preferences} />
      );

      const messageInput = screen.getByTestId('test-message-input');
      await user.type(messageInput, 'Test message');

      const highPriorityButton = screen.getByTestId('send-high-priority');
      await user.click(highPriorityButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Notification Failed',
          description: 'Some channels may have failed',
          variant: 'destructive',
        });
      });
    });
  });

  describe('Session Reminder System', () => {
    it('sends reminders based on time preferences', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SessionReminderSystem />);

      // Verify default settings are displayed
      const settingsDiv = screen.getByTestId('reminder-settings');
      const checkboxes = within(settingsDiv).getAllByRole('checkbox');

      expect(checkboxes[0]).toBeChecked(); // email24h
      expect(checkboxes[1]).toBeChecked(); // email1h
      expect(checkboxes[2]).not.toBeChecked(); // sms15m
      expect(checkboxes[3]).toBeChecked(); // push5m

      // Test session reminders
      const testButton = screen.getByTestId('test-reminders');
      await user.click(testButton);

      await waitFor(() => {
        expect(mockEmailService.sendSessionReminder).toHaveBeenCalledWith('test-session-123', '1h');
        expect(mockPushService.sendPushNotification).toHaveBeenCalledWith(
          mockUser.id,
          expect.objectContaining({
            title: 'Session Starting Soon',
            body: 'Your coaching session starts in 5 minutes',
            data: { sessionId: 'test-session-123' },
          })
        );
      });

      // SMS should not be sent (disabled)
      expect(mockSmsService.sendSessionReminder).not.toHaveBeenCalled();

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Reminders Sent',
        description: 'Session reminders sent based on your preferences',
        variant: 'default',
      });
    });

    it('allows customization of reminder preferences', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SessionReminderSystem />);

      const settingsDiv = screen.getByTestId('reminder-settings');
      const smsCheckbox = within(settingsDiv).getAllByRole('checkbox')[2]; // sms15m

      // Enable SMS reminders
      await user.click(smsCheckbox);

      const testButton = screen.getByTestId('test-reminders');
      await user.click(testButton);

      await waitFor(() => {
        expect(mockSmsService.sendSessionReminder).toHaveBeenCalledWith('test-session-123');
      });
    });

    it('handles reminder delivery failures gracefully', async () => {
      const user = userEvent.setup();
      mockEmailService.sendSessionReminder.mockRejectedValue(new Error('Email service down'));
      mockPushService.sendPushNotification.mockRejectedValue(new Error('Push service down'));

      renderWithProviders(<SessionReminderSystem />);

      const testButton = screen.getByTestId('test-reminders');
      await user.click(testButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Reminder Failed',
          description: 'Some reminders may not have been sent',
          variant: 'destructive',
        });
      });
    });
  });

  describe('Newsletter and Marketing Communications', () => {
    it('handles newsletter subscription flow', async () => {
      const NewsletterSubscription = () => {
        const [email, setEmail] = React.useState('');
        const [subscribed, setSubscribed] = React.useState(false);

        const handleSubscribe = async () => {
          try {
            await mockEmailService.subscribeToNewsletter(email, {
              source: 'website',
              interests: ['coaching-tips', 'product-updates'],
            });
            
            setSubscribed(true);
            mockToast({
              title: 'Subscribed Successfully',
              description: 'You will receive our weekly newsletter',
              variant: 'default',
            });
          } catch (error) {
            mockToast({
              title: 'Subscription Failed',
              description: 'Please try again later',
              variant: 'destructive',
            });
          }
        };

        const handleUnsubscribe = async () => {
          try {
            await mockEmailService.unsubscribeFromNewsletter(email);
            setSubscribed(false);
            
            mockToast({
              title: 'Unsubscribed',
              description: 'You have been removed from our newsletter',
              variant: 'default',
            });
          } catch (error) {
            mockToast({
              title: 'Unsubscribe Failed',
              description: 'Please try again later',
              variant: 'destructive',
            });
          }
        };

        return (
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              data-testid="newsletter-email-input"
            />
            
            {!subscribed ? (
              <button onClick={handleSubscribe} data-testid="subscribe-button">
                Subscribe to Newsletter
              </button>
            ) : (
              <div>
                <p data-testid="subscribed-message">You are subscribed!</p>
                <button onClick={handleUnsubscribe} data-testid="unsubscribe-button">
                  Unsubscribe
                </button>
              </div>
            )}
          </div>
        );
      };

      mockEmailService.subscribeToNewsletter.mockResolvedValue({ subscribed: true, id: 'sub-123' });
      mockEmailService.unsubscribeFromNewsletter.mockResolvedValue({ unsubscribed: true });

      const user = userEvent.setup();
      renderWithProviders(<NewsletterSubscription />);

      const emailInput = screen.getByTestId('newsletter-email-input');
      await user.type(emailInput, 'test@example.com');

      const subscribeButton = screen.getByTestId('subscribe-button');
      await user.click(subscribeButton);

      await waitFor(() => {
        expect(mockEmailService.subscribeToNewsletter).toHaveBeenCalledWith(
          'test@example.com',
          expect.objectContaining({
            source: 'website',
            interests: ['coaching-tips', 'product-updates'],
          })
        );
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Subscribed Successfully',
        description: 'You will receive our weekly newsletter',
        variant: 'default',
      });

      // Test unsubscribe
      await waitFor(() => {
        expect(screen.getByTestId('subscribed-message')).toBeInTheDocument();
      });

      const unsubscribeButton = screen.getByTestId('unsubscribe-button');
      await user.click(unsubscribeButton);

      await waitFor(() => {
        expect(mockEmailService.unsubscribeFromNewsletter).toHaveBeenCalledWith('test@example.com');
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Unsubscribed',
        description: 'You have been removed from our newsletter',
        variant: 'default',
      });
    });
  });

  describe('Communication Delivery Tracking', () => {
    it('tracks email delivery status and bounces', async () => {
      const DeliveryTracker = () => {
        const [deliveryStatus, setDeliveryStatus] = React.useState<Record<string, string>>({});

        const sendTrackedEmail = async () => {
          try {
            const result = await mockEmailService.sendNotificationEmail(mockUser.id, {
              subject: 'Test Email',
              message: 'This is a test email',
              trackDelivery: true,
            });

            setDeliveryStatus({
              [result.messageId]: 'sent',
            });
          } catch (error) {
            // Handle error
          }
        };

        // Simulate webhook status updates
        React.useEffect(() => {
          const handleWebhook = (event: any) => {
            setDeliveryStatus(prev => ({
              ...prev,
              [event.messageId]: event.status,
            }));
          };

          // Mock webhook listener
          window.addEventListener('email-status-update', handleWebhook);
          return () => window.removeEventListener('email-status-update', handleWebhook);
        }, []);

        return (
          <div>
            <button onClick={sendTrackedEmail} data-testid="send-tracked-email">
              Send Tracked Email
            </button>
            <div data-testid="delivery-status">
              {Object.entries(deliveryStatus).map(([messageId, status]) => (
                <div key={messageId}>
                  Message {messageId}: {status}
                </div>
              ))}
            </div>
          </div>
        );
      };

      mockEmailService.sendNotificationEmail.mockResolvedValue({
        sent: true,
        messageId: 'msg-456',
      });

      const user = userEvent.setup();
      renderWithProviders(<DeliveryTracker />);

      const sendButton = screen.getByTestId('send-tracked-email');
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByTestId('delivery-status')).toHaveTextContent('Message msg-456: sent');
      });

      // Simulate webhook status update
      const statusUpdateEvent = new CustomEvent('email-status-update', {
        detail: { messageId: 'msg-456', status: 'delivered' },
      });
      window.dispatchEvent(statusUpdateEvent);

      await waitFor(() => {
        expect(screen.getByTestId('delivery-status')).toHaveTextContent('Message msg-456: delivered');
      });
    });
  });
});