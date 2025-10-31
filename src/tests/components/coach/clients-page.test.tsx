import { screen, fireEvent } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CoachClientsPage } from '@/components/coach/clients-page';
import { renderWithProviders, mockUseQuery, createMockQueryResult } from '@/test/utils';

vi.mock('next/navigation');
vi.mock('next-intl');

const mockClientsData = [
  {
    id: 'client-123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '555-1234',
    status: 'active',
    totalSessions: 10,
    completedSessions: 8,
    averageRating: 4.5,
    joinedDate: '2024-01-01',
    progress: { current: 80, target: 100 },
    goals: ['Goal 1'],
  },
];

describe('ClientsPage', () => {
  let mockRouter: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockRouter = vi.fn();
    vi.mocked(useRouter).mockReturnValue({
      push: mockRouter,
      replace: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    } as unknown as ReturnType<typeof useRouter>);
    vi.mocked(useLocale).mockReturnValue('en');
    vi.mocked(useTranslations).mockReturnValue(((key: string) => key) as unknown as ReturnType<typeof useTranslations>);

    // Mock useQuery to return client data
    mockUseQuery.mockReturnValue(
      createMockQueryResult(mockClientsData, { isSuccess: true })
    );
  });

  it('navigates to client detail with locale prefix when clicking card', async () => {
    renderWithProviders(<CoachClientsPage />);

    const clientCard = screen.getByTestId('client-card-client-123');
    fireEvent.click(clientCard);

    expect(mockRouter).toHaveBeenCalledWith('/en/coach/clients/client-123');
  });

  it('uses locale prefix in all navigation URLs', async () => {
    renderWithProviders(<CoachClientsPage />);

    // Verify the component has useLocale hook
    expect(vi.mocked(useLocale)).toHaveBeenCalled();

    // Click the client card to trigger navigation
    const clientCard = screen.getByTestId('client-card-client-123');
    fireEvent.click(clientCard);

    // Verify navigation includes locale
    expect(mockRouter).toHaveBeenCalledWith('/en/coach/clients/client-123');
  });
});
