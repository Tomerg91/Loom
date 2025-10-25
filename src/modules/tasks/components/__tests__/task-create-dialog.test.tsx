import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const hoisted = vi.hoisted(() => ({
  createTaskMutation: {
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  },
  useTranslations: vi.fn((namespace: string) => (key: string) => `${namespace}.${key}`),
}));

vi.mock('@/modules/tasks/hooks', () => ({
  useCreateTask: () => hoisted.createTaskMutation,
}));

vi.mock('next-intl', () => ({
  useTranslations: hoisted.useTranslations,
}));

// Mock ResizeObserver for Radix UI components
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

(globalThis as typeof globalThis & { ResizeObserver: typeof ResizeObserverMock }).ResizeObserver = ResizeObserverMock;
(window as typeof window & { ResizeObserver: typeof ResizeObserverMock }).ResizeObserver = ResizeObserverMock;

import { TaskCreateDialog } from '../task-create-dialog';

describe('TaskCreateDialog', () => {
  beforeEach(() => {
    hoisted.createTaskMutation.mutateAsync.mockReset();
    hoisted.createTaskMutation.isPending = false;
    hoisted.createTaskMutation.isError = false;
    hoisted.createTaskMutation.error = null;
  });

  it('renders trigger button with correct text', () => {
    render(<TaskCreateDialog />);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('tasks.createTask');
  });

  it('opens dialog when trigger button is clicked', async () => {
    const user = userEvent.setup();
    render(<TaskCreateDialog />);
    
    const button = screen.getByRole('button', { name: /tasks.createTask/i });
    await user.click(button);
    
    // Dialog should now be visible
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('displays all form fields in dialog', async () => {
    const user = userEvent.setup();
    render(<TaskCreateDialog />);
    
    const button = screen.getByRole('button');
    await user.click(button);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/client/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/due date/i)).toBeInTheDocument();
    });
  });

  it('shows validation error when title is empty', async () => {
    const user = userEvent.setup();
    render(<TaskCreateDialog />);
    
    const button = screen.getByRole('button');
    await user.click(button);
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    
    const submitButton = screen.getByRole('button', { name: /create/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
    });
    
    expect(hoisted.createTaskMutation.mutateAsync).not.toHaveBeenCalled();
  });

  it('shows validation error when client is not selected', async () => {
    const user = userEvent.setup();
    render(<TaskCreateDialog />);
    
    const button = screen.getByRole('button');
    await user.click(button);
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    
    const titleInput = screen.getByLabelText(/title/i);
    await user.type(titleInput, 'Test Task');
    
    const submitButton = screen.getByRole('button', { name: /create/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/client.*required/i)).toBeInTheDocument();
    });
    
    expect(hoisted.createTaskMutation.mutateAsync).not.toHaveBeenCalled();
  });

  it('creates task successfully with valid data', async () => {
    const user = userEvent.setup();
    const mockTask = {
      id: '123',
      title: 'New Task',
      clientId: '456',
      status: 'PENDING',
    };
    
    hoisted.createTaskMutation.mutateAsync.mockResolvedValue(mockTask);
    
    render(<TaskCreateDialog />);
    
    const button = screen.getByRole('button');
    await user.click(button);
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    
    const titleInput = screen.getByLabelText(/title/i);
    await user.type(titleInput, 'New Task');
    
    // Note: In actual implementation, you'd need to interact with the client select
    // This is a simplified test showing the pattern
    
    const submitButton = screen.getByRole('button', { name: /create/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(hoisted.createTaskMutation.mutateAsync).toHaveBeenCalled();
    });
  });

  it('displays loading state during task creation', async () => {
    const user = userEvent.setup();
    hoisted.createTaskMutation.isPending = true;
    
    render(<TaskCreateDialog />);
    
    const button = screen.getByRole('button');
    await user.click(button);
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    
    const submitButton = screen.getByRole('button', { name: /create/i });
    expect(submitButton).toBeDisabled();
  });

  it('displays error message when task creation fails', async () => {
    const user = userEvent.setup();
    hoisted.createTaskMutation.mutateAsync.mockRejectedValue(
      new Error('Failed to create task')
    );
    
    render(<TaskCreateDialog />);
    
    const button = screen.getByRole('button');
    await user.click(button);
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    
    const titleInput = screen.getByLabelText(/title/i);
    await user.type(titleInput, 'New Task');
    
    const submitButton = screen.getByRole('button', { name: /create/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/failed/i)).toBeInTheDocument();
    });
  });

  it('closes dialog after successful task creation', async () => {
    const user = userEvent.setup();
    const mockTask = {
      id: '123',
      title: 'New Task',
      clientId: '456',
      status: 'PENDING',
    };
    
    hoisted.createTaskMutation.mutateAsync.mockResolvedValue(mockTask);
    
    render(<TaskCreateDialog />);
    
    const button = screen.getByRole('button');
    await user.click(button);
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    
    const titleInput = screen.getByLabelText(/title/i);
    await user.type(titleInput, 'New Task');
    
    const submitButton = screen.getByRole('button', { name: /create/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('calls onCreated callback after successful creation', async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    const mockTask = {
      id: '123',
      title: 'New Task',
      clientId: '456',
      status: 'PENDING',
    };
    
    hoisted.createTaskMutation.mutateAsync.mockResolvedValue(mockTask);
    
    render(<TaskCreateDialog onCreated={onCreated} />);
    
    const button = screen.getByRole('button');
    await user.click(button);
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    
    const titleInput = screen.getByLabelText(/title/i);
    await user.type(titleInput, 'New Task');
    
    const submitButton = screen.getByRole('button', { name: /create/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(onCreated).toHaveBeenCalled();
    });
  });

  it('resets form after closing and reopening dialog', async () => {
    const user = userEvent.setup();
    render(<TaskCreateDialog />);
    
    // Open dialog first time
    const button = screen.getByRole('button');
    await user.click(button);
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    
    const titleInput = screen.getByLabelText(/title/i);
    await user.type(titleInput, 'Test Task');
    
    // Close dialog
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);
    
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    
    // Reopen dialog
    await user.click(button);
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    
    // Form should be reset
    const newTitleInput = screen.getByLabelText(/title/i);
    expect(newTitleInput).toHaveValue('');
  });

  it('supports optional description field', async () => {
    const user = userEvent.setup();
    render(<TaskCreateDialog />);
    
    const button = screen.getByRole('button');
    await user.click(button);
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    
    const descriptionInput = screen.getByLabelText(/description/i);
    expect(descriptionInput).toBeInTheDocument();
    expect(descriptionInput).not.toBeRequired();
  });

  it('supports category selection', async () => {
    const user = userEvent.setup();
    render(<TaskCreateDialog />);
    
    const button = screen.getByRole('button');
    await user.click(button);
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    
    const categorySelect = screen.getByLabelText(/category/i);
    expect(categorySelect).toBeInTheDocument();
  });
});
