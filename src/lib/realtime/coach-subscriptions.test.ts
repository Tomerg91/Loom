// src/lib/realtime/coach-subscriptions.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the supabase client BEFORE importing the subscriptions
vi.mock('@/lib/supabase/client');

import { createClient } from '@/lib/supabase/client';
import {
  subscribeToSessions,
  subscribeToSessionFeedback,
  subscribeToSessionRatings,
  subscribeToClientUpdates,
  subscribeToGoalUpdates,
} from './coach-subscriptions';

describe('Coach Subscriptions', () => {
  let mockOn: ReturnType<typeof vi.fn>;
  let mockSubscribe: ReturnType<typeof vi.fn>;
  let mockRemoveChannel: ReturnType<typeof vi.fn>;
  let mockChannel: any;

  beforeEach(() => {
    mockSubscribe = vi.fn();
    mockOn = vi.fn();
    mockRemoveChannel = vi.fn();

    // Create a mock channel that supports method chaining
    mockChannel = {
      on: mockOn,
      subscribe: mockSubscribe,
    };

    // Make on() return the channel for chaining
    mockOn.mockReturnValue(mockChannel);

    // Make subscribe() return the channel for chaining
    mockSubscribe.mockReturnValue(mockChannel);

    const mockClient = {
      channel: vi.fn().mockReturnValue(mockChannel),
      removeChannel: mockRemoveChannel,
    };

    vi.mocked(createClient).mockReturnValue(mockClient as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('subscribeToSessions should subscribe to INSERT/UPDATE/DELETE on sessions table', () => {
    const coachId = 'coach-123';
    const onEvent = vi.fn();

    subscribeToSessions(coachId, onEvent);

    expect(mockOn).toHaveBeenCalledWith('postgres_changes', expect.any(Object), expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'sessions',
      filter: `coach_id=eq.${coachId}`,
    }, onEvent);
  });

  it('subscribeToSessionFeedback should subscribe to session_feedback table', () => {
    const coachId = 'coach-123';
    const onEvent = vi.fn();

    subscribeToSessionFeedback(coachId, onEvent);

    expect(mockOn).toHaveBeenCalledWith('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'session_feedback',
      filter: `coach_id=eq.${coachId}`,
    }, onEvent);
  });

  it('subscribeToSessionRatings should subscribe to session_ratings table', () => {
    const coachId = 'coach-123';
    const onEvent = vi.fn();

    subscribeToSessionRatings(coachId, onEvent);

    expect(mockOn).toHaveBeenCalledWith('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'session_ratings',
      filter: `coach_id=eq.${coachId}`,
    }, onEvent);
  });

  it('subscribeToClientUpdates should subscribe to users table', () => {
    const coachId = 'coach-123';
    const onEvent = vi.fn();

    subscribeToClientUpdates(coachId, onEvent);

    expect(mockOn).toHaveBeenCalledWith('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'users',
      filter: `coach_id=eq.${coachId}`,
    }, onEvent);
  });

  it('subscribeToGoalUpdates should subscribe to goals table', () => {
    const coachId = 'coach-123';
    const onEvent = vi.fn();

    subscribeToGoalUpdates(coachId, onEvent);

    expect(mockOn).toHaveBeenCalledWith('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'goals',
      filter: `coach_id=eq.${coachId}`,
    }, onEvent);
  });

  it('subscription callbacks should return unsubscribe function', () => {
    const coachId = 'coach-123';
    const onEvent = vi.fn();

    const unsubscribe = subscribeToSessions(coachId, onEvent);

    expect(typeof unsubscribe).toBe('function');

    // Call the unsubscribe function
    unsubscribe();

    // Verify it calls removeChannel with the channel
    expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannel);
  });
});
