import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SigninForm } from '@/components/auth/signin-form';

const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockSignIn = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const messages: Record<string, string> = {
      'auth.signin.title': 'Sign in',
      'auth.signin.description': 'Access your account',
      'auth.signin.button': 'Sign in',
      'auth.signin.loading': 'Signing in…',
      'auth.signin.rememberMe': 'Keep me signed in',
      'auth.signin.validation.emailRequired': 'Email is required',
      'auth.signin.validation.invalidEmail': 'Enter a valid email address',
      'auth.signin.validation.passwordRequired': 'Password is required',
      'auth.email': 'Email',
      'auth.emailPlaceholder': 'you@example.com',
      'auth.password': 'Password',
      'auth.passwordPlaceholder': 'Your password',
      'auth.forgotPassword': 'Forgot password?',
      'auth.noAccount': "Don't have an account?",
      'auth.signup.link': 'Sign up',
    };
    return messages[`auth.${key}`] ?? key;
  },
  useLocale: () => 'en',
}));

vi.mock('@/i18n/routing', () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/lib/utils/redirect', () => ({
  resolveRedirect: (_locale: string, redirectTo?: string) =>
    redirectTo ?? '/dashboard',
  resolveAuthPath: (_locale: string, path: string) => `/en${path}`,
}));

vi.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => ({
    signIn: mockSignIn,
  }),
}));

describe('SigninForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignIn.mockResolvedValue({
      user: { id: 'user-1', mfaEnabled: false },
      error: null,
    });
  });

  it('renders the signin form fields', () => {
    render(<SigninForm />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/keep me signed in/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /sign in/i })
    ).toBeInTheDocument();
  });

  it('submits credentials without remember me by default', async () => {
    render(<SigninForm />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'Password1!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith(
        'user@example.com',
        'Password1!',
        false
      );
    });

    expect(mockPush).toHaveBeenCalledWith('/dashboard');
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('shows validation messages when fields are empty', async () => {
    render(<SigninForm />);

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });

    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('passes remember me when the checkbox is selected', async () => {
    render(<SigninForm redirectTo="/reports" />);

    fireEvent.click(screen.getByLabelText(/keep me signed in/i));
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'remember@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'Password1!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith(
        'remember@example.com',
        'Password1!',
        true
      );
    });

    expect(mockPush).toHaveBeenCalledWith('/reports');
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('navigates to MFA verification when required', async () => {
    mockSignIn.mockResolvedValueOnce({
      user: { id: 'user-123', mfaEnabled: true },
      error: null,
    });

    render(<SigninForm redirectTo="/dashboard" />);

    fireEvent.click(screen.getByLabelText(/keep me signed in/i));
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'mfa@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'Password1!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith(
        'mfa@example.com',
        'Password1!',
        true
      );
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        '/en/auth/mfa-verify?userId=user-123&redirectTo=%2Fdashboard&rememberMe=1'
      );
    });
  });
});
