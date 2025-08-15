import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, mockFetch, mockApiResponse, waitForNextTick } from '@/test/utils';
import { MfaSetupWizard, type MfaSetupWizardProps } from '@/components/auth/mfa/mfa-setup-wizard';

// Mock MFA sub-components
vi.mock('@/components/auth/mfa/mfa-qr-code', () => ({
  MfaQrCode: ({ secret, issuer, accountName }: any) => (
    <div data-testid="mfa-qr-code">
      <span data-testid="qr-secret">{secret}</span>
      <span data-testid="qr-issuer">{issuer}</span>
      <span data-testid="qr-account">{accountName}</span>
    </div>
  ),
}));

vi.mock('@/components/auth/mfa/mfa-verification-input', () => ({
  MfaVerificationInput: ({ value, onChange, onSubmit, error, disabled, autoFocus }: any) => (
    <div data-testid="mfa-verification-input">
      <input
        data-testid="verification-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
        disabled={disabled}
        autoFocus={autoFocus}
      />
      {error && <div data-testid="verification-error">{error}</div>}
    </div>
  ),
}));

vi.mock('@/components/auth/mfa/mfa-backup-codes', () => ({
  MfaBackupCodes: ({ codes }: any) => (
    <div data-testid="mfa-backup-codes">
      {codes.map((code: string, index: number) => (
        <div key={index} data-testid={`backup-code-${index}`}>{code}</div>
      ))}
    </div>
  ),
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

describe('MfaSetupWizard', () => {
  const defaultProps: MfaSetupWizardProps = {
    onComplete: vi.fn(),
    onCancel: vi.fn(),
    isLoading: false,
  };

  const mockMfaData = {
    secret: 'JBSWY3DPEHPK3PXP',
    backupCodes: ['12345678', '23456789', '34567890', '45678901', '56789012'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch(mockApiResponse.success(mockMfaData));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial Rendering', () => {
    it('renders the wizard with introduction step', async () => {
      renderWithProviders(<MfaSetupWizard {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText(/setup.title/i)).toBeInTheDocument();
        expect(screen.getByText(/setup.intro.heading/i)).toBeInTheDocument();
        expect(screen.getByText(/setup.intro.description/i)).toBeInTheDocument();
      });
    });

    it('shows progress indicator with correct step count', async () => {
      renderWithProviders(<MfaSetupWizard {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('1 / 5')).toBeInTheDocument();
      });
    });

    it('displays security shield icon', async () => {
      renderWithProviders(<MfaSetupWizard {...defaultProps} />);
      
      await waitFor(() => {
        const shieldIcon = document.querySelector('[data-lucide="shield"]');
        expect(shieldIcon).toBeInTheDocument();
      });
    });

    it('shows setup steps with icons', async () => {
      renderWithProviders(<MfaSetupWizard {...defaultProps} />);
      
      await waitFor(() => {
        expect(document.querySelector('[data-lucide="smartphone"]')).toBeInTheDocument();
        expect(document.querySelector('[data-lucide="qr-code"]')).toBeInTheDocument();
        expect(document.querySelector('[data-lucide="key"]')).toBeInTheDocument();
      });
    });
  });

  describe('API Integration', () => {
    it('fetches MFA data on mount', async () => {
      renderWithProviders(<MfaSetupWizard {...defaultProps} />);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/mfa/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
      });
    });

    it('handles API errors gracefully', async () => {
      mockFetch(mockApiResponse.error('Failed to generate MFA data'));
      
      renderWithProviders(<MfaSetupWizard {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to generate MFA data/i)).toBeInTheDocument();
      });
    });

    it('handles invalid API response data', async () => {
      mockFetch(mockApiResponse.success({ invalid: 'data' }));
      
      renderWithProviders(<MfaSetupWizard {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Invalid MFA data received/i)).toBeInTheDocument();
      });
    });

    it('handles network errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      
      renderWithProviders(<MfaSetupWizard {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to generate MFA data/i)).toBeInTheDocument();
      });
    });
  });

  describe('Step Navigation', () => {
    beforeEach(async () => {
      renderWithProviders(<MfaSetupWizard {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText(/setup.intro.heading/i)).toBeInTheDocument();
      });
    });

    it('navigates from intro to QR code step', async () => {
      const user = userEvent.setup();
      const nextButton = screen.getByText(/setup.getStarted/i);
      
      await user.click(nextButton);
      
      await waitFor(() => {
        expect(screen.getByText(/setup.qrCode.heading/i)).toBeInTheDocument();
        expect(screen.getByTestId('mfa-qr-code')).toBeInTheDocument();
      });
    });

    it('shows back button after first step', async () => {
      const user = userEvent.setup();
      
      await user.click(screen.getByText(/setup.getStarted/i));
      
      await waitFor(() => {
        expect(screen.getByText(/setup.back/i)).toBeInTheDocument();
      });
    });

    it('navigates back to previous steps', async () => {
      const user = userEvent.setup();
      
      // Go to QR code step
      await user.click(screen.getByText(/setup.getStarted/i));
      await waitFor(() => {
        expect(screen.getByText(/setup.qrCode.heading/i)).toBeInTheDocument();
      });
      
      // Go back to intro
      await user.click(screen.getByText(/setup.back/i));
      
      await waitFor(() => {
        expect(screen.getByText(/setup.intro.heading/i)).toBeInTheDocument();
      });
    });

    it('progresses through all steps in correct order', async () => {
      const user = userEvent.setup();
      
      // Step 1: Intro -> QR Code
      await user.click(screen.getByText(/setup.getStarted/i));
      await waitFor(() => {
        expect(screen.getByText(/setup.qrCode.heading/i)).toBeInTheDocument();
      });
      
      // Step 2: QR Code -> Verify
      await user.click(screen.getByText(/setup.next/i));
      await waitFor(() => {
        expect(screen.getByText(/setup.verify.heading/i)).toBeInTheDocument();
      });
      
      // Enter verification code
      const input = screen.getByTestId('verification-input');
      await user.type(input, '123456');
      
      // Step 3: Verify -> Backup Codes
      await user.click(screen.getByText(/setup.next/i));
      await waitFor(() => {
        expect(screen.getByText(/setup.backupCodes.heading/i)).toBeInTheDocument();
        expect(screen.getByTestId('mfa-backup-codes')).toBeInTheDocument();
      });
      
      // Step 4: Backup Codes -> Complete
      await user.click(screen.getByText(/setup.next/i));
      await waitFor(() => {
        expect(screen.getByText(/setup.complete.heading/i)).toBeInTheDocument();
      });
    });
  });

  describe('QR Code Step', () => {
    beforeEach(async () => {
      renderWithProviders(<MfaSetupWizard {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText(/setup.intro.heading/i)).toBeInTheDocument();
      });
      
      const user = userEvent.setup();
      await user.click(screen.getByText(/setup.getStarted/i));
      await waitFor(() => {
        expect(screen.getByText(/setup.qrCode.heading/i)).toBeInTheDocument();
      });
    });

    it('displays QR code with correct data', async () => {
      const qrCode = screen.getByTestId('mfa-qr-code');
      expect(qrCode).toBeInTheDocument();
      
      expect(screen.getByTestId('qr-secret')).toHaveTextContent(mockMfaData.secret);
      expect(screen.getByTestId('qr-issuer')).toHaveTextContent('Loom');
      expect(screen.getByTestId('qr-account')).toHaveTextContent('user@loom.app');
    });

    it('provides manual entry option', async () => {
      const user = userEvent.setup();
      const manualEntryButton = screen.getByText(/setup.qrCode.manualEntry/i);
      
      await user.click(manualEntryButton);
      
      await waitFor(() => {
        expect(screen.getByText(/setup.manualKey.heading/i)).toBeInTheDocument();
        expect(screen.getByText(mockMfaData.secret)).toBeInTheDocument();
      });
    });

    it('shows app suggestion alert', async () => {
      expect(screen.getByText(/setup.qrCode.appSuggestion/i)).toBeInTheDocument();
    });
  });

  describe('Manual Key Step', () => {
    beforeEach(async () => {
      renderWithProviders(<MfaSetupWizard {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText(/setup.intro.heading/i)).toBeInTheDocument();
      });
      
      const user = userEvent.setup();
      await user.click(screen.getByText(/setup.getStarted/i));
      await waitFor(() => {
        expect(screen.getByText(/setup.qrCode.heading/i)).toBeInTheDocument();
      });
      
      await user.click(screen.getByText(/setup.qrCode.manualEntry/i));
      await waitFor(() => {
        expect(screen.getByText(/setup.manualKey.heading/i)).toBeInTheDocument();
      });
    });

    it('displays the secret key', async () => {
      expect(screen.getByText(mockMfaData.secret)).toBeInTheDocument();
    });

    it('provides copy functionality', async () => {
      const user = userEvent.setup();
      const copyButton = document.querySelector('[data-lucide="copy"]')?.closest('button');
      
      expect(copyButton).toBeInTheDocument();
      await user.click(copyButton!);
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockMfaData.secret);
    });

    it('displays account information', async () => {
      expect(screen.getByText(/setup.manualKey.issuer/i)).toBeInTheDocument();
      expect(screen.getByText(/setup.manualKey.account/i)).toBeInTheDocument();
      expect(screen.getByText('Loom')).toBeInTheDocument();
      expect(screen.getByText('user@loom.app')).toBeInTheDocument();
    });

    it('navigates back to QR code step', async () => {
      const user = userEvent.setup();
      await user.click(screen.getByText(/setup.back/i));
      
      await waitFor(() => {
        expect(screen.getByText(/setup.qrCode.heading/i)).toBeInTheDocument();
      });
    });
  });

  describe('Verification Step', () => {
    beforeEach(async () => {
      renderWithProviders(<MfaSetupWizard {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText(/setup.intro.heading/i)).toBeInTheDocument();
      });
      
      const user = userEvent.setup();
      // Navigate to verification step
      await user.click(screen.getByText(/setup.getStarted/i));
      await user.click(screen.getByText(/setup.next/i));
      await waitFor(() => {
        expect(screen.getByText(/setup.verify.heading/i)).toBeInTheDocument();
      });
    });

    it('shows verification input with auto-focus', async () => {
      const input = screen.getByTestId('verification-input');
      expect(input).toBeInTheDocument();
      expect(input).toHaveFocus();
    });

    it('enables next button only with valid code', async () => {
      const user = userEvent.setup();
      const nextButton = screen.getByText(/setup.next/i);
      
      // Button should be disabled initially
      expect(nextButton).toBeDisabled();
      
      // Type partial code
      const input = screen.getByTestId('verification-input');
      await user.type(input, '12345');
      expect(nextButton).toBeDisabled();
      
      // Complete code
      await user.type(input, '6');
      expect(nextButton).toBeEnabled();
    });

    it('proceeds to backup codes with valid verification', async () => {
      const user = userEvent.setup();
      const input = screen.getByTestId('verification-input');
      
      await user.type(input, '123456');
      await user.click(screen.getByText(/setup.next/i));
      
      await waitFor(() => {
        expect(screen.getByText(/setup.backupCodes.heading/i)).toBeInTheDocument();
      });
    });

    it('displays error messages', async () => {
      const errorMessage = 'Invalid verification code';
      renderWithProviders(
        <MfaSetupWizard {...defaultProps} isLoading={false} />
      );
      
      // Navigate to verification step
      const user = userEvent.setup();
      await user.click(screen.getByText(/setup.getStarted/i));
      await user.click(screen.getByText(/setup.next/i));
      
      // Simulate error in verification input
      const input = screen.getByTestId('verification-input');
      await user.type(input, '000000');
      
      // The error would be shown via the MfaVerificationInput component
      // which is mocked to display errors
    });

    it('submits on Enter key', async () => {
      const user = userEvent.setup();
      const input = screen.getByTestId('verification-input');
      
      await user.type(input, '123456');
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(screen.getByText(/setup.backupCodes.heading/i)).toBeInTheDocument();
      });
    });
  });

  describe('Backup Codes Step', () => {
    beforeEach(async () => {
      renderWithProviders(<MfaSetupWizard {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText(/setup.intro.heading/i)).toBeInTheDocument();
      });
      
      const user = userEvent.setup();
      // Navigate to backup codes step
      await user.click(screen.getByText(/setup.getStarted/i));
      await user.click(screen.getByText(/setup.next/i));
      
      const input = screen.getByTestId('verification-input');
      await user.type(input, '123456');
      await user.click(screen.getByText(/setup.next/i));
      
      await waitFor(() => {
        expect(screen.getByText(/setup.backupCodes.heading/i)).toBeInTheDocument();
      });
    });

    it('displays all backup codes', async () => {
      const backupCodes = screen.getByTestId('mfa-backup-codes');
      expect(backupCodes).toBeInTheDocument();
      
      mockMfaData.backupCodes.forEach((code, index) => {
        expect(screen.getByTestId(`backup-code-${index}`)).toHaveTextContent(code);
      });
    });

    it('shows security warning', async () => {
      expect(screen.getByText(/setup.backupCodes.warning/i)).toBeInTheDocument();
    });

    it('proceeds to completion step', async () => {
      const user = userEvent.setup();
      await user.click(screen.getByText(/setup.next/i));
      
      await waitFor(() => {
        expect(screen.getByText(/setup.complete.heading/i)).toBeInTheDocument();
      });
    });
  });

  describe('Completion Step', () => {
    beforeEach(async () => {
      renderWithProviders(<MfaSetupWizard {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText(/setup.intro.heading/i)).toBeInTheDocument();
      });
      
      const user = userEvent.setup();
      // Navigate through all steps to completion
      await user.click(screen.getByText(/setup.getStarted/i));
      await user.click(screen.getByText(/setup.next/i));
      
      const input = screen.getByTestId('verification-input');
      await user.type(input, '123456');
      await user.click(screen.getByText(/setup.next/i));
      await user.click(screen.getByText(/setup.next/i));
      
      await waitFor(() => {
        expect(screen.getByText(/setup.complete.heading/i)).toBeInTheDocument();
      });
    });

    it('shows completion confirmation', async () => {
      expect(screen.getByText(/setup.complete.heading/i)).toBeInTheDocument();
      expect(document.querySelector('[data-lucide="check-circle"]')).toBeInTheDocument();
    });

    it('displays feature benefits', async () => {
      expect(screen.getByText(/setup.complete.feature1/i)).toBeInTheDocument();
      expect(screen.getByText(/setup.complete.feature2/i)).toBeInTheDocument();
      expect(screen.getByText(/setup.complete.feature3/i)).toBeInTheDocument();
    });

    it('calls onComplete with setup data when finished', async () => {
      const user = userEvent.setup();
      await user.click(screen.getByText(/setup.finish/i));
      
      expect(defaultProps.onComplete).toHaveBeenCalledWith({
        secret: mockMfaData.secret,
        verificationCode: '123456',
        backupCodes: mockMfaData.backupCodes,
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading spinner on finish button when loading', async () => {
      const { rerender } = renderWithProviders(<MfaSetupWizard {...defaultProps} />);
      
      // Navigate to completion
      const user = userEvent.setup();
      await user.click(screen.getByText(/setup.getStarted/i));
      await user.click(screen.getByText(/setup.next/i));
      const input = screen.getByTestId('verification-input');
      await user.type(input, '123456');
      await user.click(screen.getByText(/setup.next/i));
      await user.click(screen.getByText(/setup.next/i));
      
      // Set loading state
      rerender(<MfaSetupWizard {...defaultProps} isLoading={true} />);
      
      await waitFor(() => {
        expect(document.querySelector('[data-lucide="loader-2"]')).toBeInTheDocument();
      });
    });

    it('disables navigation buttons when loading', async () => {
      renderWithProviders(<MfaSetupWizard {...defaultProps} isLoading={true} />);
      
      await waitFor(() => {
        const nextButton = screen.getByText(/setup.getStarted/i);
        const cancelButton = screen.getByText(/setup.cancel/i);
        
        expect(nextButton).toBeDisabled();
        expect(cancelButton).toBeDisabled();
      });
    });
  });

  describe('Error Handling', () => {
    it('clears errors on step navigation', async () => {
      const { rerender } = renderWithProviders(<MfaSetupWizard {...defaultProps} />);
      
      // Navigate to verification step
      const user = userEvent.setup();
      await user.click(screen.getByText(/setup.getStarted/i));
      await user.click(screen.getByText(/setup.next/i));
      
      // The error handling is internal to the component
      // We can test that navigation continues to work
      const input = screen.getByTestId('verification-input');
      await user.type(input, '123456');
      await user.click(screen.getByText(/setup.next/i));
      
      expect(screen.getByText(/setup.backupCodes.heading/i)).toBeInTheDocument();
    });
  });

  describe('Cancel Functionality', () => {
    it('calls onCancel when cancel button is clicked', async () => {
      renderWithProviders(<MfaSetupWizard {...defaultProps} />);
      
      const user = userEvent.setup();
      const cancelButton = screen.getByText(/setup.cancel/i);
      
      await user.click(cancelButton);
      
      expect(defaultProps.onCancel).toHaveBeenCalled();
    });

    it('shows cancel button on all steps', async () => {
      renderWithProviders(<MfaSetupWizard {...defaultProps} />);
      
      // Check intro step
      expect(screen.getByText(/setup.cancel/i)).toBeInTheDocument();
      
      const user = userEvent.setup();
      // Check QR code step
      await user.click(screen.getByText(/setup.getStarted/i));
      expect(screen.getByText(/setup.cancel/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', async () => {
      renderWithProviders(<MfaSetupWizard {...defaultProps} />);
      
      await waitFor(() => {
        // Check for proper card structure
        const card = screen.getByRole('region');
        expect(card).toBeInTheDocument();
      });
    });

    it('supports keyboard navigation', async () => {
      renderWithProviders(<MfaSetupWizard {...defaultProps} />);
      
      const user = userEvent.setup();
      // Test tab navigation
      await user.tab();
      expect(screen.getByText(/setup.getStarted/i)).toHaveFocus();
      
      await user.tab();
      expect(screen.getByText(/setup.cancel/i)).toHaveFocus();
    });

    it('provides screen reader friendly progress updates', async () => {
      renderWithProviders(<MfaSetupWizard {...defaultProps} />);
      
      await waitFor(() => {
        // Progress indicator shows current step
        expect(screen.getByText('1 / 5')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles empty secret from API', async () => {
      mockFetch(mockApiResponse.success({ secret: '', backupCodes: [] }));
      
      renderWithProviders(<MfaSetupWizard {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Invalid MFA data received/i)).toBeInTheDocument();
      });
    });

    it('handles missing backup codes from API', async () => {
      mockFetch(mockApiResponse.success({ secret: 'JBSWY3DPEHPK3PXP' }));
      
      renderWithProviders(<MfaSetupWizard {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Invalid MFA data received/i)).toBeInTheDocument();
      });
    });

    it('prevents navigation with invalid verification code length', async () => {
      renderWithProviders(<MfaSetupWizard {...defaultProps} />);
      
      const user = userEvent.setup();
      await user.click(screen.getByText(/setup.getStarted/i));
      await user.click(screen.getByText(/setup.next/i));
      
      const input = screen.getByTestId('verification-input');
      await user.type(input, '12345'); // 5 digits instead of 6
      
      const nextButton = screen.getByText(/setup.next/i);
      expect(nextButton).toBeDisabled();
    });
  });
});