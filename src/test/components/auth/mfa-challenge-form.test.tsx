import { screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import { MfaChallengeFormProps} from '@/components/auth/mfa/mfa-challenge-form';
import { renderWithProviders } from '@/test/utils';

// Mock MFA verification input component
vi.mock('@/components/auth/mfa/mfa-verification-input', () => ({
  MfaVerificationInput: ({ 
    value, 
    onChange, 
    onSubmit, 
    error, 
    disabled, 
    autoFocus, 
    length = 6, 
    label, 
    placeholder,
    className 
  }: unknown) => (
    <div data-testid="mfa-verification-input" className={className}>
      {label && <label>{label}</label>}
      <input
        data-testid="verification-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
        disabled={disabled}
        autoFocus={autoFocus}
        maxLength={length}
        placeholder={placeholder}
      />
      {error && <div data-testid="verification-error">{error}</div>}
    </div>
  ),
}));

describe('MfaChallengeForm', () => {
  const defaultProps: MfaChallengeFormProps = {
    onVerify: vi.fn().mockResolvedValue(undefined),
    onCancel: vi.fn(),
    onUseBackupCode: vi.fn(),
    isLoading: false,
    error: null,
    allowTrustDevice: true,
    canUseBackupCode: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial Rendering', () => {
    it('renders the challenge form with TOTP mode by default', () => {
      renderWithProviders(<MfaChallengeForm {...defaultProps} />);
      
      expect(screen.getByText(/challenge.title/i)).toBeInTheDocument();
      expect(screen.getByText(/challenge.description/i)).toBeInTheDocument();
      expect(screen.getByTestId('verification-input')).toBeInTheDocument();
    });

    it('displays security shield icon', () => {
      renderWithProviders(<MfaChallengeForm {...defaultProps} />);
      
      const shieldIcon = document.querySelector('[data-lucide="shield"]');
      expect(shieldIcon).toBeInTheDocument();
    });

    it('shows mode toggle buttons when backup codes are allowed', () => {
      renderWithProviders(<MfaChallengeForm {...defaultProps} />);
      
      expect(screen.getByText(/challenge.authenticatorApp/i)).toBeInTheDocument();
      expect(screen.getByText(/challenge.backupCode/i)).toBeInTheDocument();
    });

    it('hides mode toggle when backup codes are not allowed', () => {
      renderWithProviders(
        <MfaChallengeForm {...defaultProps} canUseBackupCode={false} />
      );
      
      expect(screen.queryByText(/challenge.backupCode/i)).not.toBeInTheDocument();
    });

    it('auto-focuses the verification input', () => {
      renderWithProviders(<MfaChallengeForm {...defaultProps} />);
      
      const input = screen.getByTestId('verification-input');
      expect(input).toHaveFocus();
    });
  });

  describe('TOTP Mode', () => {
    beforeEach(() => {
      renderWithProviders(<MfaChallengeForm {...defaultProps} />);
    });

    it('shows correct description for TOTP mode', () => {
      expect(screen.getByText(/challenge.description/i)).toBeInTheDocument();
    });

    it('displays TOTP input with correct length', () => {
      const input = screen.getByTestId('verification-input');
      expect(input).toHaveAttribute('maxLength', '6');
    });

    it('enables verify button only with 6-digit code', async () => {
      const user = userEvent.setup();
      const input = screen.getByTestId('verification-input');
      const verifyButton = screen.getByText(/challenge.verify/i);
      
      expect(verifyButton).toBeDisabled();
      
      await user.type(input, '12345');
      expect(verifyButton).toBeDisabled();
      
      await user.type(input, '6');
      expect(verifyButton).toBeEnabled();
    });

    it('calls onVerify with correct data for TOTP', async () => {
      const user = userEvent.setup();
      const input = screen.getByTestId('verification-input');
      
      await user.type(input, '123456');
      await user.click(screen.getByText(/challenge.verify/i));
      
      expect(defaultProps.onVerify).toHaveBeenCalledWith({
        code: '123456',
        trustDevice: false,
        type: 'totp',
      });
    });

    it('submits on Enter key', async () => {
      const user = userEvent.setup();
      const input = screen.getByTestId('verification-input');
      
      await user.type(input, '123456');
      await user.keyboard('{Enter}');
      
      expect(defaultProps.onVerify).toHaveBeenCalledWith({
        code: '123456',
        trustDevice: false,
        type: 'totp',
      });
    });

    it('shows TOTP troubleshooting tips', () => {
      expect(screen.getByText(/challenge.troubleshoot.title/i)).toBeInTheDocument();
      expect(screen.getByText(/challenge.troubleshoot.tip1/i)).toBeInTheDocument();
      expect(screen.getByText(/challenge.troubleshoot.tip2/i)).toBeInTheDocument();
      expect(screen.getByText(/challenge.troubleshoot.tip3/i)).toBeInTheDocument();
    });
  });

  describe('Backup Code Mode', () => {
    beforeEach(async () => {
      renderWithProviders(<MfaChallengeForm {...defaultProps} />);
      
      const user = userEvent.setup();
      await user.click(screen.getByText(/challenge.backupCode/i));
    });

    it('switches to backup code mode', async () => {
      expect(screen.getByText(/challenge.backupDescription/i)).toBeInTheDocument();
      expect(screen.getByText(/challenge.backupLabel/i)).toBeInTheDocument();
    });

    it('displays backup code input with correct length', () => {
      const input = screen.getByTestId('verification-input');
      expect(input).toHaveAttribute('maxLength', '8');
      expect(input).toHaveAttribute('placeholder', '••••••••');
    });

    it('shows backup code help text', () => {
      expect(screen.getByText(/challenge.backupHelp/i)).toBeInTheDocument();
    });

    it('enables verify button only with 8-character code', async () => {
      const user = userEvent.setup();
      const input = screen.getByTestId('verification-input');
      const verifyButton = screen.getByText(/challenge.verify/i);
      
      expect(verifyButton).toBeDisabled();
      
      await user.type(input, '1234567');
      expect(verifyButton).toBeDisabled();
      
      await user.type(input, '8');
      expect(verifyButton).toBeEnabled();
    });

    it('calls onVerify with correct data for backup code', async () => {
      const user = userEvent.setup();
      const input = screen.getByTestId('verification-input');
      
      await user.type(input, '12345678');
      await user.click(screen.getByText(/challenge.verify/i));
      
      expect(defaultProps.onVerify).toHaveBeenCalledWith({
        code: '12345678',
        trustDevice: false,
        type: 'backup',
      });
    });

    it('provides switch back to authenticator option', () => {
      expect(screen.getByText(/challenge.useAuthenticator/i)).toBeInTheDocument();
    });

    it('switches back to TOTP mode', async () => {
      const user = userEvent.setup();
      await user.click(screen.getByText(/challenge.useAuthenticator/i));
      
      expect(screen.getByText(/challenge.description/i)).toBeInTheDocument();
      expect(screen.getByText(/challenge.totpLabel/i)).toBeInTheDocument();
    });
  });

  describe('Mode Switching', () => {
    beforeEach(() => {
      renderWithProviders(<MfaChallengeForm {...defaultProps} />);
    });

    it('highlights active mode button', async () => {
      const user = userEvent.setup();
      const totpButton = screen.getByText(/challenge.authenticatorApp/i).closest('button');
      const backupButton = screen.getByText(/challenge.backupCode/i).closest('button');
      
      // TOTP mode should be active by default
      expect(totpButton).toHaveClass('border-input');
      
      // Switch to backup code mode
      await user.click(backupButton!);
      expect(backupButton).toHaveClass('border-input');
    });

    it('clears input when switching modes', async () => {
      const user = userEvent.setup();
      const input = screen.getByTestId('verification-input');
      
      // Enter code in TOTP mode
      await user.type(input, '123456');
      expect(input).toHaveValue('123456');
      
      // Switch to backup mode
      await user.click(screen.getByText(/challenge.backupCode/i));
      
      // Input should be cleared (different state variable)
      const newInput = screen.getByTestId('verification-input');
      expect(newInput).toHaveValue('');
    });

    it('preserves separate values for each mode', async () => {
      const user = userEvent.setup();
      const input = screen.getByTestId('verification-input');
      
      // Enter TOTP code
      await user.type(input, '123456');
      
      // Switch to backup mode and enter backup code
      await user.click(screen.getByText(/challenge.backupCode/i));
      const backupInput = screen.getByTestId('verification-input');
      await user.type(backupInput, '87654321');
      
      // Switch back to TOTP mode
      await user.click(screen.getByText(/challenge.authenticatorApp/i));
      const totpInput = screen.getByTestId('verification-input');
      
      // TOTP value should be preserved
      expect(totpInput).toHaveValue('123456');
    });
  });

  describe('Trust Device Feature', () => {
    it('shows trust device toggle when allowed', () => {
      renderWithProviders(<MfaChallengeForm {...defaultProps} />);
      
      expect(screen.getByText(/challenge.trustDevice/i)).toBeInTheDocument();
      expect(screen.getByText(/challenge.trustDeviceDescription/i)).toBeInTheDocument();
    });

    it('hides trust device toggle when not allowed', () => {
      renderWithProviders(
        <MfaChallengeForm {...defaultProps} allowTrustDevice={false} />
      );
      
      expect(screen.queryByText(/challenge.trustDevice/i)).not.toBeInTheDocument();
    });

    it('toggles trust device state', async () => {
      renderWithProviders(<MfaChallengeForm {...defaultProps} />);
      
      const user = userEvent.setup();
      const trustToggle = screen.getByRole('switch');
      
      expect(trustToggle).not.toBeChecked();
      
      await user.click(trustToggle);
      expect(trustToggle).toBeChecked();
      
      await user.click(trustToggle);
      expect(trustToggle).not.toBeChecked();
    });

    it('includes trust device in verification data', async () => {
      renderWithProviders(<MfaChallengeForm {...defaultProps} />);
      
      const user = userEvent.setup();
      const input = screen.getByTestId('verification-input');
      const trustToggle = screen.getByRole('switch');
      
      await user.click(trustToggle);
      await user.type(input, '123456');
      await user.click(screen.getByText(/challenge.verify/i));
      
      expect(defaultProps.onVerify).toHaveBeenCalledWith({
        code: '123456',
        trustDevice: true,
        type: 'totp',
      });
    });

    it('excludes trust device when not allowed', async () => {
      renderWithProviders(
        <MfaChallengeForm {...defaultProps} allowTrustDevice={false} />
      );
      
      const user = userEvent.setup();
      const input = screen.getByTestId('verification-input');
      
      await user.type(input, '123456');
      await user.click(screen.getByText(/challenge.verify/i));
      
      expect(defaultProps.onVerify).toHaveBeenCalledWith({
        code: '123456',
        trustDevice: undefined,
        type: 'totp',
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error messages', () => {
      const errorMessage = 'Invalid verification code';
      renderWithProviders(
        <MfaChallengeForm {...defaultProps} error={errorMessage} />
      );
      
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(document.querySelector('[data-lucide="alert-triangle"]')).toBeInTheDocument();
    });

    it('passes error to verification input', () => {
      const errorMessage = 'Invalid code';
      renderWithProviders(
        <MfaChallengeForm {...defaultProps} error={errorMessage} />
      );
      
      expect(screen.getByTestId('verification-error')).toHaveTextContent(errorMessage);
    });

    it('handles verification failures', async () => {
      const onVerify = vi.fn().mockRejectedValue(new Error('Verification failed'));
      renderWithProviders(
        <MfaChallengeForm {...defaultProps} onVerify={onVerify} />
      );
      
      const user = userEvent.setup();
      const input = screen.getByTestId('verification-input');
      
      await user.type(input, '123456');
      await user.click(screen.getByText(/challenge.verify/i));
      
      expect(onVerify).toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('shows loading state on verify button', () => {
      renderWithProviders(<MfaChallengeForm {...defaultProps} isLoading={true} />);
      
      const verifyButton = screen.getByText(/challenge.verifying/i);
      expect(verifyButton).toBeInTheDocument();
      expect(verifyButton).toBeDisabled();
      expect(document.querySelector('[data-lucide="loader-2"]')).toBeInTheDocument();
    });

    it('disables all interactive elements when loading', () => {
      renderWithProviders(<MfaChallengeForm {...defaultProps} isLoading={true} />);
      
      expect(screen.getByTestId('verification-input')).toBeDisabled();
      expect(screen.getByText(/challenge.verifying/i)).toBeDisabled();
      expect(screen.getByRole('switch')).toBeDisabled();
      expect(screen.getByText(/challenge.cancel/i)).toBeDisabled();
    });

    it('disables mode switching when loading', () => {
      renderWithProviders(<MfaChallengeForm {...defaultProps} isLoading={true} />);
      
      const totpButton = screen.getByText(/challenge.authenticatorApp/i).closest('button');
      const backupButton = screen.getByText(/challenge.backupCode/i).closest('button');
      
      expect(totpButton).toBeDisabled();
      expect(backupButton).toBeDisabled();
    });
  });

  describe('Cancel Functionality', () => {
    it('shows cancel button when onCancel is provided', () => {
      renderWithProviders(<MfaChallengeForm {...defaultProps} />);
      
      expect(screen.getByText(/challenge.cancel/i)).toBeInTheDocument();
    });

    it('hides cancel button when onCancel is not provided', () => {
      renderWithProviders(
        <MfaChallengeForm {...defaultProps} onCancel={undefined} />
      );
      
      expect(screen.queryByText(/challenge.cancel/i)).not.toBeInTheDocument();
    });

    it('calls onCancel when cancel button is clicked', async () => {
      renderWithProviders(<MfaChallengeForm {...defaultProps} />);
      
      const user = userEvent.setup();
      await user.click(screen.getByText(/challenge.cancel/i));
      
      expect(defaultProps.onCancel).toHaveBeenCalled();
    });
  });

  describe('Alternative Actions', () => {
    it('shows use backup code option in TOTP mode', () => {
      renderWithProviders(<MfaChallengeForm {...defaultProps} />);
      
      expect(screen.getByText(/challenge.useBackupCode/i)).toBeInTheDocument();
    });

    it('shows use authenticator option in backup code mode', async () => {
      renderWithProviders(<MfaChallengeForm {...defaultProps} />);
      
      const user = userEvent.setup();
      await user.click(screen.getByText(/challenge.backupCode/i));
      
      expect(screen.getByText(/challenge.useAuthenticator/i)).toBeInTheDocument();
    });

    it('hides backup code options when not allowed', () => {
      renderWithProviders(
        <MfaChallengeForm {...defaultProps} canUseBackupCode={false} />
      );
      
      expect(screen.queryByText(/challenge.useBackupCode/i)).not.toBeInTheDocument();
    });
  });

  describe('Help Text and Instructions', () => {
    it('shows mode-specific help text', () => {
      renderWithProviders(<MfaChallengeForm {...defaultProps} />);
      
      expect(screen.getByText(/challenge.totpHelp/i)).toBeInTheDocument();
    });

    it('updates help text when switching modes', async () => {
      renderWithProviders(<MfaChallengeForm {...defaultProps} />);
      
      const user = userEvent.setup();
      await user.click(screen.getByText(/challenge.backupCode/i));
      
      expect(screen.getByText(/challenge.backupCodeHelp/i)).toBeInTheDocument();
      expect(screen.queryByText(/challenge.totpHelp/i)).not.toBeInTheDocument();
    });

    it('provides contextual instructions', () => {
      renderWithProviders(<MfaChallengeForm {...defaultProps} />);
      
      expect(screen.getByText(/challenge.description/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      renderWithProviders(<MfaChallengeForm {...defaultProps} />);
      
      const trustToggle = screen.getByRole('switch');
      expect(trustToggle).toHaveAccessibleName(/challenge.trustDevice/i);
    });

    it('supports keyboard navigation', async () => {
      renderWithProviders(<MfaChallengeForm {...defaultProps} />);
      
      const user = userEvent.setup();
      
      // Tab through interactive elements
      await user.tab();
      expect(screen.getByText(/challenge.authenticatorApp/i).closest('button')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByText(/challenge.backupCode/i).closest('button')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByTestId('verification-input')).toHaveFocus();
    });

    it('provides proper error announcements', () => {
      const errorMessage = 'Invalid code';
      renderWithProviders(
        <MfaChallengeForm {...defaultProps} error={errorMessage} />
      );
      
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent(errorMessage);
    });

    it('has descriptive button text', () => {
      renderWithProviders(<MfaChallengeForm {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /challenge.verify/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /challenge.cancel/i })).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty code submission', async () => {
      renderWithProviders(<MfaChallengeForm {...defaultProps} />);
      
      const user = userEvent.setup();
      const verifyButton = screen.getByText(/challenge.verify/i);
      
      // Button should be disabled with empty code
      expect(verifyButton).toBeDisabled();
      
      // Clicking should not call onVerify
      await user.click(verifyButton);
      expect(defaultProps.onVerify).not.toHaveBeenCalled();
    });

    it('handles partial code input', async () => {
      renderWithProviders(<MfaChallengeForm {...defaultProps} />);
      
      const user = userEvent.setup();
      const input = screen.getByTestId('verification-input');
      const verifyButton = screen.getByText(/challenge.verify/i);
      
      await user.type(input, '123'); // Partial code
      expect(verifyButton).toBeDisabled();
    });

    it('handles maximum length inputs', async () => {
      renderWithProviders(<MfaChallengeForm {...defaultProps} />);
      
      const user = userEvent.setup();
      const input = screen.getByTestId('verification-input');
      
      await user.type(input, '1234567890'); // More than 6 characters
      expect(input).toHaveValue('123456'); // Should be truncated
    });

    it('maintains state consistency during rapid mode switches', async () => {
      renderWithProviders(<MfaChallengeForm {...defaultProps} />);
      
      const user = userEvent.setup();
      const totpButton = screen.getByText(/challenge.authenticatorApp/i);
      const backupButton = screen.getByText(/challenge.backupCode/i);
      
      // Rapidly switch modes
      await user.click(backupButton);
      await user.click(totpButton);
      await user.click(backupButton);
      await user.click(totpButton);
      
      // Should end up in TOTP mode
      expect(screen.getByText(/challenge.description/i)).toBeInTheDocument();
    });

    it('handles verification with trust device in backup mode', async () => {
      renderWithProviders(<MfaChallengeForm {...defaultProps} />);
      
      const user = userEvent.setup();
      
      // Switch to backup mode
      await user.click(screen.getByText(/challenge.backupCode/i));
      
      // Enable trust device
      await user.click(screen.getByRole('switch'));
      
      // Enter backup code
      const input = screen.getByTestId('verification-input');
      await user.type(input, '12345678');
      
      // Verify
      await user.click(screen.getByText(/challenge.verify/i));
      
      expect(defaultProps.onVerify).toHaveBeenCalledWith({
        code: '12345678',
        trustDevice: true,
        type: 'backup',
      });
    });
  });
});