import { render, screen, waitFor } from '@testing-library/user Event';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const hoisted = vi.hoisted(() => ({
  createProgressMutation: {
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  },
  useTranslations: vi.fn((namespace: string) => (key: string) => `${namespace}.${key}`),
}));

vi.mock('@/modules/tasks/hooks', () => ({
  useCreateProgressUpdate: () => hoisted.createProgressMutation,
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

import { TaskProgressDialog } from '../task-progress-dialog';

const mockTask = {
  id: 'task-123',
  instanceId: 'instance-456',
  title: 'Complete worksheet',
  status: 'IN_PROGRESS',
  currentProgress: 50,
};

describe('TaskProgressDialog', () => {
  beforeEach(() => {
    hoisted.createProgressMutation.mutateAsync.mockReset();
    hoisted.createProgressMutation.isPending = false;
    hoisted.createProgressMutation.isError = false;
    hoisted.createProgressMutation.error = null;
  });

  it('renders trigger button with task title', () => {
    render(<TaskProgressDialog task={mockTask} />);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent(/update progress/i);
  });

  it('opens dialog when trigger is clicked', async () => {
    const user = userEvent.setup();
    render(<TaskProgressDialog task={mockTask} />);
    
    const button = screen.getByRole('button');
    await user.click(button);
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('displays all progress form fields', async () => {
    const user = userEvent.setup();
    render(<TaskProgressDialog task={mockTask} />);
    
    const button = screen.getByRole('button');
    await user.click(button);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/percentage/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/attachment/i)).toBeInTheDocument();
    });
  });

  it('validates percentage is between 0 and 100', async () => {
    const user = userEvent.setup();
    render(<TaskProgressDialog task={mockTask} />);
    
    const button = screen.getByRole('button');
    await user.click(button);
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    
    const percentageInput = screen.getByLabelText(/percentage/i);
    await user.clear(percentageInput);
    await user.type(percentageInput, '150');
    
    const submitButton = screen.getByRole('button', { name: /submit/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/percentage must be between 0 and 100/i)).toBeInTheDocument();
    });
    
    expect(hoisted.createProgressMutation.mutateAsync).not.toHaveBeenCalled();
  });

  it('validates percentage is not negative', async () => {
    const user = userEvent.setup();
    render(<TaskProgressDialog task={mockTask} />);
    
    const button = screen.getByRole('button');
    await user.click(button);
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    
    const percentageInput = screen.getByLabelText(/percentage/i);
    await user.clear(percentageInput);
    await user.type(percentageInput, '-10');
    
    const submitButton = screen.getByRole('button', { name: /submit/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/percentage must be between 0 and 100/i)).toBeInTheDocument();
    });
    
    expect(hoisted.createProgressMutation.mutateAsync).not.toHaveBeenCalled();
  });

  it('creates progress update with valid percentage', async () => {
    const user = userEvent.setup();
    const mockProgress = {
      id: 'progress-789',
      taskId: mockTask.id,
      percentage: 75,
      notes: 'Good progress',
    };
    
    hoisted.createProgressMutation.mutateAsync.mockResolvedValue(mockProgress);
    
    render(<TaskProgressDialog task={mockTask} />);
    
    const button = screen.getByRole('button');
    await user.click(button);
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    
    const percentageInput = screen.getByLabelText(/percentage/i);
    await user.clear(percentageInput);
    await user.type(percentageInput, '75');
    
    const notesInput = screen.getByLabelText(/notes/i);
    await user.type(notesInput, 'Good progress');
    
    const submitButton = screen.getByRole('button', { name: /submit/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(hoisted.createProgressMutation.mutateAsync).toHaveBeenCalledWith({
        taskId: mockTask.id,
        instanceId: mockTask.instanceId,
        percentage: 75,
        notes: 'Good progress',
      });
    });
  });

  it('allows progress update without notes', async () => {
    const user = userEvent.setup();
    const mockProgress = {
      id: 'progress-789',
      taskId: mockTask.id,
      percentage: 80,
      notes: null,
    };
    
    hoisted.createProgressMutation.mutateAsync.mockResolvedValue(mockProgress);
    
    render(<TaskProgressDialog task={mockTask} />);
    
    const button = screen.getByRole('button');
    await user.click(button);
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    
    const percentageInput = screen.getByLabelText(/percentage/i);
    await user.clear(percentageInput);
    await user.type(percentageInput, '80');
    
    const submitButton = screen.getByRole('button', { name: /submit/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(hoisted.createProgressMutation.mutateAsync).toHaveBeenCalled();
    });
  });

  it('supports file upload field', async () => {
    const user = userEvent.setup();
    render(<TaskProgressDialog task={mockTask} />);
    
    const button = screen.getByRole('button');
    await user.click(button);
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    
    const fileInput = screen.getByLabelText(/attachment/i);
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveAttribute('type', 'file');
  });

  it('displays loading state during submission', async () => {
    const user = userEvent.setup();
    hoisted.createProgressMutation.isPending = true;
    
    render(<TaskProgressDialog task={mockTask} />);
    
    const button = screen.getByRole('button');
    await user.click(button);
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    
    const submitButton = screen.getByRole('button', { name: /submit/i });
    expect(submitButton).toBeDisabled();
  });

  it('displays success message after successful update', async () => {
    const user = userEvent.setup();
    const mockProgress = {
      id: 'progress-789',
      taskId: mockTask.id,
      percentage: 90,
      notes: 'Almost done',
    };
    
    hoisted.createProgressMutation.mutateAsync.mockResolvedValue(mockProgress);
    
    render(<TaskProgressDialog task={mockTask} />);
    
    const button = screen.getByRole('button');
    await user.click(button);
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    
    const percentageInput = screen.getByLabelText(/percentage/i);
    await user.clear(percentageInput);
    await user.type(percentageInput, '90');
    
    const submitButton = screen.getByRole('button', { name: /submit/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/success/i)).toBeInTheDocument();
    });
  });

  it('displays error message when update fails', async () => {
    const user = userEvent.setup();
    hoisted.createProgressMutation.mutateAsync.mockRejectedValue(
      new Error('Failed to update progress')
    );
    
    render(<TaskProgressDialog task={mockTask} />);
    
    const button = screen.getByRole('button');
    await user.click(button);
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    
    const percentageInput = screen.getByLabelText(/percentage/i);
    await user.clear(percentageInput);
    await user.type(percentageInput, '90');
    
    const submitButton = screen.getByRole('button', { name: /submit/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/failed/i)).toBeInTheDocument();
    });
  });

  it('shows current progress in dialog', async () => {
    const user = userEvent.setup();
    render(<TaskProgressDialog task={mockTask} />);
    
    const button = screen.getByRole('button');
    await user.click(button);
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    
    expect(screen.getByText(/current: 50%/i)).toBeInTheDocument();
  });

  it('allows updating to 100% to complete task', async () => {
    const user = userEvent.setup();
    const mockProgress = {
      id: 'progress-789',
      taskId: mockTask.id,
      percentage: 100,
      notes: 'Task completed!',
    };
    
    hoisted.createProgressMutation.mutateAsync.mockResolvedValue(mockProgress);
    
    render(<TaskProgressDialog task={mockTask} />);
    
    const button = screen.getByRole('button');
    await user.click(button);
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    
    const percentageInput = screen.getByLabelText(/percentage/i);
    await user.clear(percentageInput);
    await user.type(percentageInput, '100');
    
    const notesInput = screen.getByLabelText(/notes/i);
    await user.type(notesInput, 'Task completed!');
    
    const submitButton = screen.getByRole('button', { name: /submit/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(hoisted.createProgressMutation.mutateAsync).toHaveBeenCalledWith({
        taskId: mockTask.id,
        instanceId: mockTask.instanceId,
        percentage: 100,
        notes: 'Task completed!',
      });
    });
  });

  it('closes dialog after successful update', async () => {
    const user = userEvent.setup();
    const mockProgress = {
      id: 'progress-789',
      taskId: mockTask.id,
      percentage: 95,
      notes: 'Nearly there',
    };
    
    hoisted.createProgressMutation.mutateAsync.mockResolvedValue(mockProgress);
    
    render(<TaskProgressDialog task={mockTask} />);
    
    const button = screen.getByRole('button');
    await user.click(button);
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    
    const percentageInput = screen.getByLabelText(/percentage/i);
    await user.clear(percentageInput);
    await user.type(percentageInput, '95');
    
    const submitButton = screen.getByRole('button', { name: /submit/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('calls onUpdate callback after successful update', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    const mockProgress = {
      id: 'progress-789',
      taskId: mockTask.id,
      percentage: 85,
      notes: 'Great progress',
    };
    
    hoisted.createProgressMutation.mutateAsync.mockResolvedValue(mockProgress);
    
    render(<TaskProgressDialog task={mockTask} onUpdate={onUpdate} />);
    
    const button = screen.getByRole('button');
    await user.click(button);
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    
    const percentageInput = screen.getByLabelText(/percentage/i);
    await user.clear(percentageInput);
    await user.type(percentageInput, '85');
    
    const submitButton = screen.getByRole('button', { name: /submit/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith(mockProgress);
    });
  });
});
