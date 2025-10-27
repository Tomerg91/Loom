# Performance Optimization Design: Signin to App (2-4 Seconds)

**Approved**: October 27, 2025
**Target**: 2-4 seconds from signin to interactive dashboard
**Approach**: Hybrid architecture with progressive enhancement

---

## Executive Summary

This design optimizes the critical path from user signin to interactive app usage through a hybrid approach:

1. **Parallel data fetching** after authentication succeeds
2. **Immediate dashboard shell rendering** with skeleton loaders
3. **Progressive content fill-in** as API responses arrive
4. **Realtime subscriptions** initialized after dashboard is interactive

Result: Users can interact with the dashboard at ~2 seconds, while background data continues loading to 3-4 seconds.

---

## 1. Critical Path Architecture

### Timeline (Target: 2-4 seconds)

| Phase                     | Time     | Action                                                            |
| ------------------------- | -------- | ----------------------------------------------------------------- |
| Signin page load          | 0-0.3s   | Serve cached signin page with minimal JS                          |
| User submits credentials  | 0.3-0.8s | Client validation, initiate auth request                          |
| Backend auth              | 0.8-2.3s | Validate credentials, generate auth token (~1.5s backend latency) |
| **Dashboard interactive** | ~2s      | Shell renders with skeletons (user can interact)                  |
| Parallel data loading     | 1.5-2.5s | Profile + summary + activity data fetching                        |
| Content fill-in           | 2-4s     | Replace skeletons with real data as responses arrive              |

### Key Flows

**On Signin Success:**

```
Auth succeeds (token received)
    ├─ Store session (localStorage/cookie)
    ├─ Navigate to /dashboard
    └─ Dispatch parallel data fetches:
        ├─ GET /api/user/profile (required, ~200ms)
        ├─ GET /api/dashboard/summary (required, ~300ms)
        └─ Subscribe to realtime user events (async, deferred)

Dashboard Component Mounts (~1.5-2s)
    ├─ Render layout + skeleton screens immediately
    └─ Show loading state while queries in-flight

First Data Arrives (~2s)
    ├─ User profile arrives → update header
    ├─ Summary data arrives → populate quick actions + snapshot
    └─ Activity subscription connects

All Data Ready (~3-4s)
    └─ Replace remaining skeletons with real content
```

---

## 2. Bundle & Load Optimization

### Signin Page Bundle

**Target**: ~50-80KB gzipped

**Optimizations**:

- **Lazy load dashboard code**: Don't include dashboard route in signin bundle
- **Code split by route**: `/app` and `/signin` are separate chunks
- **Minimal dependencies**: Signin page includes only auth logic, form validation, next-intl for labels
- **Dynamic imports**: Use `next/dynamic` for optional features (social login, password recovery)

**Preconnect directives** (in signin page HTML head):

```html
<link rel="preconnect" href="https://<PROJECT_ID>.supabase.co" />
<link rel="dns-prefetch" href="wss://<PROJECT_ID>.supabase.co" />
```

### Language File Strategy

**Problem**: Full translation bundle for all languages is bloated

**Solution**:

- Ship only current language bundle at signin (~40KB for single language)
- Load additional languages on-demand when user changes language preference
- Cache in localStorage with version hash for invalidation
- Example: User signing in with `en` → load `en.json` only, defer `es.json`, `fr.json`

### Runtime Optimization

- **No layout shift**: Use CSS `aspect-ratio` on skeleton placeholders
- **Font optimization**: System fonts for signin (defer Figma fonts to dashboard)
- **Image optimization**: Favicon only, defer user avatars to dashboard loading phase

---

## 3. Data Fetching & Caching Strategy

### Parallel Query Execution

**On dashboard mount, fetch immediately:**

1. **User Profile** (critical path)
   - Endpoint: `GET /api/user/profile`
   - Response size: ~2KB (user name, email, avatar URL, language preference)
   - Timeout: 2s
   - Used by: Header component

2. **Dashboard Summary** (critical path)
   - Endpoint: `GET /api/dashboard/summary`
   - Response size: ~3-5KB (quick actions count, client stats snapshot)
   - Timeout: 2.5s
   - Used by: Quick actions + client snapshot sections

3. **Realtime Subscriptions** (non-blocking)
   - Start subscription to user activity channel
   - Don't block dashboard render on subscription connection
   - Subscribe in `useEffect` after component mounts

### TanStack Query Configuration

```typescript
// Query client setup
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30 seconds
      gcTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});
```

**Key behaviors**:

- **Request deduplication**: Same query fired multiple times within 10s window = single network request
- **Stale-while-revalidate**: Return cached data immediately, refetch in background
- **Background refetch on tab focus**: Freshen data when user returns to app
- **Error handling**: Graceful fallback UI if data requests fail (show skeleton state, retry button)

### Realtime Subscriptions

**Activity Feed Updates**:

- Use Supabase Realtime to subscribe to `user_activity` table
- Initial page load fetches last 10 items via query
- Realtime subscription updates feed as new events arrive
- Connection strategy: Start subscription after dashboard interactive, not during initial load

**Resilience**:

- Exponential backoff for reconnection (1s, 2s, 4s, 8s max)
- Show "connection lost" indicator if subscription fails for >5s
- Automatic retry every 10 seconds

---

## 4. Dashboard Rendering & Progressive Enhancement

### Shell Architecture

Render immediately on mount (no data required):

```
<Dashboard>
  <Header>
    {userData ? <UserName /> : <Skeleton width="120px" />}
  </Header>

  <MainContent>
    <QuickActionsGrid>
      {[1,2,3,4].map(i =>
        summaryData?.actions[i]
          ? <ActionCard data={summaryData.actions[i]} />
          : <SkeletonCard key={i} />
      )}
    </QuickActionsGrid>

    <ClientSnapshot>
      {summaryData?.stats
        ? <Chart data={summaryData.stats} />
        : <SkeletonChart />
      }
    </ClientSnapshot>

    <ActivityFeed>
      {activityData?.items
        ? activityData.items.map(item => <ActivityItem {...item} />)
        : [1,2,3].map(i => <SkeletonActivityRow key={i} />)
      }
    </ActivityFeed>
  </MainContent>
</Dashboard>
```

### Skeleton Loaders

**Design principles**:

- Match final content dimensions exactly (no layout shift)
- Use CSS `@keyframes pulse` animation (light gray background pulsing)
- No JavaScript animations (pure CSS for performance)
- Accessibility: `aria-busy="true"` while loading

**Example CSS**:

```css
.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}

@keyframes loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
```

### Progressive Fill-In Order

1. **At ~2s**: Profile arrives → Header rendered with actual user name
2. **At ~2.3s**: Summary arrives → Quick actions + snapshot cards show real data
3. **At ~3-4s**: Activity data arrives → Feed populated with real items
4. **Realtime**: New activity events → activity feed updates live

---

## 5. Error Handling

### Network Failures

**If user profile fails** (critical):

- Show error state in header with retry button
- Allow user to continue (app remains usable)
- Show toast: "Unable to load profile, please retry"

**If summary fails**:

- Show empty state for quick actions / client snapshot
- Suggest user refresh page
- Continue to activity feed

**If activity data fails**:

- Show empty activity feed
- Realtime subscription may still succeed (users see updates)

### Timeout Strategy

- Profile query timeout: 2s
- Summary query timeout: 2.5s
- If timeout, show error state and allow manual retry
- Don't block dashboard render

---

## 6. Monitoring & Metrics

### Performance Metrics to Track

- **Time to First Paint (signin page)**: <1s
- **Time to Interactive (dashboard shell)**: <2s
- **Time to Complete (all data loaded)**: <4s
- **Query response times**: /api/user/profile, /api/dashboard/summary
- **Realtime subscription latency**: Time to first connection
- **Bundle sizes**: signin chunk, dashboard chunk, language files

### Observability

Use Sentry to track:

- Page load performance (Sentry Browser profiling)
- API response times (capture timing in request span)
- Query execution times (TanStack Query integration)
- Realtime connection events

---

## 7. Implementation Phases

### Phase 1: Core Architecture

- [x] Design complete
- [ ] Setup git worktree for development
- [ ] Create dashboard shell with skeleton loaders
- [ ] Implement parallel data fetching on signin

### Phase 2: Optimization

- [ ] Code split signin / dashboard bundles
- [ ] Optimize language file loading
- [ ] Add preconnect directives to signin page
- [ ] Measure actual load times

### Phase 3: Realtime & Polish

- [ ] Implement realtime subscriptions
- [ ] Add error handling for all failure scenarios
- [ ] Performance monitoring (Sentry integration)
- [ ] Load testing and benchmarking

---

## 8. Success Criteria

- ✅ Signin to interactive dashboard: **<2 seconds**
- ✅ All data loaded: **<4 seconds**
- ✅ No layout shift on skeleton → content transition
- ✅ Graceful error handling for all failure modes
- ✅ Realtime updates working without blocking initial load
- ✅ Bundle size: signin page <80KB, dashboard chunks optimized

---

## Technology Stack

- **Framework**: Next.js 15.3.5 with App Router
- **Data fetching**: TanStack Query v5
- **Real-time**: Supabase Realtime
- **Language**: next-intl with lazy loading
- **Styling**: Tailwind CSS 4 (pure CSS skeletons)
- **Monitoring**: Sentry browser profiling
- **Testing**: Vitest + Playwright (performance tests)

---

## Dependencies & Risks

### Dependencies

- Supabase API performance (latency depends on region)
- Network conditions (mobile 3G may exceed targets)
- Browser parsing/rendering time (minimized via code splitting)

### Risk Mitigation

- Set realistic timeouts (2-2.5s for queries)
- Graceful degradation if realtime fails (polling fallback)
- Error boundaries prevent one failed section blocking others
- Performance monitoring alerts if response times degrade

---

## Next Steps

1. Set up git worktree for isolated development
2. Create detailed implementation plan with file-by-file changes
3. Begin Phase 1: Dashboard shell + parallel data fetching
