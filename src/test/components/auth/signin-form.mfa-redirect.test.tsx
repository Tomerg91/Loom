import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SigninForm } from '@/components/auth/signin-form';

const mockPush = vi.fn();
const mockSignIn = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    signIn: mockSignIn,
    signUp: vi.fn(),
    signOut: vi.fn(),
    updateProfile: vi.fn(),
  }),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, asChild: _asChild, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock('@/i18n/routing', () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
  routing: {
    locales: ['en', 'he'],
    defaultLocale: 'he',
  },
}));

describe('SigninForm MFA redirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignIn.mockResolvedValue({
      user: {
        id: 'user-123',
        email: 'test@example.com',
        mfaEnabled: true,
      } as any,
      error: null,
    });
  });

  it('includes the userId when redirecting to the MFA verification screen', async () => {
    render(<SigninForm redirectTo="/dashboard" />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'Password1!' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'Password1!');
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/en/auth/mfa-verify?userId=user-123&redirectTo=%2Fen%2Fdashboard');
    });
  });
});
