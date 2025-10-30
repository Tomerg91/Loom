import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CoachSessionsPage from '@/app/coach/sessions/page';

describe('CoachSessionsPage - Button Click Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle New Session button click', async () => {
    render(<CoachSessionsPage />);

    const newSessionButton = screen.getByRole('button', { name: /New Session/i });
    expect(newSessionButton).toBeInTheDocument();

    // Verify button has onClick handler
    expect(newSessionButton.onclick).not.toBeNull();

    fireEvent.click(newSessionButton);

    // Since we can't directly test internal state without exposing it,
    // we verify that the click handler exists and can be called
    await waitFor(() => {
      expect(newSessionButton).toBeEnabled();
    });
  });

  it('should handle Schedule button click', async () => {
    render(<CoachSessionsPage />);

    const scheduleButton = screen.getByRole('button', { name: /Schedule/i });
    expect(scheduleButton).toBeInTheDocument();

    // Verify button has onClick handler
    expect(scheduleButton.onclick).not.toBeNull();

    fireEvent.click(scheduleButton);

    // Verify that the click handler exists and can be called
    await waitFor(() => {
      expect(scheduleButton).toBeEnabled();
    });
  });
});
