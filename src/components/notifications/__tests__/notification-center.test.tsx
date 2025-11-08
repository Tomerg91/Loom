import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: vi.fn(() => (key: string) => key),
}));

// Mock auth store
vi.mock('@/lib/store/auth-store', () => ({
  useUser: vi.fn(() => ({
    id: 'test-user-id',
    role: 'client',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
  })),
}));

// Mock toast provider
vi.mock('@/components/ui/toast-provider', () => ({
  useToast: vi.fn(() => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  })),
}));

// Mock realtime hooks
vi.mock('@/lib/realtime/hooks', () => ({
  useRealtimeNotifications: vi.fn(() => ({
    isConnected: true,
    notificationPermission: 'granted',
    requestPermission: vi.fn(),
  })),
}));

// Mock offline queue
vi.mock('@/lib/notifications/offline-queue', () => ({
  useOfflineNotificationQueue: vi.fn(() => ({
    addToQueue: vi.fn(),
    processQueue: vi.fn(),
    getStatus: vi.fn(() => ({ count: 0, isProcessing: false, items: [] })),
    clearQueue: vi.fn(),
  })),
}));

import { NotificationCenter } from '../notification-center';

// Sample test data
const mockNotifications = {
  data: [
    {
      id: '1',
      userId: 'test-user-id',
      type: 'session_reminder',
      title: 'Session Reminder',
      message: 'You have a session with Coach Sarah in 1 hour',
      data: { sessionId: 'session-123', coachName: 'Sarah Smith' },
      readAt: null,
      createdAt: '2024-01-15T10:00:00Z',
    },
    {
      id: '2',
      userId: 'test-user-id',
      type: 'new_message',
      title: 'New Message',
      message: 'You have a new message from your coach',
      data: { coachId: 'coach-123' },
      readAt: '2024-01-15T09:30:00Z',
      createdAt: '2024-01-15T09:30:00Z',
    },
    {
      id: '3',
      userId: 'test-user-id',
      type: 'system_update',
      title: 'System Update',
      message: 'New features available in your dashboard',
      data: {},
      readAt: null,
      createdAt: '2024-01-15T08:00:00Z',
    },
  ],
  pagination: {
    page: 1,
    limit: 20,
    total: 3,
    unreadCount: 2,
  },
};

describe('NotificationCenter', () => {
  const mockPush = vi.fn();
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    (useRouter as unknown).mockReturnValue({
      push: mockPush,
    });

    // Mock fetch
    global.fetch = vi.fn();

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderWithProvider = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  describe('Basic Rendering', () => {
    it('should render notification bell button', async () => {
      (global.fetch as unknown).mockResolvedValueOnce({
        ok: true,
        json: async () => mockNotifications,
      });

      renderWithProvider(<NotificationCenter />);

      expect(screen.getByTestId('notification-bell')).toBeInTheDocument();
    });

    it('should show unread count badge when there are unread notifications', async () => {
      (global.fetch as unknown).mockResolvedValueOnce({
        ok: true,
        json: async () => mockNotifications,
      });

      renderWithProvider(<NotificationCenter />);

      await waitFor(() => {
        expect(screen.getByTestId('unread-count')).toBeInTheDocument();
        expect(screen.getByTestId('unread-count')).toHaveTextContent('2');
      });
    });
  });

  describe('Notification List', () => {
    it('should display notifications when dropdown is opened', async () => {
      (global.fetch as unknown).mockResolvedValueOnce({
        ok: true,
        json: async () => mockNotifications,
      });

      const user = userEvent.setup();
      renderWithProvider(<NotificationCenter />);

      await user.click(screen.getByTestId('notification-bell'));

      await waitFor(() => {
        expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();
        expect(screen.getByText('Session Reminder')).toBeInTheDocument();
        expect(screen.getByText('New Message')).toBeInTheDocument();
        expect(screen.getByText('System Update')).toBeInTheDocument();
      });
    });

    it('should show empty state when no notifications exist', async () => {
      (global.fetch as unknown).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          pagination: { page: 1, limit: 20, total: 0, unreadCount: 0 },
        }),
      });

      const user = userEvent.setup();
      renderWithProvider(<NotificationCenter />);

      await user.click(screen.getByTestId('notification-bell'));

      await waitFor(() => {
        expect(screen.getByText('No notifications yet')).toBeInTheDocument();
      });
    });
  });

  describe('Notification Actions', () => {
    it('should mark notification as read when clicked', async () => {
      (global.fetch as unknown)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockNotifications,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        });

      const user = userEvent.setup();
      renderWithProvider(<NotificationCenter />);

      await user.click(screen.getByTestId('notification-bell'));

      await waitFor(() => {
        expect(screen.getByText('Session Reminder')).toBeInTheDocument();
      });

      const notificationItems = screen.getAllByTestId('notification-item');
      await user.click(notificationItems[0]);

      // Should call mark as read API
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/notifications/1/read',
          { method: 'POST' }
        );
      });

      // Should navigate to session page
      expect(mockPush).toHaveBeenCalledWith('/sessions/session-123');
    });

    it('should mark all notifications as read', async () => {
      (global.fetch as unknown)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockNotifications,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        });

      const user = userEvent.setup();
      renderWithProvider(<NotificationCenter />);

      await user.click(screen.getByTestId('notification-bell'));

      await waitFor(() => {
        expect(screen.getByText('Mark all read')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Mark all read'));

      // Should call mark all read API
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/notifications/mark-all-read',
          { method: 'POST' }
        );
      });
    });

    it('should delete notification', async () => {
      (global.fetch as unknown)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockNotifications,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        });

      const user = userEvent.setup();
      renderWithProvider(<NotificationCenter />);

      await user.click(screen.getByTestId('notification-bell'));

      // Open dropdown menu for first notification
      await waitFor(() => {
        const dropdownTriggers = screen.getAllByRole('button');
        const menuButton = dropdownTriggers.find(button => 
          button.getAttribute('aria-haspopup') === 'menu'
        );
        expect(menuButton).toBeInTheDocument();
      });

      // Click the dropdown menu
      const dropdownTriggers = screen.getAllByRole('button');
      const menuButton = dropdownTriggers.find(button => 
        button.getAttribute('aria-haspopup') === 'menu'
      );
      
      if (menuButton) {
        await user.click(menuButton);
        
        await waitFor(() => {
          expect(screen.getByText('Delete')).toBeInTheDocument();
        });

        await user.click(screen.getByText('Delete'));

        // Should call delete API
        await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith(
            '/api/notifications/1',
            { method: 'DELETE' }
          );
        });
      }
    });
  });

  describe('Navigation', () => {
    it('should navigate to settings when settings button is clicked', async () => {
      (global.fetch as unknown).mockResolvedValueOnce({
        ok: true,
        json: async () => mockNotifications,
      });

      const user = userEvent.setup();
      renderWithProvider(<NotificationCenter />);

      await user.click(screen.getByTestId('notification-bell'));

      await waitFor(() => {
        const settingsButton = screen.getByTitle('Notification Settings');
        expect(settingsButton).toBeInTheDocument();
      });

      await user.click(screen.getByTitle('Notification Settings'));

      expect(mockPush).toHaveBeenCalledWith('/settings?tab=notifications');
    });

    it('should navigate correctly based on notification type and user role', async () => {
      (global.fetch as unknown)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockNotifications,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        });

      const user = userEvent.setup();
      renderWithProvider(<NotificationCenter />);

      await user.click(screen.getByTestId('notification-bell'));

      await waitFor(() => {
        expect(screen.getByText('New Message')).toBeInTheDocument();
      });

      // Click on new message notification (second one)
      const notificationItems = screen.getAllByTestId('notification-item');
      await user.click(notificationItems[1]);

      // Should navigate to coach page for client
      expect(mockPush).toHaveBeenCalledWith('/client/coach/coach-123');
    });
  });

  describe('Offline Functionality', () => {
    it('should queue actions when offline', async () => {
      (global.fetch as unknown).mockResolvedValueOnce({
        ok: true,
        json: async () => mockNotifications,
      });

      // Simulate offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const user = userEvent.setup();
      renderWithProvider(<NotificationCenter />);

      await user.click(screen.getByTestId('notification-bell'));

      await waitFor(() => {
        expect(screen.getByText('Session Reminder')).toBeInTheDocument();
      });

      const notificationItems = screen.getAllByTestId('notification-item');
      await user.click(notificationItems[0]);

      // Should not call API when offline
      expect(global.fetch).not.toHaveBeenCalledWith(
        '/api/notifications/1/read',
        { method: 'POST' }
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const user = userEvent.setup();
      (global.fetch as unknown).mockRejectedValueOnce(new Error('Network error'));

      renderWithProvider(<NotificationCenter />);

      await user.click(screen.getByTestId('notification-bell'));

      await waitFor(() => {
        expect(screen.getByText('Failed to load notifications')).toBeInTheDocument();
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });

    it('should retry failed API calls', async () => {
      (global.fetch as unknown)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockNotifications,
        });

      const user = userEvent.setup();
      renderWithProvider(<NotificationCenter />);

      await user.click(screen.getByTestId('notification-bell'));

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Try Again'));

      await waitFor(() => {
        expect(screen.getByText('Session Reminder')).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should show connection status indicator', async () => {
      (global.fetch as unknown).mockResolvedValueOnce({
        ok: true,
        json: async () => mockNotifications,
      });

      const user = userEvent.setup();
      renderWithProvider(<NotificationCenter />);

      await user.click(screen.getByTestId('notification-bell'));

      await waitFor(() => {
        // Look for the green connection indicator
        const indicator = screen.getByTitle('Real-time updates active');
        expect(indicator).toBeInTheDocument();
        expect(indicator).toHaveClass('bg-green-500');
      });
    });
  });
});