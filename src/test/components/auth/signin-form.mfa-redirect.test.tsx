import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

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
      'auth.signin.rememberMe': 'Keep me signed in',
      'auth.signin.validation.emailRequired': 'Email is required',
      'auth.signin.validation.invalidEmail': 'Enter a valid email address',
      'auth.signin.validation.passwordRequired': 'Password is required',
      'auth.email': 'Email',
      'auth.password': 'Password',
      'auth.forgotPassword': 'Forgot password?',
      'auth.noAccount': "Don't have an account?",
      'auth.signup.link': 'Sign up',
    };
    return messages[`auth.${key}`] ?? key;
  },
  useLocale: () => 'en',
}));

vi.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => ({
    signIn: mockSignIn,
  }),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    asChild: _asChild,
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement> & {
    children: ReactNode;
    asChild?: unknown;
  }) => <button {...props}>{children}</button>,
}));

vi.mock('@/i18n/routing', () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
  routing: {
    locales: ['en', 'he'],
    defaultLocale: 'en',
  },
}));

vi.mock('@/lib/utils/redirect', () => ({
  resolveRedirect: (_locale: string, redirectTo?: string) =>
    redirectTo ?? '/dashboard',
  resolveAuthPath: (_locale: string, path: string) => `/en${path}`,
}));

describe('SigninForm MFA redirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignIn.mockResolvedValue({
      user: {
        id: 'user-123',
        email: 'test@example.com',
        mfaEnabled: true,
      },
      error: null,
    });
  });

  it('includes the userId and remember me state when redirecting to MFA', async () => {
    render(<SigninForm redirectTo="/dashboard" />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'Password1!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith(
        'test@example.com',
        'Password1!',
        false
      );
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        '/en/auth/mfa-verify?userId=user-123&redirectTo=%2Fdashboard&rememberMe=0'
      );
    });
    expect(mockRefresh).toHaveBeenCalled();
  });
});
