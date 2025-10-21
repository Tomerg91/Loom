import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { MfaChallengeForm } from '@/components/auth/mfa-challenge-form';
import { MfaSetupWizard } from '@/components/auth/mfa-setup-wizard';
import { RouteGuard } from '@/components/auth/route-guard';
import { renderWithProviders, mockUser, mockSupabaseClient, mockFetch, setupTestEnvironment } from '@/test/utils';

// Mock Next.js navigation
const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockBack = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
  }),
  usePathname: () => '/auth/mfa-setup',
}));

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient,
}));

// Mock QR code generation
vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,mock-qr-code'),
  },
}));

// Mock crypto for backup codes
const mockGenerateBackupCodes = vi.fn().mockReturnValue([
  'ABC123DEF456',
  'GHI789JKL012',
  'MNO345PQR678',
  'STU901VWX234',
  'YZA567BCD890',
]);

vi.mock('@/lib/security/backup-codes', () => ({
  generateBackupCodes: mockGenerateBackupCodes,
}));

// Mock authenticator library
vi.mock('otplib', () => ({
  authenticator: {
    generate: vi.fn().mockReturnValue('123456'),
    verify: vi.fn().mockReturnValue(true),
    generateSecret: vi.fn().mockReturnValue('MOCK_SECRET_KEY'),
    keyuri: vi.fn().mockReturnValue('otpauth://totp/LoomApp:test@example.com?secret=MOCK_SECRET_KEY&issuer=LoomApp'),
  },
}));

// Mock user store with MFA states
const mockSetUser = vi.fn();
const mockClearUser = vi.fn();

vi.mock('@/lib/store/auth-store', () => ({
  useUser: vi.fn(),
  useAuthStore: () => ({
    setUser: mockSetUser,
    clearUser: mockClearUser,
  }),
}));

// Mock toast notifications
const mockToast = vi.fn();
vi.mock('@/lib/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

describe('MFA Complete Workflow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupTestEnvironment();
    
    // Default successful API responses
    mockFetch({
      success: true,
      data: { mfaEnabled: false, backupCodes: [] },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('MFA Setup Flow', () => {
    it('completes full MFA setup workflow successfully', async () => {
      const userWithoutMFA = { ...mockUser, mfaEnabled: false };
      
      // Mock successful MFA setup API calls
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'user_mfa') {
          return {
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { secret: 'MOCK_SECRET_KEY', enabled: false },
              error: null,
            }),
          };
        }
        return mockSupabaseClient.from();
      });

      renderWithProviders(<MfaSetupWizard user={userWithoutMFA} />);

      // Step 1: Introduction and consent
      expect(screen.getByText(/multi-factor authentication/i)).toBeInTheDocument();
      expect(screen.getByText(/add an extra layer/i)).toBeInTheDocument();
      
      const startSetupButton = screen.getByRole('button', { name: /start setup/i });
      fireEvent.click(startSetupButton);

      // Step 2: QR Code display and app instructions
      await waitFor(() => {
        expect(screen.getByText(/scan the qr code/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/download an authenticator app/i)).toBeInTheDocument();
      expect(screen.getByAltText(/qr code/i)).toBeInTheDocument();
      
      // Should also show manual entry option
      const showManualButton = screen.getByRole('button', { name: /can't scan/i });
      fireEvent.click(showManualButton);
      
      await waitFor(() => {
        expect(screen.getByText(/MOCK_SECRET_KEY/)).toBeInTheDocument();
      });

      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);

      // Step 3: Verify setup with test code
      await waitFor(() => {
        expect(screen.getByText(/enter verification code/i)).toBeInTheDocument();
      });

      const codeInput = screen.getByLabelText(/verification code/i);
      fireEvent.change(codeInput, { target: { value: '123456' } });

      const verifyButton = screen.getByRole('button', { name: /verify/i });
      fireEvent.click(verifyButton);

      // Step 4: Backup codes generation and display
      await waitFor(() => {
        expect(screen.getByText(/backup codes/i)).toBeInTheDocument();
      });

      expect(screen.getByText('ABC123DEF456')).toBeInTheDocument();
      expect(screen.getByText('GHI789JKL012')).toBeInTheDocument();
      
      // Download backup codes
      const downloadButton = screen.getByRole('button', { name: /download/i });
      fireEvent.click(downloadButton);

      // Confirm codes are saved
      const confirmCheckbox = screen.getByRole('checkbox', { name: /saved my backup codes/i });
      fireEvent.click(confirmCheckbox);

      const finishButton = screen.getByRole('button', { name: /finish setup/i });
      fireEvent.click(finishButton);

      // Step 5: Success confirmation
      await waitFor(() => {
        expect(screen.getByText(/mfa enabled successfully/i)).toBeInTheDocument();
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'MFA Enabled',
        description: 'Two-factor authentication has been successfully enabled.',
        variant: 'default',
      });

      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });

    it('handles MFA setup errors gracefully', async () => {
      const userWithoutMFA = { ...mockUser, mfaEnabled: false };
      
      // Mock API error during setup
      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Failed to setup MFA' },
        }),
      }));

      renderWithProviders(<MfaSetupWizard user={userWithoutMFA} />);

      const startSetupButton = screen.getByRole('button', { name: /start setup/i });
      fireEvent.click(startSetupButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to setup mfa/i)).toBeInTheDocument();
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Setup Failed',
        description: 'Failed to setup MFA',
        variant: 'destructive',
      });
    });

    it('allows user to cancel setup process', async () => {
      const userWithoutMFA = { ...mockUser, mfaEnabled: false };

      renderWithProviders(<MfaSetupWizard user={userWithoutMFA} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('MFA Challenge Flow', () => {
    it('completes MFA challenge with authenticator code', async () => {
      const userWithMFA = { ...mockUser, mfaEnabled: true };

      // Mock successful verification
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: { verified: true },
        }),
      });

      renderWithProviders(<MfaChallengeForm />);

      expect(screen.getByText(/enter your authentication code/i)).toBeInTheDocument();

      const codeInput = screen.getByLabelText(/authentication code/i);
      fireEvent.change(codeInput, { target: { value: '123456' } });

      const verifyButton = screen.getByRole('button', { name: /verify/i });
      fireEvent.click(verifyButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/mfa/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: '123456', type: 'totp' }),
        });
      });

      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });

    it('completes MFA challenge with backup code', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: { verified: true, backupCodeUsed: true },
        }),
      });

      renderWithProviders(<MfaChallengeForm />);

      // Switch to backup code option
      const useBackupButton = screen.getByRole('button', { name: /use backup code/i });
      fireEvent.click(useBackupButton);

      await waitFor(() => {
        expect(screen.getByText(/enter a backup code/i)).toBeInTheDocument();
      });

      const backupCodeInput = screen.getByLabelText(/backup code/i);
      fireEvent.change(backupCodeInput, { target: { value: 'ABC123DEF456' } });

      const verifyButton = screen.getByRole('button', { name: /verify/i });
      fireEvent.click(verifyButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/mfa/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: 'ABC123DEF456', type: 'backup' }),
        });
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Backup Code Used',
        description: 'One of your backup codes has been used. Consider generating new ones.',
        variant: 'warning',
      });

      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });

    it('handles invalid MFA codes', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({
          success: false,
          error: 'Invalid authentication code',
        }),
      });

      renderWithProviders(<MfaChallengeForm />);

      const codeInput = screen.getByLabelText(/authentication code/i);
      fireEvent.change(codeInput, { target: { value: '000000' } });

      const verifyButton = screen.getByRole('button', { name: /verify/i });
      fireEvent.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid authentication code/i)).toBeInTheDocument();
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('handles MFA challenge timeout', async () => {
      vi.useFakeTimers();

      renderWithProviders(<MfaChallengeForm />);

      // Fast forward to timeout (assuming 5 minute timeout)
      vi.advanceTimersByTime(5 * 60 * 1000);

      await waitFor(() => {
        expect(screen.getByText(/session timeout/i)).toBeInTheDocument();
      });

      expect(mockPush).toHaveBeenCalledWith('/auth/signin');

      vi.useRealTimers();
    });
  });

  describe('MFA Recovery Flow', () => {
    it('completes account recovery when MFA device is lost', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            success: true,
            data: { recoveryEmailSent: true },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            success: true,
            data: { mfaDisabled: true },
          }),
        });

      renderWithProviders(<MfaChallengeForm />);

      // Initiate recovery process
      const lostDeviceButton = screen.getByRole('button', { name: /lost your device/i });
      fireEvent.click(lostDeviceButton);

      await waitFor(() => {
        expect(screen.getByText(/account recovery/i)).toBeInTheDocument();
      });

      // Confirm recovery email
      const sendRecoveryButton = screen.getByRole('button', { name: /send recovery email/i });
      fireEvent.click(sendRecoveryButton);

      await waitFor(() => {
        expect(screen.getByText(/recovery email sent/i)).toBeInTheDocument();
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/auth/mfa/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: mockUser.email }),
      });

      // Simulate clicking recovery link (would normally be in email)
      const mockRecoveryToken = 'recovery-token-123';
      
      // Mock the recovery verification
      const recoveryTokenInput = screen.getByLabelText(/recovery token/i);
      fireEvent.change(recoveryTokenInput, { target: { value: mockRecoveryToken } });

      const confirmRecoveryButton = screen.getByRole('button', { name: /confirm recovery/i });
      fireEvent.click(confirmRecoveryButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/mfa/recover/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: mockRecoveryToken }),
        });
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'MFA Disabled',
        description: 'Two-factor authentication has been disabled. Please set it up again for security.',
        variant: 'warning',
      });

      expect(mockPush).toHaveBeenCalledWith('/auth/mfa-setup');
    });
  });

  describe('Cross-Device MFA Verification', () => {
    it('handles MFA verification across different devices', async () => {
      // Mock session storage for device tracking
      const mockDeviceId = 'device-abc-123';
      Object.defineProperty(window, 'sessionStorage', {
        value: {
          getItem: vi.fn().mockReturnValue(mockDeviceId),
          setItem: vi.fn(),
        },
        writable: true,
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: { 
            verified: true,
            deviceId: mockDeviceId,
            trustDevice: false,
          },
        }),
      });

      renderWithProviders(<MfaChallengeForm />);

      const codeInput = screen.getByLabelText(/authentication code/i);
      fireEvent.change(codeInput, { target: { value: '123456' } });

      // Option to trust device
      const trustDeviceCheckbox = screen.getByRole('checkbox', { name: /trust this device/i });
      fireEvent.click(trustDeviceCheckbox);

      const verifyButton = screen.getByRole('button', { name: /verify/i });
      fireEvent.click(verifyButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/mfa/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            code: '123456', 
            type: 'totp',
            deviceId: mockDeviceId,
            trustDevice: true,
          }),
        });
      });
    });
  });

  describe('MFA Enforcement Policies', () => {
    const ProtectedComponent = () => <div>Admin Panel</div>;

    it('enforces MFA for admin users', async () => {
      const adminUserWithoutMFA = { 
        ...mockUser, 
        role: 'admin' as const, 
        mfaEnabled: false 
      };

      vi.mocked(require('@/lib/store/auth-store').useUser).mockReturnValue(adminUserWithoutMFA);

      renderWithProviders(
        <RouteGuard requireRole="admin" enforceMFA={true}>
          <ProtectedComponent />
        </RouteGuard>
      );

      expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
      expect(mockReplace).toHaveBeenCalledWith('/auth/mfa-setup');
    });

    it('allows access for admin users with MFA enabled', async () => {
      const adminUserWithMFA = { 
        ...mockUser, 
        role: 'admin' as const, 
        mfaEnabled: true 
      };

      vi.mocked(require('@/lib/store/auth-store').useUser).mockReturnValue(adminUserWithMFA);

      renderWithProviders(
        <RouteGuard requireRole="admin" enforceMFA={true}>
          <ProtectedComponent />
        </RouteGuard>
      );

      expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    });

    it('does not enforce MFA for regular users', async () => {
      const clientUserWithoutMFA = { 
        ...mockUser, 
        role: 'client' as const, 
        mfaEnabled: false 
      };

      vi.mocked(require('@/lib/store/auth-store').useUser).mockReturnValue(clientUserWithoutMFA);

      renderWithProviders(
        <RouteGuard requireRole="client">
          <ProtectedComponent />
        </RouteGuard>
      );

      expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    });
  });

  describe('MFA Backup Code Management', () => {
    it('allows regenerating backup codes', async () => {
      const userWithMFA = { ...mockUser, mfaEnabled: true };
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: { 
            backupCodes: [
              'NEW123ABC456',
              'DEF789GHI012',
              'JKL345MNO678',
              'PQR901STU234',
              'VWX567YZA890',
            ]
          },
        }),
      });

      // This would be in a settings/security page component
      const BackupCodeManager = () => {
        const handleRegenerate = async () => {
          await fetch('/api/auth/mfa/backup-codes/regenerate', {
            method: 'POST',
          });
        };

        return (
          <div>
            <h2>Backup Code Management</h2>
            <button onClick={handleRegenerate}>Regenerate Codes</button>
          </div>
        );
      };

      renderWithProviders(<BackupCodeManager />);

      const regenerateButton = screen.getByRole('button', { name: /regenerate codes/i });
      fireEvent.click(regenerateButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/mfa/backup-codes/regenerate', {
          method: 'POST',
        });
      });
    });
  });
});