import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { SignupForm } from '@/components/auth/signup-form';

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

type MockButtonProps = {
  children: ReactNode;
  asChild?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>;

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, asChild: _asChild, ...props }: MockButtonProps) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock('@/i18n/routing', () => ({
  Link: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
  routing: {
    defaultLocale: 'en',
    locales: ['en', 'he'],
  },
}));

const originalFetch = globalThis.fetch;

const jsonResponse = (payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

const setFetchMock = (payload: unknown) => {
  const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse(payload));
  globalThis.fetch = fetchMock;
  return fetchMock;
};

describe('SignupForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const fillRequiredFields = () => {
    fireEvent.change(screen.getByTestId('first-name-input'), {
      target: { value: 'Test' },
    });
    fireEvent.change(screen.getByTestId('last-name-input'), {
      target: { value: 'User' },
    });
    fireEvent.change(screen.getByTestId('email-input'), {
      target: { value: 'new@example.com' },
    });
    fireEvent.change(screen.getByTestId('password-input'), {
      target: { value: 'Tru3Str0ng!' },
    });
    fireEvent.change(screen.getByTestId('confirm-password-input'), {
      target: { value: 'Tru3Str0ng!' },
    });
    fireEvent.click(screen.getByTestId('terms-checkbox'));
  };

  it('shows a check your email confirmation when verification is required', async () => {
    const fetchMock = setFetchMock({
      success: true,
      data: {
        sessionActive: false,
        user: { email: 'new@example.com' },
        message:
          'Account created successfully. Please check your email for verification.',
      },
      message: 'User account created successfully',
    });

    render(<SignupForm />);
    fillRequiredFields();
    fireEvent.click(screen.getByTestId('signup-button'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/auth/signup',
        expect.any(Object)
      );
    });

    expect(mockPush).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
    expect(
      screen.getByRole('heading', { name: /check your email/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /account created successfully. please check your email for verification./i
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /open email app/i })
    ).toBeInTheDocument();
  });

  it('redirects automatically when Supabase returns an active session', async () => {
    const fetchMock = setFetchMock({
      success: true,
      data: {
        sessionActive: true,
        user: { email: 'new@example.com' },
      },
      message: 'User account created successfully',
    });

    render(<SignupForm redirectTo="/dashboard" />);
    fillRequiredFields();
    fireEvent.click(screen.getByTestId('signup-button'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/auth/signup',
        expect.any(Object)
      );
      expect(mockPush).toHaveBeenCalledWith('/en/dashboard');
    });
    expect(mockRefresh).toHaveBeenCalled();
  });
});
