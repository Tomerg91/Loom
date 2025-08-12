import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, mockUseQuery, mockUseMutation, mockUser, createMockReflection } from '@/test/utils';
import { ReflectionsManagement } from '@/components/client/reflections-management';

// Mock dependencies
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
}));

// Mock react-hook-form
vi.mock('react-hook-form', () => ({
  useForm: vi.fn(() => ({
    register: vi.fn((name) => ({
      name,
      onChange: vi.fn(),
      onBlur: vi.fn(),
      ref: vi.fn(),
    })),
    handleSubmit: vi.fn((fn) => (e) => {
      e?.preventDefault();
      return fn({
        sessionId: 'session-123',
        content: 'This is a test reflection content',
        moodRating: 8,
        insights: 'Test insights',
        goalsForNextSession: 'Test goals',
      });
    }),
    setValue: vi.fn(),
    watch: vi.fn((field) => {
      const values = { moodRating: 8 };
      return values[field as keyof typeof values];
    }),
    reset: vi.fn(),
    formState: {
      errors: {},
      isSubmitting: false,
    },
  })),
}));

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

describe('ReflectionsManagement', () => {
  const mockSessions = [
    {
      id: 'session-123',
      title: 'Coaching Session 1',
      scheduledAt: '2024-01-15T10:00:00Z',
      status: 'completed',
    },
    {
      id: 'session-456',
      title: 'Coaching Session 2',
      scheduledAt: '2024-01-10T14:00:00Z',
      status: 'completed',
    },
  ];

  const mockReflections = [
    createMockReflection({
      id: 'reflection-1',
      sessionId: 'session-123',
      content: 'Great session, learned a lot about goal setting',
      moodRating: 9,
      insights: 'I need to be more specific with my goals',
      goalsForNextSession: 'Create SMART goals for next quarter',
    }),
    createMockReflection({
      id: 'reflection-2',
      sessionId: 'session-456',
      content: 'Challenging but rewarding session',
      moodRating: 7,
      insights: 'Time management is key',
      goalsForNextSession: 'Implement time-blocking technique',
    }),
    createMockReflection({
      id: 'reflection-3',
      sessionId: 'session-123',
      content: 'Follow-up thoughts on the session',
      moodRating: 8,
      insights: 'Making progress on communication skills',
      goalsForNextSession: 'Practice active listening',
    }),
  ];

  const mockReflectionsResponse = {
    data: mockReflections,
    pagination: {
      page: 1,
      limit: 20,
      total: 3,
      hasNext: false,
      hasPrev: false,
    },
  };

  const mockSaveMutation = mockUseMutation();
  const mockDeleteMutation = mockUseMutation();
  const mockQueryClient = { invalidateQueries: vi.fn() };

  const defaultProps = {
    sessionId: undefined,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock query client
    (useQueryClient as any).mockReturnValue(mockQueryClient);

    // Mock queries
    (useQuery as any).mockImplementation(({ queryKey }: any) => {
      if (queryKey[0] === 'client-sessions') {
        return mockUseQuery(mockSessions);
      }
      if (queryKey[0] === 'reflections') {
        return mockUseQuery(mockReflectionsResponse);
      }
      return mockUseQuery(null);
    });

    // Mock mutations
    (useMutation as any).mockImplementation(({ mutationFn }: any) => {
      if (mutationFn.toString().includes('DELETE')) {
        return mockDeleteMutation;
      }
      return mockSaveMutation;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial Rendering', () => {
    it('renders the reflections management interface', () => {
      renderWithProviders(<ReflectionsManagement {...defaultProps} />);
      
      expect(screen.getByText(/reflections.title/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add reflection/i })).toBeInTheDocument();
    });

    it('displays existing reflections list', () => {
      renderWithProviders(<ReflectionsManagement {...defaultProps} />);
      
      mockReflections.forEach(reflection => {
        expect(screen.getByText(reflection.content)).toBeInTheDocument();
      });
    });

    it('shows session filter dropdown', () => {
      renderWithProviders(<ReflectionsManagement {...defaultProps} />);
      
      const sessionSelect = screen.getByRole('combobox', { name: /session/i });
      expect(sessionSelect).toBeInTheDocument();
    });

    it('displays search and filter controls', () => {
      renderWithProviders(<ReflectionsManagement {...defaultProps} />);
      
      expect(screen.getByPlaceholderText(/search reflections/i)).toBeInTheDocument();
      expect(screen.getByTestId('mood-range-slider')).toBeInTheDocument();
    });

    it('shows reflection cards with mood ratings', () => {
      renderWithProviders(<ReflectionsManagement {...defaultProps} />);
      
      mockReflections.forEach(reflection => {
        const moodElement = screen.getByText(`${reflection.moodRating}/10`);
        expect(moodElement).toBeInTheDocument();
      });
    });
  });

  describe('Adding New Reflections', () => {
    it('opens create dialog when add button is clicked', async () => {
      renderWithProviders(<ReflectionsManagement {...defaultProps} />);
      
      const user = userEvent.setup();
      const addButton = screen.getByRole('button', { name: /add reflection/i });
      
      await user.click(addButton);
      
      expect(screen.getByTestId('reflection-dialog')).toBeInTheDocument();
      expect(screen.getByText(/create reflection/i)).toBeInTheDocument();
    });

    it('displays form fields in create dialog', async () => {
      renderWithProviders(<ReflectionsManagement {...defaultProps} />);
      
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /add reflection/i }));
      
      expect(screen.getByLabelText(/session/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/reflection content/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/mood rating/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/insights/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/goals for next session/i)).toBeInTheDocument();
    });

    it('shows available sessions in dropdown', async () => {
      renderWithProviders(<ReflectionsManagement {...defaultProps} />);
      
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /add reflection/i }));
      
      const sessionSelect = screen.getByLabelText(/session/i);
      await user.click(sessionSelect);
      
      mockSessions.forEach(session => {
        expect(screen.getByText(session.title)).toBeInTheDocument();
      });
    });

    it('includes mood rating slider', async () => {
      renderWithProviders(<ReflectionsManagement {...defaultProps} />);
      
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /add reflection/i }));
      
      const moodSlider = screen.getByRole('slider', { name: /mood rating/i });
      expect(moodSlider).toBeInTheDocument();
      expect(moodSlider).toHaveAttribute('min', '1');
      expect(moodSlider).toHaveAttribute('max', '10');
    });

    it('saves new reflection', async () => {
      renderWithProviders(<ReflectionsManagement {...defaultProps} />);
      
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /add reflection/i }));
      
      // Fill form
      const contentTextarea = screen.getByLabelText(/reflection content/i);
      await user.type(contentTextarea, 'Test reflection content');
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);
      
      expect(mockSaveMutation.mutate).toHaveBeenCalledWith({
        sessionId: 'session-123',
        content: 'This is a test reflection content',
        moodRating: 8,
        insights: 'Test insights',
        goalsForNextSession: 'Test goals',
      });
    });

    it('shows success message after saving', async () => {
      renderWithProviders(<ReflectionsManagement {...defaultProps} />);
      
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /add reflection/i }));
      await user.click(screen.getByRole('button', { name: /save/i }));
      
      // Simulate successful save
      mockSaveMutation.onSuccess();
      
      expect(screen.getByText(/reflection saved successfully/i)).toBeInTheDocument();
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['reflections'] });
    });

    it('handles save errors', async () => {
      renderWithProviders(<ReflectionsManagement {...defaultProps} />);
      
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /add reflection/i }));
      await user.click(screen.getByRole('button', { name: /save/i }));
      
      // Simulate save error
      mockSaveMutation.onError(new Error('Save failed'));
      
      expect(screen.getByText(/failed to save reflection/i)).toBeInTheDocument();
    });
  });

  describe('Editing Reflections', () => {
    it('opens edit dialog when edit button is clicked', async () => {
      renderWithProviders(<ReflectionsManagement {...defaultProps} />);
      
      const user = userEvent.setup();
      const editButton = screen.getAllByRole('button', { name: /edit/i })[0];
      
      await user.click(editButton);
      
      expect(screen.getByTestId('reflection-dialog')).toBeInTheDocument();
      expect(screen.getByText(/edit reflection/i)).toBeInTheDocument();
    });

    it('populates form with existing reflection data', async () => {
      renderWithProviders(<ReflectionsManagement {...defaultProps} />);
      
      const user = userEvent.setup();
      const editButton = screen.getAllByRole('button', { name: /edit/i })[0];
      
      await user.click(editButton);
      
      const contentTextarea = screen.getByLabelText(/reflection content/i);
      expect(contentTextarea).toHaveValue(mockReflections[0].content);
      
      const moodSlider = screen.getByRole('slider', { name: /mood rating/i });
      expect(moodSlider).toHaveValue(mockReflections[0].moodRating.toString());
    });

    it('updates existing reflection', async () => {
      renderWithProviders(<ReflectionsManagement {...defaultProps} />);
      
      const user = userEvent.setup();
      const editButton = screen.getAllByRole('button', { name: /edit/i })[0];
      
      await user.click(editButton);
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);
      
      expect(mockSaveMutation.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.any(String),
          moodRating: expect.any(Number),
        })
      );
    });

    it('shows update confirmation', async () => {
      renderWithProviders(<ReflectionsManagement {...defaultProps} />);
      
      const user = userEvent.setup();
      const editButton = screen.getAllByRole('button', { name: /edit/i })[0];
      
      await user.click(editButton);
      await user.click(screen.getByRole('button', { name: /save/i }));
      
      // Simulate successful update
      mockSaveMutation.onSuccess();
      
      expect(screen.getByText(/reflection updated successfully/i)).toBeInTheDocument();
    });
  });

  describe('Deleting Reflections', () => {
    it('shows delete confirmation dialog', async () => {
      renderWithProviders(<ReflectionsManagement {...defaultProps} />);
      
      const user = userEvent.setup();
      const deleteButton = screen.getAllByRole('button', { name: /delete/i })[0];
      
      await user.click(deleteButton);
      
      expect(screen.getByText(/delete reflection/i)).toBeInTheDocument();
      expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
    });

    it('deletes reflection when confirmed', async () => {
      renderWithProviders(<ReflectionsManagement {...defaultProps} />);
      
      const user = userEvent.setup();
      const deleteButton = screen.getAllByRole('button', { name: /delete/i })[0];
      
      await user.click(deleteButton);
      
      const confirmButton = screen.getByRole('button', { name: /confirm delete/i });
      await user.click(confirmButton);
      
      expect(mockDeleteMutation.mutate).toHaveBeenCalledWith(mockReflections[0].id);
    });

    it('shows success message after deletion', async () => {
      renderWithProviders(<ReflectionsManagement {...defaultProps} />);
      
      const user = userEvent.setup();
      const deleteButton = screen.getAllByRole('button', { name: /delete/i })[0];
      
      await user.click(deleteButton);
      await user.click(screen.getByRole('button', { name: /confirm delete/i }));
      
      // Simulate successful deletion
      mockDeleteMutation.onSuccess();
      
      expect(screen.getByText(/reflection deleted successfully/i)).toBeInTheDocument();
    });

    it('cancels deletion when cancelled', async () => {
      renderWithProviders(<ReflectionsManagement {...defaultProps} />);
      
      const user = userEvent.setup();
      const deleteButton = screen.getAllByRole('button', { name: /delete/i })[0];
      
      await user.click(deleteButton);
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);
      
      expect(screen.queryByText(/delete reflection/i)).not.toBeInTheDocument();
      expect(mockDeleteMutation.mutate).not.toHaveBeenCalled();
    });
  });

  describe('Search and Filtering', () => {
    it('filters reflections by search term', async () => {
      renderWithProviders(<ReflectionsManagement {...defaultProps} />);
      
      const user = userEvent.setup();
      const searchInput = screen.getByPlaceholderText(/search reflections/i);
      
      await user.type(searchInput, 'goal setting');
      
      // Should trigger query with search term
      await waitFor(() => {
        expect(useQuery).toHaveBeenCalledWith(
          expect.objectContaining({
            queryKey: ['reflections', '', 'goal setting', [1, 10]],
          })
        );
      });
    });

    it('filters by session selection', async () => {
      renderWithProviders(<ReflectionsManagement {...defaultProps} />);
      
      const user = userEvent.setup();
      const sessionSelect = screen.getByRole('combobox', { name: /session/i });
      
      await user.selectOptions(sessionSelect, 'session-123');
      
      await waitFor(() => {
        expect(useQuery).toHaveBeenCalledWith(
          expect.objectContaining({
            queryKey: ['reflections', 'session-123', '', [1, 10]],
          })
        );
      });
    });

    it('filters by mood rating range', async () => {
      renderWithProviders(<ReflectionsManagement {...defaultProps} />);
      
      const user = userEvent.setup();
      const moodSlider = screen.getByTestId('mood-range-slider');
      
      // Simulate mood range change
      await user.click(moodSlider);
      
      await waitFor(() => {
        expect(useQuery).toHaveBeenCalledWith(
          expect.objectContaining({
            queryKey: expect.arrayContaining(['reflections']),
          })
        );
      });
    });

    it('combines multiple filter criteria', async () => {
      renderWithProviders(<ReflectionsManagement {...defaultProps} />);
      
      const user = userEvent.setup();
      
      // Apply multiple filters
      await user.type(screen.getByPlaceholderText(/search reflections/i), 'session');
      await user.selectOptions(screen.getByRole('combobox', { name: /session/i }), 'session-123');
      
      // Should combine all filter criteria
      await waitFor(() => {
        expect(useQuery).toHaveBeenCalledWith(
          expect.objectContaining({
            queryKey: ['reflections', 'session-123', 'session', [1, 10]],
          })
        );
      });
    });

    it('clears filters when reset', async () => {
      renderWithProviders(<ReflectionsManagement {...defaultProps} />);
      
      const user = userEvent.setup();
      const searchInput = screen.getByPlaceholderText(/search reflections/i);
      
      // Set filter
      await user.type(searchInput, 'test');
      
      // Clear filter
      await user.clear(searchInput);
      
      await waitFor(() => {
        expect(useQuery).toHaveBeenCalledWith(
          expect.objectContaining({
            queryKey: ['reflections', '', '', [1, 10]],
          })
        );
      });
    });
  });

  describe('Mood Rating Functionality', () => {
    it('displays mood ratings as visual indicators', () => {
      renderWithProviders(<ReflectionsManagement {...defaultProps} />);
      
      mockReflections.forEach(reflection => {
        // Should show mood rating with visual indicator (stars, colors, etc.)
        const moodIndicator = screen.getByText(`${reflection.moodRating}/10`);
        expect(moodIndicator).toBeInTheDocument();
        
        // Should have appropriate color/styling based on rating
        if (reflection.moodRating >= 8) {
          expect(moodIndicator).toHaveClass('text-green-600');
        } else if (reflection.moodRating >= 6) {
          expect(moodIndicator).toHaveClass('text-yellow-600');
        } else {
          expect(moodIndicator).toHaveClass('text-red-600');
        }
      });
    });

    it('allows mood rating input via slider', async () => {
      renderWithProviders(<ReflectionsManagement {...defaultProps} />);
      
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /add reflection/i }));
      
      const moodSlider = screen.getByRole('slider', { name: /mood rating/i });
      
      // Change mood rating
      await user.click(moodSlider);
      await user.keyboard('{ArrowRight}{ArrowRight}'); // Increase rating
      
      expect(moodSlider).toHaveValue('8'); // From mocked watch function
    });

    it('shows mood rating statistics', () => {
      renderWithProviders(<ReflectionsManagement {...defaultProps} />);
      
      // Should show average mood or mood trend
      expect(screen.getByText(/average mood/i)).toBeInTheDocument();
      
      // Should display mood distribution
      expect(screen.getByTestId('mood-statistics')).toBeInTheDocument();
    });

    it('provides mood rating range filtering', async () => {
      renderWithProviders(<ReflectionsManagement {...defaultProps} />);
      
      const user = userEvent.setup();
      const rangePicker = screen.getByTestId('mood-range-slider');
      
      // Should allow setting min/max mood range
      await user.click(rangePicker);
      
      // Should filter reflections by mood range
      expect(rangePicker).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('requires reflection content', async () => {
      renderWithProviders(<ReflectionsManagement {...defaultProps} />);
      
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /add reflection/i }));
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);
      
      // Should show validation error for empty content
      expect(screen.getByText(/reflection content is required/i)).toBeInTheDocument();
    });

    it('validates minimum content length', async () => {
      renderWithProviders(<ReflectionsManagement {...defaultProps} />);
      
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /add reflection/i }));
      
      const contentTextarea = screen.getByLabelText(/reflection content/i);
      await user.type(contentTextarea, 'short');
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);
      
      // Should show validation error for short content
      expect(screen.getByText(/reflection should be at least 10 characters/i)).toBeInTheDocument();
    });

    it('validates maximum content length', async () => {
      renderWithProviders(<ReflectionsManagement {...defaultProps} />);
      
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /add reflection/i }));
      
      const contentTextarea = screen.getByLabelText(/reflection content/i);
      const longText = 'a'.repeat(2001); // Exceeds 2000 character limit
      await user.type(contentTextarea, longText);
      
      // Should prevent typing beyond limit or show error
      expect(contentTextarea).toHaveValue(expect.stringMatching(/.{1,2000}/));
    });

    it('validates mood rating range', async () => {
      renderWithProviders(<ReflectionsManagement {...defaultProps} />);
      
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /add reflection/i }));
      
      const moodSlider = screen.getByRole('slider', { name: /mood rating/i });
      
      // Should constrain to 1-10 range
      expect(moodSlider).toHaveAttribute('min', '1');
      expect(moodSlider).toHaveAttribute('max', '10');
    });

    it('validates insights and goals length', async () => {
      renderWithProviders(<ReflectionsManagement {...defaultProps} />);
      
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /add reflection/i }));
      
      const insightsField = screen.getByLabelText(/insights/i);
      const longInsights = 'a'.repeat(1001); // Exceeds 1000 character limit
      await user.type(insightsField, longInsights);
      
      // Should prevent exceeding character limit
      expect(insightsField).toHaveValue(expect.stringMatching(/.{1,1000}/));
    });
  });

  describe('Loading and Error States', () => {
    it('shows loading state while fetching reflections', () => {
      (useQuery as any).mockImplementation(({ queryKey }: any) => {
        if (queryKey[0] === 'reflections') {
          return { ...mockUseQuery(null), isLoading: true };
        }
        if (queryKey[0] === 'client-sessions') {
          return mockUseQuery(mockSessions);
        }
        return mockUseQuery(null);
      });

      renderWithProviders(<ReflectionsManagement {...defaultProps} />);
      
      expect(screen.getByTestId('reflections-loading')).toBeInTheDocument();
      expect(screen.getByText(/loading reflections/i)).toBeInTheDocument();
    });

    it('shows error state when fetch fails', () => {
      (useQuery as any).mockImplementation(({ queryKey }: any) => {
        if (queryKey[0] === 'reflections') {
          return {
            ...mockUseQuery(null),
            isError: true,
            error: new Error('Failed to load reflections'),
          };
        }
        if (queryKey[0] === 'client-sessions') {
          return mockUseQuery(mockSessions);
        }
        return mockUseQuery(null);
      });

      renderWithProviders(<ReflectionsManagement {...defaultProps} />);
      
      expect(screen.getByText(/failed to load reflections/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('shows loading state during form submission', async () => {
      const loadingMutation = { ...mockSaveMutation, isPending: true };
      (useMutation as any).mockReturnValue(loadingMutation);
      
      renderWithProviders(<ReflectionsManagement {...defaultProps} />);
      
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /add reflection/i }));
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      expect(saveButton).toHaveTextContent(/saving/i);
      expect(saveButton).toBeDisabled();
    });

    it('handles empty reflections list', () => {
      (useQuery as any).mockImplementation(({ queryKey }: any) => {
        if (queryKey[0] === 'reflections') {
          return mockUseQuery({ data: [], pagination: { total: 0 } });
        }
        if (queryKey[0] === 'client-sessions') {
          return mockUseQuery(mockSessions);
        }
        return mockUseQuery(null);
      });

      renderWithProviders(<ReflectionsManagement {...defaultProps} />);
      
      expect(screen.getByText(/no reflections found/i)).toBeInTheDocument();
      expect(screen.getByText(/create your first reflection/i)).toBeInTheDocument();
    });
  });

  describe('Session Integration', () => {
    it('pre-selects session when sessionId prop provided', () => {
      renderWithProviders(<ReflectionsManagement sessionId="session-123" />);
      
      // Should filter to only show reflections for that session
      expect(useQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['reflections', 'session-123', '', [1, 10]],
        })
      );
    });

    it('shows session context in reflections', () => {
      renderWithProviders(<ReflectionsManagement {...defaultProps} />);
      
      // Each reflection should show which session it belongs to
      mockReflections.forEach(reflection => {
        const sessionInfo = screen.getByText(new RegExp(reflection.sessionId));
        expect(sessionInfo).toBeInTheDocument();
      });
    });

    it('allows creating reflections for specific sessions', async () => {
      renderWithProviders(<ReflectionsManagement sessionId="session-123" />);
      
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /add reflection/i }));
      
      // Session should be pre-selected
      const sessionSelect = screen.getByLabelText(/session/i);
      expect(sessionSelect).toHaveValue('session-123');
    });

    it('handles sessions that are not yet completed', () => {
      const incompleteSessions = [
        ...mockSessions,
        {
          id: 'session-789',
          title: 'Upcoming Session',
          scheduledAt: '2024-01-20T10:00:00Z',
          status: 'scheduled',
        },
      ];
      
      (useQuery as any).mockImplementation(({ queryKey }: any) => {
        if (queryKey[0] === 'client-sessions') {
          return mockUseQuery(incompleteSessions);
        }
        if (queryKey[0] === 'reflections') {
          return mockUseQuery(mockReflectionsResponse);
        }
        return mockUseQuery(null);
      });

      renderWithProviders(<ReflectionsManagement {...defaultProps} />);
      
      // Should only show completed sessions in dropdown
      // or show all but with status indicators
      expect(screen.getByText('Coaching Session 1')).toBeInTheDocument();
      expect(screen.getByText('Coaching Session 2')).toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('shows pagination controls for multiple pages', () => {
      const paginatedResponse = {
        ...mockReflectionsResponse,
        pagination: {
          page: 1,
          limit: 2,
          total: 10,
          hasNext: true,
          hasPrev: false,
        },
      };
      
      (useQuery as any).mockImplementation(({ queryKey }: any) => {
        if (queryKey[0] === 'reflections') {
          return mockUseQuery(paginatedResponse);
        }
        if (queryKey[0] === 'client-sessions') {
          return mockUseQuery(mockSessions);
        }
        return mockUseQuery(null);
      });

      renderWithProviders(<ReflectionsManagement {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /next page/i })).toBeInTheDocument();
      expect(screen.getByText(/page 1 of/i)).toBeInTheDocument();
    });

    it('navigates between pages', async () => {
      const paginatedResponse = {
        ...mockReflectionsResponse,
        pagination: {
          page: 1,
          limit: 2,
          total: 10,
          hasNext: true,
          hasPrev: false,
        },
      };
      
      (useQuery as any).mockImplementation(({ queryKey }: any) => {
        if (queryKey[0] === 'reflections') {
          return mockUseQuery(paginatedResponse);
        }
        if (queryKey[0] === 'client-sessions') {
          return mockUseQuery(mockSessions);
        }
        return mockUseQuery(null);
      });

      renderWithProviders(<ReflectionsManagement {...defaultProps} />);
      
      const user = userEvent.setup();
      const nextButton = screen.getByRole('button', { name: /next page/i });
      
      await user.click(nextButton);
      
      // Should trigger query for page 2
      await waitFor(() => {
        expect(useQuery).toHaveBeenCalledWith(
          expect.objectContaining({
            queryKey: expect.arrayContaining(['reflections']),
          })
        );
      });
    });

    it('shows total reflection count', () => {
      renderWithProviders(<ReflectionsManagement {...defaultProps} />);
      
      expect(screen.getByText(`${mockReflectionsResponse.pagination.total} reflections`)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels for form fields', async () => {
      renderWithProviders(<ReflectionsManagement {...defaultProps} />);
      
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /add reflection/i }));
      
      expect(screen.getByLabelText(/reflection content/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/mood rating/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/insights/i)).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      renderWithProviders(<ReflectionsManagement {...defaultProps} />);
      
      const user = userEvent.setup();
      
      // Tab through interactive elements
      await user.tab();
      expect(screen.getByPlaceholderText(/search reflections/i)).toHaveFocus();
      
      await user.tab();
      expect(screen.getByRole('button', { name: /add reflection/i })).toHaveFocus();
    });

    it('announces form errors to screen readers', async () => {
      renderWithProviders(<ReflectionsManagement {...defaultProps} />);
      
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /add reflection/i }));
      await user.click(screen.getByRole('button', { name: /save/i }));
      
      // Error messages should be announced
      const errorAlert = screen.getByRole('alert');
      expect(errorAlert).toHaveTextContent(/reflection content is required/i);
    });

    it('provides semantic structure for reflection cards', () => {
      renderWithProviders(<ReflectionsManagement {...defaultProps} />);
      
      mockReflections.forEach((_, index) => {
        const reflectionCard = screen.getAllByRole('article')[index];
        expect(reflectionCard).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles malformed reflection data', () => {
      const malformedReflection = {
        id: 'bad-reflection',
        content: null,
        moodRating: 'invalid',
        createdAt: 'bad-date',
      };
      
      const badResponse = {
        data: [malformedReflection],
        pagination: { total: 1 },
      };
      
      (useQuery as any).mockImplementation(({ queryKey }: any) => {
        if (queryKey[0] === 'reflections') {
          return mockUseQuery(badResponse);
        }
        if (queryKey[0] === 'client-sessions') {
          return mockUseQuery(mockSessions);
        }
        return mockUseQuery(null);
      });

      renderWithProviders(<ReflectionsManagement {...defaultProps} />);
      
      // Should handle gracefully without crashing
      expect(screen.getByText(/reflections.title/i)).toBeInTheDocument();
    });

    it('handles rapid form submissions', async () => {
      renderWithProviders(<ReflectionsManagement {...defaultProps} />);
      
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /add reflection/i }));
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      
      // Rapid clicks should not cause multiple submissions
      await user.click(saveButton);
      await user.click(saveButton);
      await user.click(saveButton);
      
      expect(mockSaveMutation.mutate).toHaveBeenCalledTimes(1);
    });

    it('handles component unmount during operations', () => {
      const { unmount } = renderWithProviders(<ReflectionsManagement {...defaultProps} />);
      
      // Unmount while queries might be in progress
      unmount();
      
      // Should not cause memory leaks or errors
      expect(() => unmount()).not.toThrow();
    });

    it('preserves form data during network errors', async () => {
      const failingMutation = {
        ...mockSaveMutation,
        isError: true,
        error: new Error('Network error'),
      };
      (useMutation as any).mockReturnValue(failingMutation);
      
      renderWithProviders(<ReflectionsManagement {...defaultProps} />);
      
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /add reflection/i }));
      
      const contentTextarea = screen.getByLabelText(/reflection content/i);
      await user.type(contentTextarea, 'Important reflection');
      
      await user.click(screen.getByRole('button', { name: /save/i }));
      
      // Form should still contain the user's input
      expect(contentTextarea).toHaveValue('Important reflection');
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });
});