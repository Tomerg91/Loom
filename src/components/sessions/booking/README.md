# Session Booking Component Architecture

This directory contains the refactored session booking component, decomposed into domain hooks, presentational components, and an XState workflow orchestrator.

## Architecture Overview

The booking component follows a clean architecture pattern with clear separation of concerns:

```
booking/
├── machines/              # XState state machines
│   └── booking-machine.ts # Booking workflow state machine
├── hooks/                 # Domain hooks (business logic)
│   ├── use-booking-coaches.ts
│   ├── use-booking-time-slots.ts
│   ├── use-booking-mutation.ts
│   └── use-session-actions.ts
├── components/            # Presentational components (pure UI)
│   ├── coach-selector.tsx
│   ├── date-selector.tsx
│   ├── time-slot-grid.tsx
│   ├── booking-details-form.tsx
│   ├── availability-status.tsx
│   └── connection-status.tsx
└── session-booking-orchestrator.tsx  # Main orchestrator
```

## Layer Responsibilities

### 1. Domain Hooks (`hooks/`)

Domain hooks handle business logic and data fetching. They are reusable and testable in isolation.

#### `useBookingCoaches`
- Fetches available coaches
- Supports basic and enhanced modes (with online status)
- Manages coach data refresh intervals

#### `useBookingTimeSlots`
- Fetches available time slots for selected coach/date
- Calculates availability statistics
- Supports real-time updates
- Provides manual refresh capability

#### `useBookingMutation`
- Handles session booking creation
- Supports optimistic updates
- Manages booking state and errors
- Invalidates relevant queries on success

#### `useSessionActions`
- Manages session lifecycle actions (start, complete, cancel)
- Provides loading states per action
- Handles error states
- Invalidates queries after actions

### 2. Presentational Components (`components/`)

Presentational components are pure UI components that receive data via props and emit events via callbacks. They contain no business logic.

#### `CoachSelector`
- Displays list of available coaches
- Shows online status (optional)
- Handles coach selection

#### `DateSelector`
- Displays available dates
- Supports configurable date range
- Handles date selection

#### `TimeSlotGrid`
- Displays time slots in a grid
- Supports basic, enhanced, and realtime variants
- Shows slot status (available, booked, blocked)
- Handles time slot selection

#### `BookingDetailsForm`
- Collects session details (title, description)
- Handles duration selection
- Manages timezone input
- Displays validation errors

#### `AvailabilityStatus`
- Displays availability overview statistics
- Shows total, available, booked, and blocked slots
- Provides refresh button
- Displays last update time

#### `ConnectionStatus`
- Shows real-time connection status
- Provides reconnect button
- Displays online/offline badge

### 3. XState Machine (`machines/`)

The booking machine orchestrates the booking workflow through a finite state machine.

#### States
- `idle`: Initial state, waiting for user action
- `selectingCoach`: Coach selection in progress
- `selectingDate`: Date selection in progress
- `selectingTime`: Time slot selection in progress
- `fillingDetails`: Filling session details
- `validating`: Validating form before submission
- `booking`: Submitting the booking request
- `success`: Booking completed successfully
- `error`: Booking failed

#### Events
- `SELECT_COACH`: Coach selected
- `SELECT_DATE`: Date selected
- `SELECT_TIME`: Time slot selected
- `UPDATE_DURATION`: Duration changed
- `UPDATE_DETAILS`: Session details updated
- `SUBMIT`: Form submitted
- `BOOKING_SUCCESS`: Booking succeeded
- `BOOKING_ERROR`: Booking failed
- `RESET`: Reset to initial state
- `RETRY`: Retry after error

#### Guards
- `hasCoach`: Check if coach is selected
- `hasDate`: Check if date is selected
- `hasTimeSlot`: Check if time slot is selected
- `hasTitle`: Check if title is filled
- `canSubmit`: Check if all required fields are filled

### 4. Orchestrator (`session-booking-orchestrator.tsx`)

The orchestrator coordinates between the XState machine, domain hooks, and presentational components. It:

- Initializes the XState machine with initial context
- Subscribes to domain hooks for data
- Maps machine state to UI state
- Dispatches events to the machine based on user interactions
- Handles side effects (API calls, query invalidation)
- Manages real-time connection (for enhanced/realtime variants)

## Usage

### Basic Usage

```tsx
import { SessionBookingOrchestrator } from '@/components/sessions/booking';

function MyComponent() {
  return (
    <SessionBookingOrchestrator
      variant="basic"
      onSuccess={(session) => {
        console.log('Booked session:', session);
      }}
    />
  );
}
```

### Enhanced Mode (with availability status)

```tsx
<SessionBookingOrchestrator
  variant="enhanced"
  showAvailabilityStatus={true}
  showConnectionStatus={true}
  enableOptimisticUpdates={true}
/>
```

### Real-time Mode (with live updates)

```tsx
<SessionBookingOrchestrator
  variant="realtime"
  showAvailabilityStatus={true}
  showConnectionStatus={true}
  enableRealtimeUpdates={true}
  enableOptimisticUpdates={true}
/>
```

### With Pre-selected Coach

```tsx
<SessionBookingOrchestrator
  variant="basic"
  selectedCoachId="coach-123"
  onSuccess={(session) => {
    router.push(`/sessions/${session.id}`);
  }}
/>
```

## Props

### SessionBookingOrchestratorProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'basic' \| 'enhanced' \| 'realtime'` | `'basic'` | Booking variant with different features |
| `selectedCoachId` | `string?` | - | Pre-select a specific coach |
| `onSuccess` | `(session?: Session) => void` | - | Callback when booking succeeds |
| `showCoachInfo` | `boolean` | `true` | Show selected coach information |
| `showAvailabilityStatus` | `boolean` | `false` | Show availability statistics |
| `showConnectionStatus` | `boolean` | `false` | Show real-time connection status |
| `enableRealtimeUpdates` | `boolean` | `true` | Enable real-time data updates |
| `enableOptimisticUpdates` | `boolean` | `false` | Enable optimistic UI updates |
| `customTitle` | `string` | - | Custom card title |
| `customDescription` | `string` | - | Custom card description |
| `sessionActions` | `SessionActions` | - | Custom session action handlers |
| `existingSessionId` | `string?` | - | ID of existing session (for actions) |
| `sessionStatus` | `'scheduled' \| 'in_progress' \| 'completed' \| 'cancelled'` | - | Status of existing session |
| `showSessionActions` | `boolean` | `false` | Show session action buttons |

## Variants

### Basic
- Simple booking flow
- Standard coach selection
- Basic time slot display
- No real-time updates (optional via `enableRealtimeUpdates`)

### Enhanced
- Enhanced UI with detailed slot information
- Online status for coaches
- Availability statistics
- Connection status indicator
- Periodic data refresh

### Realtime
- All enhanced features
- Live updates via WebSocket
- Optimistic updates
- Auto-refresh on data changes
- Connection management

## Benefits of This Architecture

### 1. Separation of Concerns
- Business logic isolated in hooks
- UI logic isolated in components
- Workflow logic isolated in state machine
- Easy to understand and maintain

### 2. Testability
- Hooks can be tested independently
- Components can be tested with mock props
- State machine can be tested with XState testing utilities
- Orchestrator can be tested with mocked hooks

### 3. Reusability
- Domain hooks can be used in other components
- Presentational components can be used in different contexts
- State machine can be extended or modified without affecting UI

### 4. Type Safety
- Full TypeScript support
- Type-safe state machine with XState v5
- Type-safe props and callbacks

### 5. Maintainability
- Clear file organization
- Single responsibility principle
- Easy to add new features
- Easy to debug (state machine visualization)

## Testing

### Testing Domain Hooks

```tsx
import { renderHook, waitFor } from '@testing-library/react';
import { useBookingCoaches } from './hooks/use-booking-coaches';

test('fetches coaches successfully', async () => {
  const { result } = renderHook(() => useBookingCoaches({ variant: 'basic' }));

  await waitFor(() => {
    expect(result.current.coaches).toHaveLength(5);
  });
});
```

### Testing Presentational Components

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { CoachSelector } from './components/coach-selector';

test('calls onCoachSelect when coach is selected', () => {
  const onCoachSelect = vi.fn();
  const coaches = [{ id: '1', firstName: 'John', lastName: 'Doe' }];

  render(
    <CoachSelector
      coaches={coaches}
      selectedCoachId={null}
      onCoachSelect={onCoachSelect}
    />
  );

  // Test coach selection
  // ...
});
```

### Testing State Machine

```tsx
import { createActor } from 'xstate';
import { bookingMachine } from './machines/booking-machine';

test('transitions from idle to selectingCoach', () => {
  const actor = createActor(bookingMachine);
  actor.start();

  actor.send({ type: 'SELECT_COACH', coachId: 'coach-1' });

  expect(actor.getSnapshot().value).toBe('selectingCoach');
  expect(actor.getSnapshot().context.coachId).toBe('coach-1');
});
```

## Migration Guide

If you're migrating from the old `UnifiedSessionBooking` component:

1. Replace imports:
   ```tsx
   // Old
   import { UnifiedSessionBooking } from '@/components/sessions/unified-session-booking';

   // New
   import { SessionBookingOrchestrator } from '@/components/sessions/booking';
   ```

2. Update component usage:
   ```tsx
   // Old
   <UnifiedSessionBooking variant="basic" onSuccess={handleSuccess} />

   // New (same API)
   <SessionBookingOrchestrator variant="basic" onSuccess={handleSuccess} />
   ```

The API remains the same, so most migrations should be straightforward.

## Future Enhancements

- Add support for recurring sessions
- Add support for group sessions
- Add session templates
- Add calendar integration
- Add payment integration
- Add notification preferences

## Contributing

When adding new features:

1. Add business logic to domain hooks
2. Add UI components to presentational components
3. Update state machine if workflow changes
4. Update orchestrator to wire everything together
5. Add tests for all layers
6. Update this README
