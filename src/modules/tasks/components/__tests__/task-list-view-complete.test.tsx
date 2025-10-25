import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockTasks = [
  {
    id: '1',
    title: 'Task 1',
    status: 'PENDING',
    priority: 'HIGH',
    dueDate: '2025-12-31',
    clientId: 'client1',
  },
  {
    id: '2',
    title: 'Task 2',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    dueDate: '2025-11-30',
    clientId: 'client1',
  },
  {
    id: '3',
    title: 'Task 3',
    status: 'COMPLETED',
    priority: 'LOW',
    dueDate: '2025-10-31',
    clientId: 'client2',
  },
];

const hoisted = vi.hoisted(() => ({
  useTaskList: vi.fn(),
  useTranslations: vi.fn((namespace: string) => (key: string) => `${namespace}.${key}`),
}));

vi.mock('@/modules/tasks/hooks', () => ({
  useTaskList: hoisted.useTaskList,
}));

vi.mock('next-intl', () => ({
  useTranslations: hoisted.useTranslations,
}));

// Mock ResizeObserver
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

(globalThis as typeof globalThis & { ResizeObserver: typeof ResizeObserverMock }).ResizeObserver = ResizeObserverMock;

import { TaskListView } from '../task-list-view';

describe('TaskListView', () => {
  beforeEach(() => {
    hoisted.useTaskList.mockReset();
  });

  it('renders task list with tasks', async () => {
    hoisted.useTaskList.mockReturnValue({
      data: {
        data: mockTasks,
        pagination: {
          page: 1,
          pageSize: 10,
          total: 3,
          totalPages: 1,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    });

    render(<TaskListView />);

    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument();
      expect(screen.getByText('Task 2')).toBeInTheDocument();
      expect(screen.getByText('Task 3')).toBeInTheDocument();
    });
  });

  it('displays loading skeleton while tasks are loading', () => {
    hoisted.useTaskList.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    });

    render(<TaskListView />);

    expect(screen.getByText(/tasks.loading.tasks/i)).toBeInTheDocument();
  });

  it('displays empty state when no tasks exist', async () => {
    hoisted.useTaskList.mockReturnValue({
      data: {
        data: [],
        pagination: {
          page: 1,
          pageSize: 10,
          total: 0,
          totalPages: 0,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    });

    render(<TaskListView />);

    await waitFor(() => {
      expect(screen.getByText(/0 task/i)).toBeInTheDocument();
    });
  });

  it('displays error message when loading fails', async () => {
    const mockRefetch = vi.fn();
    hoisted.useTaskList.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { message: 'Failed to load tasks' },
      refetch: mockRefetch,
      isFetching: false,
    });

    render(<TaskListView />);

    await waitFor(() => {
      expect(screen.getByText(/tasks.errors.loadFailed/i)).toBeInTheDocument();
    });
    
    const retryButton = screen.getByRole('button', { name: /common.retry/i });
    expect(retryButton).toBeInTheDocument();
  });

  it('calls refetch when retry button is clicked', async () => {
    const user = userEvent.setup();
    const mockRefetch = vi.fn();
    hoisted.useTaskList.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { message: 'Failed to load tasks' },
      refetch: mockRefetch,
      isFetching: false,
    });

    render(<TaskListView />);

    const retryButton = await screen.findByRole('button', { name: /common.retry/i });
    await user.click(retryButton);

    expect(mockRefetch).toHaveBeenCalled();
  });

  it('filters tasks by status', async () => {
    const user = userEvent.setup();
    const mockUseTaskList = vi.fn().mockReturnValue({
      data: {
        data: mockTasks,
        pagination: {
          page: 1,
          pageSize: 10,
          total: 3,
          totalPages: 1,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    });
    
    hoisted.useTaskList.mockImplementation(mockUseTaskList);

    render(<TaskListView />);

    // Click on status filter
    const statusFilter = screen.getByLabelText(/status/i);
    await user.click(statusFilter);
    
    // Select PENDING status
    const pendingOption = await screen.findByRole('option', { name: /pending/i });
    await user.click(pendingOption);

    // Check that useTaskList was called with status filter
    await waitFor(() => {
      const lastCall = mockUseTaskList.mock.calls[mockUseTaskList.mock.calls.length - 1];
      expect(lastCall[0]).toMatchObject({
        status: expect.arrayContaining(['PENDING']),
      });
    });
  });

  it('filters tasks by priority', async () => {
    const user = userEvent.setup();
    const mockUseTaskList = vi.fn().mockReturnValue({
      data: {
        data: mockTasks,
        pagination: {
          page: 1,
          pageSize: 10,
          total: 3,
          totalPages: 1,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    });
    
    hoisted.useTaskList.mockImplementation(mockUseTaskList);

    render(<TaskListView />);

    // Click on priority filter
    const priorityFilter = screen.getByLabelText(/priority/i);
    await user.click(priorityFilter);
    
    // Select HIGH priority
    const highOption = await screen.findByRole('option', { name: /high/i });
    await user.click(highOption);

    // Check that useTaskList was called with priority filter
    await waitFor(() => {
      const lastCall = mockUseTaskList.mock.calls[mockUseTaskList.mock.calls.length - 1];
      expect(lastCall[0]).toMatchObject({
        priority: expect.arrayContaining(['HIGH']),
      });
    });
  });

  it('supports search functionality', async () => {
    const user = userEvent.setup();
    const mockUseTaskList = vi.fn().mockReturnValue({
      data: {
        data: mockTasks,
        pagination: {
          page: 1,
          pageSize: 10,
          total: 3,
          totalPages: 1,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    });
    
    hoisted.useTaskList.mockImplementation(mockUseTaskList);

    render(<TaskListView />);

    const searchInput = screen.getByPlaceholderText(/search/i);
    await user.type(searchInput, 'Task 1');

    // Search uses deferred value, so we need to wait
    await waitFor(() => {
      const lastCall = mockUseTaskList.mock.calls[mockUseTaskList.mock.calls.length - 1];
      expect(lastCall[0]).toMatchObject({
        search: 'Task 1',
      });
    }, { timeout: 3000 });
  });

  it('handles pagination - next page', async () => {
    const user = userEvent.setup();
    const mockUseTaskList = vi.fn().mockReturnValue({
      data: {
        data: mockTasks,
        pagination: {
          page: 1,
          pageSize: 10,
          total: 25,
          totalPages: 3,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    });
    
    hoisted.useTaskList.mockImplementation(mockUseTaskList);

    render(<TaskListView />);

    const nextButton = screen.getByRole('button', { name: /next/i });
    await user.click(nextButton);

    await waitFor(() => {
      const lastCall = mockUseTaskList.mock.calls[mockUseTaskList.mock.calls.length - 1];
      expect(lastCall[0]).toMatchObject({
        page: 2,
      });
    });
  });

  it('handles pagination - previous page', async () => {
    const user = userEvent.setup();
    const mockUseTaskList = vi.fn().mockReturnValue({
      data: {
        data: mockTasks,
        pagination: {
          page: 2,
          pageSize: 10,
          total: 25,
          totalPages: 3,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    });
    
    hoisted.useTaskList.mockImplementation(mockUseTaskList);

    render(<TaskListView />);

    const previousButton = screen.getByRole('button', { name: /previous/i });
    await user.click(previousButton);

    await waitFor(() => {
      const lastCall = mockUseTaskList.mock.calls[mockUseTaskList.mock.calls.length - 1];
      expect(lastCall[0]).toMatchObject({
        page: 1,
      });
    });
  });

  it('disables previous button on first page', () => {
    hoisted.useTaskList.mockReturnValue({
      data: {
        data: mockTasks,
        pagination: {
          page: 1,
          pageSize: 10,
          total: 25,
          totalPages: 3,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    });

    render(<TaskListView />);

    const previousButton = screen.getByRole('button', { name: /previous/i });
    expect(previousButton).toBeDisabled();
  });

  it('disables next button on last page', () => {
    hoisted.useTaskList.mockReturnValue({
      data: {
        data: mockTasks,
        pagination: {
          page: 3,
          pageSize: 10,
          total: 25,
          totalPages: 3,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    });

    render(<TaskListView />);

    const nextButton = screen.getByRole('button', { name: /next/i });
    expect(nextButton).toBeDisabled();
  });

  it('displays correct pagination info', () => {
    hoisted.useTaskList.mockReturnValue({
      data: {
        data: mockTasks,
        pagination: {
          page: 2,
          pageSize: 10,
          total: 25,
          totalPages: 3,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    });

    render(<TaskListView />);

    expect(screen.getByText(/page 2 of 3/i)).toBeInTheDocument();
    expect(screen.getByText(/25 tasks/i)).toBeInTheDocument();
  });

  it('includes archived tasks when filter is enabled', async () => {
    const user = userEvent.setup();
    const mockUseTaskList = vi.fn().mockReturnValue({
      data: {
        data: mockTasks,
        pagination: {
          page: 1,
          pageSize: 10,
          total: 3,
          totalPages: 1,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    });
    
    hoisted.useTaskList.mockImplementation(mockUseTaskList);

    render(<TaskListView />);

    const archivedCheckbox = screen.getByLabelText(/include archived/i);
    await user.click(archivedCheckbox);

    await waitFor(() => {
      const lastCall = mockUseTaskList.mock.calls[mockUseTaskList.mock.calls.length - 1];
      expect(lastCall[0]).toMatchObject({
        includeArchived: true,
      });
    });
  });

  it('renders create task button', () => {
    hoisted.useTaskList.mockReturnValue({
      data: {
        data: mockTasks,
        pagination: {
          page: 1,
          pageSize: 10,
          total: 3,
          totalPages: 1,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    });

    render(<TaskListView />);

    const createButton = screen.getByRole('button', { name: /create/i });
    expect(createButton).toBeInTheDocument();
  });

  it('disables filters while fetching', () => {
    hoisted.useTaskList.mockReturnValue({
      data: {
        data: mockTasks,
        pagination: {
          page: 1,
          pageSize: 10,
          total: 3,
          totalPages: 1,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: true,
    });

    render(<TaskListView />);

    const searchInput = screen.getByPlaceholderText(/search/i);
    expect(searchInput).toBeDisabled();
  });
});
