import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const hoisted = vi.hoisted(() => ({
  createTaskMutation: {
    mutateAsync: vi.fn(),
    isPending: false,
  },
  updateTaskMutation: {
    mutateAsync: vi.fn(),
    isPending: false,
  },
}));

vi.mock('@/modules/sessions/api/tasks', () => ({
  useSessionCreateTask: () => hoisted.createTaskMutation,
  useSessionUpdateTask: () => hoisted.updateTaskMutation,
}));

import { TaskForm } from '@/modules/sessions/components/TaskForm';
import type { SessionTask } from '@/modules/sessions/types';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// The task form renders components that rely on ResizeObserver. jsdom does not
// provide this API, so we polyfill it in tests.
(
  globalThis as typeof globalThis & {
    ResizeObserver: typeof ResizeObserverMock;
  }
).ResizeObserver = ResizeObserverMock;
(
  window as typeof window & { ResizeObserver: typeof ResizeObserverMock }
).ResizeObserver = ResizeObserverMock;

describe('TaskForm', () => {
  beforeEach(() => {
    hoisted.createTaskMutation.mutateAsync.mockReset();
    hoisted.updateTaskMutation.mutateAsync.mockReset();
    hoisted.createTaskMutation.isPending = false;
    hoisted.updateTaskMutation.isPending = false;
  });

  it('displays validation errors when required fields are missing', async () => {
    render(<TaskForm />);

    const form = document.querySelector('form');
    expect(form).toBeTruthy();
    form?.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );

    expect(await screen.findByText('Title is required')).toBeInTheDocument();
    expect(
      await screen.findByText('Value must be a valid UUID')
    ).toBeInTheDocument();
  });

  it('prefills values when editing an existing task', () => {
    const existingTask: SessionTask = {
      id: 'task-123',
      coachId: '33333333-3333-4333-8333-333333333333',
      clientId: '44444444-4444-4444-8444-444444444444',
      client: {
        id: '44444444-4444-4444-8444-444444444444',
        firstName: 'Alex',
        lastName: 'River',
        email: 'alex@example.com',
      },
      category: null,
      title: 'Reflection journal',
      description: 'Share updates after sessions',
      priority: 'HIGH',
      status: 'PENDING',
      visibilityToCoach: true,
      dueDate: '2025-02-15',
      recurrenceRule: null,
      archivedAt: null,
      createdAt: '2025-02-01',
      updatedAt: '2025-02-01',
      instances: [],
    };

    render(<TaskForm task={existingTask} />);

    expect(screen.getByDisplayValue('Reflection journal')).toBeInTheDocument();
    expect(
      screen.getByDisplayValue('Share updates after sessions')
    ).toBeInTheDocument();
    expect(
      screen.getByDisplayValue('44444444-4444-4444-8444-444444444444')
    ).toBeInTheDocument();
  });
});
