import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { renderWithProviders, mockUseQuery, mockUseMutation, mockCoachUser } from '@/test/utils';
import { SessionBookingForm } from '@/components/sessions/booking';

vi.mock('@/lib/store/auth-store', () => ({
  useUser: vi.fn(() => ({
    id: 'test-client-id',
    role: 'client',
  })),
}));

describe('SessionBookingForm', () => {
  const mockCoaches = [
    {
      ...mockCoachUser,
      id: 'coach-1',
      firstName: 'John',
      lastName: 'Coach',
    },
    {
      ...mockCoachUser,
      id: 'coach-2', 
      firstName: 'Jane',
      lastName: 'Mentor',
    },
  ];

  const mockTimeSlots = [
    {
      id: 'slot-1',
      coachId: 'coach-1',
      date: '2024-01-15',
      startTime: '09:00',
      endTime: '10:00',
      isAvailable: true,
    },
    {
      id: 'slot-2',
      coachId: 'coach-1',
      date: '2024-01-15',
      startTime: '10:00',
      endTime: '11:00',
      isAvailable: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock coaches query
    (vi.mocked(useQuery))
      .mockImplementationOnce(() => mockUseQuery(mockCoaches))
      // Mock time slots query  
      .mockImplementationOnce(() => mockUseQuery(mockTimeSlots));
    
    (vi.mocked(useMutation)).mockReturnValue(
      mockUseMutation(null, {
        mutate: vi.fn(),
        isPending: false,
        isError: false,
        error: null,
      }) as ReturnType<typeof useMutation>
    );
  });

  it('renders booking form correctly', () => {
    renderWithProviders(<SessionBookingForm />);
    
    expect(screen.getByText(/book a session/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/coach/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/session type/i)).toBeInTheDocument();
  });

  it('loads and displays coaches in select', async () => {
    renderWithProviders(<SessionBookingForm />);
    
    const coachSelect = screen.getByLabelText(/coach/i);
    fireEvent.click(coachSelect);
    
    await waitFor(() => {
      expect(screen.getByText('John Coach')).toBeInTheDocument();
      expect(screen.getByText('Jane Mentor')).toBeInTheDocument();
    });
  });

  it('shows time slots when coach is selected', async () => {
    renderWithProviders(<SessionBookingForm />);
    
    const coachSelect = screen.getByLabelText(/coach/i);
    fireEvent.click(coachSelect);
    
    await waitFor(() => {
      const johnCoach = screen.getByText('John Coach');
      fireEvent.click(johnCoach);
    });
    
    await waitFor(() => {
      expect(screen.getByText('09:00 - 10:00')).toBeInTheDocument();
      expect(screen.getByText('10:00 - 11:00')).toBeInTheDocument();
    });
  });

  it('validates required fields', async () => {
    renderWithProviders(<SessionBookingForm />);
    
    const submitButton = screen.getByRole('button', { name: /book session/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
      expect(screen.getByText(/coach selection is required/i)).toBeInTheDocument();
      expect(screen.getByText(/time slot selection is required/i)).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    const mockMutate = vi.fn();
    (vi.mocked(useMutation)).mockReturnValue(
      mockUseMutation(null, {
        mutate: mockMutate,
        isPending: false,
        isError: false,
        error: null,
      }) as ReturnType<typeof useMutation>
    );
    
    renderWithProviders(<SessionBookingForm />);
    
    // Fill out form
    const titleInput = screen.getByLabelText(/title/i);
    fireEvent.change(titleInput, { target: { value: 'Test Session' } });
    
    const descriptionInput = screen.getByLabelText(/description/i);
    fireEvent.change(descriptionInput, { target: { value: 'Test description' } });
    
    // Select coach
    const coachSelect = screen.getByLabelText(/coach/i);
    fireEvent.click(coachSelect);
    
    await waitFor(() => {
      const johnCoach = screen.getByText('John Coach');
      fireEvent.click(johnCoach);
    });
    
    // Select time slot
    await waitFor(() => {
      const timeSlot = screen.getByText('09:00 - 10:00');
      fireEvent.click(timeSlot);
    });
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /book session/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith({
        title: 'Test Session',
        description: 'Test description',
        coachId: 'coach-1',
        timeSlotId: 'slot-1',
        type: 'individual',
        duration: 60,
      });
    });
  });

  it('shows loading state during submission', () => {
    (vi.mocked(useMutation)).mockReturnValue(
      mockUseMutation(null, {
        mutate: vi.fn(),
        isPending: true,
        isError: false,
        error: null,
      }) as ReturnType<typeof useMutation>
    );
    
    renderWithProviders(<SessionBookingForm />);
    
    const submitButton = screen.getByRole('button', { name: /booking/i });
    expect(submitButton).toBeDisabled();
  });

  it('shows error message on submission failure', () => {
    (vi.mocked(useMutation)).mockReturnValue(
      mockUseMutation(null, {
        mutate: vi.fn(),
        isPending: false,
        isError: true,
        error: new Error('Failed to book session'),
      }) as ReturnType<typeof useMutation>
    );
    
    renderWithProviders(<SessionBookingForm />);
    
    expect(screen.getByText(/failed to book session/i)).toBeInTheDocument();
  });

  it('filters available time slots only', async () => {
    const slotsWithUnavailable = [
      ...mockTimeSlots,
      {
        id: 'slot-3',
        coachId: 'coach-1',
        date: '2024-01-15',
        startTime: '11:00',
        endTime: '12:00',
        isAvailable: false,
      },
    ];
    
    (vi.mocked(useQuery))
      .mockImplementationOnce(() => mockUseQuery(mockCoaches))
      .mockImplementationOnce(() => mockUseQuery(slotsWithUnavailable));
    
    renderWithProviders(<SessionBookingForm />);
    
    const coachSelect = screen.getByLabelText(/coach/i);
    fireEvent.click(coachSelect);
    
    await waitFor(() => {
      const johnCoach = screen.getByText('John Coach');
      fireEvent.click(johnCoach);
    });
    
    await waitFor(() => {
      expect(screen.getByText('09:00 - 10:00')).toBeInTheDocument();
      expect(screen.getByText('10:00 - 11:00')).toBeInTheDocument();
      expect(screen.queryByText('11:00 - 12:00')).not.toBeInTheDocument();
    });
  });
});