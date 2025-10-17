import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { ScheduleSessionModal } from '@/modules/sessions/components/ScheduleSessionModal';
import type { SessionMutationResult } from '@/modules/sessions/types';

const createMutationMock = vi.fn();

vi.mock('@/modules/sessions/api/sessions', () => ({
  useCreateSessionRequest: () => ({
    mutateAsync: createMutationMock,
    isPending: false,
  }),
}));

const defaultMutationResult: SessionMutationResult = {
  success: true,
  session: undefined,
  request: undefined,
};

describe('ScheduleSessionModal', () => {
  beforeEach(() => {
    createMutationMock.mockReset();
    createMutationMock.mockResolvedValue(defaultMutationResult);
  });

  it('renders localized labels for the scheduling modal', () => {
    render(
      <ScheduleSessionModal
        open
        onOpenChange={() => undefined}
        actorRole="client"
        coachId="coach-123"
        defaultValues={{
          clientId: 'client-456',
          coachId: 'coach-123',
          scheduledAt: '2025-02-11T09:00:00.000Z',
        }}
      />
    );

    expect(screen.getByText('Schedule a session')).toBeInTheDocument();
    expect(screen.getByLabelText('Session title')).toBeInTheDocument();
    expect(screen.getByLabelText('Timezone')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Submit request' })
    ).toBeInTheDocument();
  });

  it('prevents submission when coach identifier is missing', async () => {
    const user = userEvent.setup();
    createMutationMock.mockResolvedValue(defaultMutationResult);

    render(
      <ScheduleSessionModal
        open
        onOpenChange={() => undefined}
        actorRole="coach"
        clientOptions={[]}
        defaultValues={{
          clientId: 'client-999',
          scheduledAt: '2025-02-11T09:00:00.000Z',
        }}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Schedule session' }));
    await waitFor(() => expect(createMutationMock).not.toHaveBeenCalled());
  });
});
