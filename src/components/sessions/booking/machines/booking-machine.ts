import { assign, setup } from 'xstate';
import type { Session } from '@/types';

// Types for the booking context
export interface BookingContext {
  // Selected values
  coachId: string | null;
  date: string | null;
  timeSlot: string | null;
  duration: number;
  timezone: string;

  // Form data
  title: string;
  description: string;

  // Results
  bookedSession: Session | null;
  error: string | null;

  // Variant and configuration
  variant: 'basic' | 'enhanced' | 'realtime';
  enableOptimisticUpdates: boolean;
}

// Events
export type BookingEvent =
  | { type: 'SELECT_COACH'; coachId: string }
  | { type: 'SELECT_DATE'; date: string }
  | { type: 'SELECT_TIME'; timeSlot: string }
  | { type: 'UPDATE_DURATION'; duration: number }
  | { type: 'UPDATE_DETAILS'; title?: string; description?: string }
  | { type: 'SUBMIT' }
  | { type: 'BOOKING_SUCCESS'; session: Session }
  | { type: 'BOOKING_ERROR'; error: string }
  | { type: 'RESET' }
  | { type: 'RETRY' };

// Type guards
const hasCoach = (context: BookingContext) => context.coachId !== null;
const hasDate = (context: BookingContext) => context.date !== null;
const hasTimeSlot = (context: BookingContext) => context.timeSlot !== null;
const hasTitle = (context: BookingContext) => context.title.trim().length > 0;
const canSubmit = (context: BookingContext) =>
  hasCoach(context) &&
  hasDate(context) &&
  hasTimeSlot(context) &&
  hasTitle(context);

/**
 * XState machine for session booking workflow
 *
 * States:
 * - idle: Initial state, waiting for user action
 * - selectingCoach: User is selecting a coach
 * - selectingDate: User is selecting a date
 * - selectingTime: User is selecting a time slot
 * - fillingDetails: User is filling session details
 * - validating: Validating form before submission
 * - booking: Submitting the booking request
 * - success: Booking completed successfully
 * - error: Booking failed
 */
export const bookingMachine = setup({
  types: {
    context: {} as BookingContext,
    events: {} as BookingEvent,
  },
  guards: {
    hasCoach,
    hasDate,
    hasTimeSlot,
    hasTitle,
    canSubmit,
  },
  actions: {
    selectCoach: assign({
      coachId: ({ event }) => {
        if (event.type === 'SELECT_COACH') {
          return event.coachId;
        }
        return null;
      },
      // Reset dependent fields when coach changes
      date: null,
      timeSlot: null,
    }),
    selectDate: assign({
      date: ({ event }) => {
        if (event.type === 'SELECT_DATE') {
          return event.date;
        }
        return null;
      },
      // Reset time slot when date changes
      timeSlot: null,
    }),
    selectTimeSlot: assign({
      timeSlot: ({ event }) => {
        if (event.type === 'SELECT_TIME') {
          return event.timeSlot;
        }
        return null;
      },
    }),
    updateDuration: assign({
      duration: ({ event }) => {
        if (event.type === 'UPDATE_DURATION') {
          return event.duration;
        }
        return 60;
      },
      // Reset time slot when duration changes
      timeSlot: null,
    }),
    updateDetails: assign({
      title: ({ context, event }) => {
        if (event.type === 'UPDATE_DETAILS' && event.title !== undefined) {
          return event.title;
        }
        return context.title;
      },
      description: ({ context, event }) => {
        if (event.type === 'UPDATE_DETAILS' && event.description !== undefined) {
          return event.description;
        }
        return context.description;
      },
    }),
    setBookingSuccess: assign({
      bookedSession: ({ event }) => {
        if (event.type === 'BOOKING_SUCCESS') {
          return event.session;
        }
        return null;
      },
      error: null,
    }),
    setBookingError: assign({
      error: ({ event }) => {
        if (event.type === 'BOOKING_ERROR') {
          return event.error;
        }
        return 'Unknown error occurred';
      },
    }),
    clearError: assign({
      error: null,
    }),
    reset: assign({
      coachId: null,
      date: null,
      timeSlot: null,
      title: '',
      description: '',
      bookedSession: null,
      error: null,
    }),
  },
}).createMachine({
  id: 'booking',
  initial: 'idle',
  context: {
    coachId: null,
    date: null,
    timeSlot: null,
    duration: 60,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    title: '',
    description: '',
    bookedSession: null,
    error: null,
    variant: 'basic',
    enableOptimisticUpdates: false,
  },
  states: {
    idle: {
      on: {
        SELECT_COACH: {
          target: 'selectingCoach',
          actions: 'selectCoach',
        },
      },
    },
    selectingCoach: {
      on: {
        SELECT_COACH: {
          actions: 'selectCoach',
        },
        SELECT_DATE: [
          {
            guard: 'hasCoach',
            target: 'selectingDate',
            actions: 'selectDate',
          },
        ],
      },
    },
    selectingDate: {
      on: {
        SELECT_COACH: {
          target: 'selectingCoach',
          actions: 'selectCoach',
        },
        SELECT_DATE: {
          actions: 'selectDate',
        },
        UPDATE_DURATION: {
          actions: 'updateDuration',
        },
        SELECT_TIME: [
          {
            guard: 'hasDate',
            target: 'selectingTime',
            actions: 'selectTimeSlot',
          },
        ],
      },
    },
    selectingTime: {
      on: {
        SELECT_COACH: {
          target: 'selectingCoach',
          actions: 'selectCoach',
        },
        SELECT_DATE: {
          target: 'selectingDate',
          actions: 'selectDate',
        },
        SELECT_TIME: {
          actions: 'selectTimeSlot',
        },
        UPDATE_DURATION: {
          target: 'selectingDate',
          actions: 'updateDuration',
        },
        UPDATE_DETAILS: [
          {
            guard: 'hasTimeSlot',
            target: 'fillingDetails',
            actions: 'updateDetails',
          },
        ],
      },
    },
    fillingDetails: {
      on: {
        SELECT_COACH: {
          target: 'selectingCoach',
          actions: 'selectCoach',
        },
        SELECT_DATE: {
          target: 'selectingDate',
          actions: 'selectDate',
        },
        SELECT_TIME: {
          target: 'selectingTime',
          actions: 'selectTimeSlot',
        },
        UPDATE_DETAILS: {
          actions: 'updateDetails',
        },
        SUBMIT: [
          {
            guard: 'canSubmit',
            target: 'validating',
          },
        ],
      },
    },
    validating: {
      always: [
        {
          guard: 'canSubmit',
          target: 'booking',
        },
        {
          target: 'fillingDetails',
        },
      ],
    },
    booking: {
      on: {
        BOOKING_SUCCESS: {
          target: 'success',
          actions: 'setBookingSuccess',
        },
        BOOKING_ERROR: {
          target: 'error',
          actions: 'setBookingError',
        },
      },
    },
    success: {
      on: {
        RESET: {
          target: 'idle',
          actions: 'reset',
        },
      },
    },
    error: {
      on: {
        RETRY: {
          target: 'booking',
          actions: 'clearError',
        },
        RESET: {
          target: 'idle',
          actions: 'reset',
        },
      },
    },
  },
});

export type BookingMachine = typeof bookingMachine;
