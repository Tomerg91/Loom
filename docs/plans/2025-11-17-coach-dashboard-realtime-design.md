# Coach Dashboard Realtime Data - Design Document

**Date**: 2025-11-17
**Status**: Approved
**Approach**: Hybrid Smart Invalidation

## Problem Statement

Coach dashboard currently uses polling to refresh data every 5 minutes, resulting in stale data and unnecessary API load. Realtime infrastructure exists (Supabase PostgreSQL realtime, TanStack Query) but is not integrated into the dashboard.

## Solution Overview

Implement realtime subscriptions for critical tables using Supabase's PostgreSQL realtime feature, which automatically invalidates TanStack Query caches. This is a **hybrid approach**: realtime for critical data (sessions, feedback, ratings, clients), polling for secondary metrics (1-2 minute intervals instead of 5 minutes).

## Architecture

### Core Components

**1. Realtime Subscription Layer** (`src/lib/realtime/coach-subscriptions.ts`)

- `subscribeToSessions(coachId)` - watches sessions table
- `subscribeToSessionFeedback(coachId)` - watches session_feedback table
- `subscribeToSessionRatings(coachId)` - watches session_ratings table
- `subscribeToClientUpdates(coachId)` - watches users table (client changes)
- `subscribeToGoalUpdates(coachId)` - watches goals table

Each function returns an unsubscribe callback for cleanup.

**2. Custom Hook** (`src/lib/hooks/use-coach-dashboard-subscriptions.ts`)

```typescript
interface UseDashboardSubscriptionsReturn {
  isConnected: boolean;
  subscriptions: RealtimeSubscription[];
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
}

function useCoachDashboardSubscriptions(
  coachId: string
): UseDashboardSubscriptionsReturn;
```

Responsibilities:

- Initialize all subscriptions on mount
- Automatically invalidate TanStack Query caches on events:
  - Sessions change → invalidate `coach-stats`, `coach-activity`
  - Feedback/ratings change → invalidate `coach-insights`
  - Clients change → invalidate `coach-clients`
  - Goals change → invalidate `coach-insights`
- Track connection status and emit connection events
- Handle reconnection logic (exponential backoff)
- Clean up all subscriptions on unmount

**3. Integration in Dashboard** (`src/components/coach/coach-dashboard.tsx`)

- Call `useCoachDashboardSubscriptions(coachId)` at component mount
- Display connection status indicator (color-coded: green/yellow/red)
- Reduce polling `refetchInterval` from 5 minutes to 1-2 minutes for non-critical data
- Add loading skeleton for initial data fetch if needed

### Data Flow

```
Database Change (e.g., session completed)
  ↓
Supabase Realtime Event
  ↓
Subscription Listener (coach-subscriptions.ts)
  ↓
Hook invalidates Query Cache
  ↓
TanStack Query Refetch (automatic)
  ↓
Component Re-render with New Data
```

### Subscription Targets & Query Invalidation

| Table              | Subscription                   | Invalidates                     | Use Case                              |
| ------------------ | ------------------------------ | ------------------------------- | ------------------------------------- |
| `sessions`         | `subscribeToSessions()`        | `coach-stats`, `coach-activity` | Live session count, activity timeline |
| `session_feedback` | `subscribeToSessionFeedback()` | `coach-insights`, `coach-stats` | Live ratings updates                  |
| `session_ratings`  | `subscribeToSessionRatings()`  | `coach-insights`                | Live revenue, rating analytics        |
| `users`            | `subscribeToClientUpdates()`   | `coach-clients`                 | New client assignments                |
| `goals`            | `subscribeToGoalUpdates()`     | `coach-insights`                | Goal progress changes                 |

### Error Handling

**Subscription Errors:**

- Caught and logged with table name, error type, timestamp
- Connection status set to `disconnected`
- Toast notification: "Realtime connection lost. Using polling."
- Fallback polling continues (graceful degradation)

**Connection State:**

- Tracked separately from subscription state
- Heartbeat check every 5 seconds
- Auto-reconnect with exponential backoff (500ms → 8s max)
- Status indicator shows current state to user

**RLS & Security:**

- No changes needed—RLS already enforced on base tables
- Subscriptions filtered by coach_id (user can only see their own data)
- No private data leaked through events

### Performance Considerations

1. **Single Connection**: Reuse Supabase client connection for all subscriptions
2. **Cleanup**: All subscriptions cleaned up on component unmount (prevent memory leaks)
3. **Debouncing**: Multiple simultaneous invalidations batched together
4. **Polling Fallback**: Secondary metrics poll at 1-2 min instead of 5 min (reasonable trade-off)

### Testing Strategy

**Unit Tests:**

- Mock Supabase realtime events
- Verify subscription functions attach/detach listeners
- Test query invalidation logic

**Integration Tests:**

- Full flow: event → subscription → invalidation → query refetch
- Connection failure → fallback polling
- Cleanup on component unmount

**Manual Testing:**

- Book a session, verify coach stats update instantly
- Complete session, verify activity timeline updates
- Check connection indicator works
- Verify fallback to polling if connection fails

## Implementation Plan

See: `docs/plans/2025-11-17-coach-dashboard-realtime-implementation.md` (generated during planning phase)

## Success Criteria

- [ ] Realtime subscriptions working for all 5 table types
- [ ] Coach stats update instantly (< 1 second) on session changes
- [ ] Connection indicator shows realtime health
- [ ] Polling intervals reduced to 1-2 minutes
- [ ] All tests pass (unit + integration + e2e)
- [ ] No console errors or connection issues
- [ ] Graceful fallback when realtime unavailable
- [ ] Memory leaks eliminated on component unmount

## Alternative Approaches Considered

**1. Direct Table Subscriptions (Rejected)**

- Pros: Simple, direct data access
- Cons: Client-side aggregation needed, fires too many events, harder to maintain

**2. RPC-based Subscriptions (Rejected)**

- Pros: Clean aggregated data structure
- Cons: Unclear if Supabase supports RPC realtime, adds complexity

**3. Full Polling Optimization (Rejected)**

- Pros: No new infrastructure
- Cons: Still stale data, doesn't solve the core problem

**Chosen: Hybrid Smart Invalidation** ✅

- Balanced approach using existing infrastructure (Supabase realtime + TanStack Query)
- Leverages proven patterns from task subscriptions
- Graceful fallback keeps polling as safety net
- Minimal code changes, maximum benefit
