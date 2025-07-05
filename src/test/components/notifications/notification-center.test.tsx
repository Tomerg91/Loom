import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, mockUseQuery, mockUseMutation, createMockNotification } from '@/test/utils';
import { NotificationCenter } from '@/components/notifications/notification-center';

// Mock the hooks
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
  })),
}));

vi.mock('@/lib/realtime/hooks', () => ({
  useRealtimeNotifications: vi.fn(() => ({
    isConnected: true,
  })),
}));

vi.mock('@/lib/store/auth-store', () => ({
  useUser: vi.fn(() => ({
    id: 'test-user-id',
    email: 'test@example.com',
  })),
}));

describe('NotificationCenter', () => {
  const mockNotifications = [
    createMockNotification({
      id: '1',
      title: 'Session Reminder',
      message: 'Your session starts in 1 hour',
      type: 'session_reminder',
      readAt: null,
    }),
    createMockNotification({
      id: '2',
      title: 'New Message',
      message: 'You have a new message from your coach',
      type: 'new_message',
      readAt: new Date().toISOString(),
    }),
  ];

  const mockNotificationsResponse = {
    data: mockNotifications,
    pagination: {
      page: 1,
      limit: 20,
      total: 2,
      unreadCount: 1,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    (vi.mocked(require('@tanstack/react-query').useQuery)).mockReturnValue(
      mockUseQuery(mockNotificationsResponse, {
        isLoading: false,
        isError: false,
        error: null,
      })
    );
    
    (vi.mocked(require('@tanstack/react-query').useMutation)).mockReturnValue(
      mockUseMutation(null, {
        mutate: vi.fn(),
        isPending: false,
        isError: false,
        error: null,
      })
    );
  });

  it('renders notification bell with unread count', () => {
    renderWithProviders(<NotificationCenter />);
    
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // unread count
  });

  it('opens notification dropdown on click', async () => {
    renderWithProviders(<NotificationCenter />);
    
    const bellButton = screen.getByRole('button');
    fireEvent.click(bellButton);
    
    await waitFor(() => {
      expect(screen.getByText('Notifications')).toBeInTheDocument();
      expect(screen.getByText('Session Reminder')).toBeInTheDocument();
      expect(screen.getByText('New Message')).toBeInTheDocument();
    });
  });

  it('shows loading state when fetching notifications', () => {
    (vi.mocked(require('@tanstack/react-query').useQuery)).mockReturnValue(
      mockUseQuery(null, {
        isLoading: true,
        isError: false,
        error: null,
      })
    );
    
    renderWithProviders(<NotificationCenter />);
    
    const bellButton = screen.getByRole('button');
    fireEvent.click(bellButton);
    
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    // Should show loading skeletons
    expect(document.querySelectorAll('.animate-pulse')).toHaveLength(3);
  });

  it('shows empty state when no notifications', () => {
    (vi.mocked(require('@tanstack/react-query').useQuery)).mockReturnValue(
      mockUseQuery({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, unreadCount: 0 },
      }, {
        isLoading: false,
        isError: false,
        error: null,
      })
    );
    
    renderWithProviders(<NotificationCenter />);
    
    const bellButton = screen.getByRole('button');
    fireEvent.click(bellButton);
    
    expect(screen.getByText('No notifications yet')).toBeInTheDocument();
  });

  it('marks notification as read when clicked', async () => {
    const mockMutate = vi.fn();
    (vi.mocked(require('@tanstack/react-query').useMutation)).mockReturnValue(
      mockUseMutation(null, {
        mutate: mockMutate,
        isPending: false,
        isError: false,
        error: null,
      })
    );
    
    renderWithProviders(<NotificationCenter />);
    
    const bellButton = screen.getByRole('button');
    fireEvent.click(bellButton);
    
    await waitFor(() => {
      const unreadNotification = screen.getByText('Session Reminder');
      fireEvent.click(unreadNotification);
    });
    
    expect(mockMutate).toHaveBeenCalledWith('1');
  });

  it('marks all notifications as read', async () => {
    const mockMutate = vi.fn();
    (vi.mocked(require('@tanstack/react-query').useMutation)).mockReturnValue(
      mockUseMutation(null, {
        mutate: mockMutate,
        isPending: false,
        isError: false,
        error: null,
      })
    );
    
    renderWithProviders(<NotificationCenter />);
    
    const bellButton = screen.getByRole('button');
    fireEvent.click(bellButton);
    
    await waitFor(() => {
      const markAllButton = screen.getByText('Mark all read');
      fireEvent.click(markAllButton);
    });
    
    expect(mockMutate).toHaveBeenCalled();
  });

  it('deletes notification from dropdown menu', async () => {
    const mockMutate = vi.fn();
    (vi.mocked(require('@tanstack/react-query').useMutation)).mockReturnValue(
      mockUseMutation(null, {
        mutate: mockMutate,
        isPending: false,
        isError: false,
        error: null,
      })
    );
    
    renderWithProviders(<NotificationCenter />);
    
    const bellButton = screen.getByRole('button');
    fireEvent.click(bellButton);
    
    await waitFor(() => {
      const moreButton = screen.getAllByRole('button')[0]; // First more button
      fireEvent.click(moreButton);
    });
    
    await waitFor(() => {
      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);
    });
    
    expect(mockMutate).toHaveBeenCalledWith('1');
  });

  it('shows real-time connection indicator', () => {
    renderWithProviders(<NotificationCenter />);
    
    const bellButton = screen.getByRole('button');
    fireEvent.click(bellButton);
    
    // Should show green dot for connected state
    const indicator = document.querySelector('.bg-green-500');
    expect(indicator).toBeInTheDocument();
  });

  it('displays correct notification icons based on type', () => {
    renderWithProviders(<NotificationCenter />);
    
    const bellButton = screen.getByRole('button');
    fireEvent.click(bellButton);
    
    // Should show calendar icon for session reminder
    expect(document.querySelector('svg[data-testid="calendar-icon"]')).toBeInTheDocument();
    // Should show message icon for new message
    expect(document.querySelector('svg[data-testid="message-icon"]')).toBeInTheDocument();
  });
});