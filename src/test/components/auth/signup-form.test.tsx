import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SignupForm } from '@/components/auth/signup-form';

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
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
}));

const originalFetch = global.fetch;

describe('SignupForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    (window as any).fetch = originalFetch;
  });

  const fillRequiredFields = () => {
    fireEvent.change(screen.getByTestId('first-name-input'), { target: { value: 'Test' } });
    fireEvent.change(screen.getByTestId('last-name-input'), { target: { value: 'User' } });
    fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'new@example.com' } });
    fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'Tru3Str0ng!' } });
    fireEvent.change(screen.getByTestId('confirm-password-input'), { target: { value: 'Tru3Str0ng!' } });
    fireEvent.click(screen.getByTestId('terms-checkbox'));
  };

  it('shows a check your email confirmation when verification is required', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          sessionActive: false,
          user: { email: 'new@example.com' },
          message: 'Account created successfully. Please check your email for verification.',
        },
        message: 'User account created successfully',
      }),
    }) as any;
    (window as any).fetch = global.fetch;

    render(<SignupForm />);
    fillRequiredFields();
    fireEvent.click(screen.getByTestId('signup-button'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/signup', expect.any(Object));
    });

    expect(mockPush).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: /check your email/i })).toBeInTheDocument();
    expect(
      screen.getByText(/account created successfully. please check your email for verification./i)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open email app/i })).toBeInTheDocument();
  });

  it('redirects automatically when Supabase returns an active session', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          sessionActive: true,
          user: { email: 'new@example.com' },
        },
        message: 'User account created successfully',
      }),
    }) as any;
    (window as any).fetch = global.fetch;

    render(<SignupForm redirectTo="/dashboard" />);
    fillRequiredFields();
    fireEvent.click(screen.getByTestId('signup-button'));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/en/dashboard');
    });
    expect(mockRefresh).toHaveBeenCalled();
  });
});
