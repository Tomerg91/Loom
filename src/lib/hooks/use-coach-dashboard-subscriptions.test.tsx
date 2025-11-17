// src/lib/hooks/use-coach-dashboard-subscriptions.test.ts
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import * as coachSubscriptions from "@/lib/realtime/coach-subscriptions";
import type { CoachEvent } from "@/lib/realtime/coach-subscriptions";

import { useCoachDashboardSubscriptions } from "./use-coach-dashboard-subscriptions";

vi.mock("@/lib/realtime/coach-subscriptions");

describe("useCoachDashboardSubscriptions", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    // Create actual QueryClient for testing
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    vi.mocked(coachSubscriptions.subscribeToSessions).mockReturnValue(vi.fn());
    vi.mocked(coachSubscriptions.subscribeToSessionFeedback).mockReturnValue(
      vi.fn()
    );
    vi.mocked(coachSubscriptions.subscribeToSessionRatings).mockReturnValue(
      vi.fn()
    );
    vi.mocked(coachSubscriptions.subscribeToClientUpdates).mockReturnValue(
      vi.fn()
    );
    vi.mocked(coachSubscriptions.subscribeToGoalUpdates).mockReturnValue(
      vi.fn()
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize all 5 subscriptions", () => {
    renderHook(() => useCoachDashboardSubscriptions("coach-123"), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    });

    expect(
      vi.mocked(coachSubscriptions.subscribeToSessions)
    ).toHaveBeenCalledWith("coach-123", expect.any(Function));
    expect(
      vi.mocked(coachSubscriptions.subscribeToSessionFeedback)
    ).toHaveBeenCalledWith("coach-123", expect.any(Function));
    expect(
      vi.mocked(coachSubscriptions.subscribeToSessionRatings)
    ).toHaveBeenCalledWith("coach-123", expect.any(Function));
    expect(
      vi.mocked(coachSubscriptions.subscribeToClientUpdates)
    ).toHaveBeenCalledWith("coach-123", expect.any(Function));
    expect(
      vi.mocked(coachSubscriptions.subscribeToGoalUpdates)
    ).toHaveBeenCalledWith("coach-123", expect.any(Function));
  });

  it("should return connection status and subscriptions array", () => {
    const { result } = renderHook(
      () => useCoachDashboardSubscriptions("coach-123"),
      {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        ),
      }
    );

    expect(result.current).toHaveProperty("isConnected");
    expect(result.current).toHaveProperty("connectionStatus");
    expect(result.current).toHaveProperty("subscriptions");
    expect(Array.isArray(result.current.subscriptions)).toBe(true);
  });

  it("should invalidate coach-stats and coach-activity on session changes", () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    renderHook(() => useCoachDashboardSubscriptions("coach-123"), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    });

    // Simulate session change event
    const sessionHandler = vi.mocked(
      coachSubscriptions.subscribeToSessions
    ).mock.calls[0][1];
    sessionHandler({
      eventType: "INSERT",
      new: { id: "session-1" },
      table: "sessions",
    } as CoachEvent);

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["coach-stats"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["coach-activity"],
    });
  });

  it("should invalidate coach-insights on feedback changes", () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    renderHook(() => useCoachDashboardSubscriptions("coach-123"), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    });

    // Simulate feedback change event
    const feedbackHandler = vi.mocked(
      coachSubscriptions.subscribeToSessionFeedback
    ).mock.calls[0][1];
    feedbackHandler({
      eventType: "INSERT",
      new: { id: "feedback-1" },
      table: "session_feedback",
    } as CoachEvent);

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["coach-insights"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["coach-stats"],
    });
  });

  it("should clean up subscriptions on unmount", () => {
    const mockUnsubscribe = vi.fn();
    vi.mocked(coachSubscriptions.subscribeToSessions).mockReturnValue(
      mockUnsubscribe
    );

    const { unmount } = renderHook(
      () => useCoachDashboardSubscriptions("coach-123"),
      {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        ),
      }
    );

    unmount();

    // At least one subscription should be cleaned up
    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
