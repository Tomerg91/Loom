'use client';

/**
 * Refactored Session Booking Component
 *
 * This file exports the new refactored booking component with backward-compatible APIs.
 * The implementation has been decomposed into:
 * - Domain hooks (business logic in hooks/)
 * - Presentational components (UI in components/)
 * - XState machine (workflow orchestration in machines/)
 * - Orchestrator (coordination in session-booking-orchestrator.tsx)
 *
 * See: src/components/sessions/booking/README.md for architecture details
 */

import { memo } from 'react';
import type { Session } from '@/types';
import { SessionBookingOrchestrator } from './booking';

export interface SessionActions {
  onStart?: (sessionId: string) => Promise<void>;
  onComplete?: (sessionId: string, data?: { notes?: string; rating?: number; feedback?: string }) => Promise<void>;
  onCancel?: (sessionId: string, reason?: string) => Promise<void>;
}

export interface UnifiedSessionBookingProps {
  onSuccess?: (sessionData?: Session) => void;
  selectedCoachId?: string;
  className?: string;
  // Configuration options
  variant?: 'basic' | 'enhanced' | 'realtime';
  showCoachInfo?: boolean;
  showAvailabilityStatus?: boolean;
  showConnectionStatus?: boolean;
  enableRealtimeUpdates?: boolean;
  enableOptimisticUpdates?: boolean;
  customTitle?: string;
  customDescription?: string;
  // Session lifecycle actions
  sessionActions?: SessionActions;
  // For existing sessions (start/complete/cancel functionality)
  existingSessionId?: string;
  sessionStatus?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  showSessionActions?: boolean;
}

/**
 * Main unified session booking component using refactored architecture
 * Maintains API compatibility with the original UnifiedSessionBooking
 */
const UnifiedSessionBookingComponent = (props: UnifiedSessionBookingProps) => {
  return <SessionBookingOrchestrator {...props} />;
};

// Memoize the main component
export const UnifiedSessionBooking = memo(UnifiedSessionBookingComponent);

/**
 * Basic variant - Simple booking flow
 */
export function BasicSessionBooking(props: Omit<UnifiedSessionBookingProps, 'variant'>) {
  return <UnifiedSessionBooking {...props} variant="basic" />;
}

/**
 * Enhanced variant - With availability status and connection indicators
 */
export function EnhancedSessionBooking(props: Omit<UnifiedSessionBookingProps, 'variant'>) {
  return (
    <UnifiedSessionBooking
      {...props}
      variant="enhanced"
      showAvailabilityStatus={props.showAvailabilityStatus ?? true}
      showConnectionStatus={props.showConnectionStatus ?? true}
    />
  );
}

/**
 * Realtime variant - With live updates and optimistic UI
 */
export function RealtimeSessionBooking(props: Omit<UnifiedSessionBookingProps, 'variant'>) {
  return (
    <UnifiedSessionBooking
      {...props}
      variant="realtime"
      showAvailabilityStatus={props.showAvailabilityStatus ?? true}
      showConnectionStatus={props.showConnectionStatus ?? true}
      enableOptimisticUpdates={props.enableOptimisticUpdates ?? true}
    />
  );
}

// Re-export the orchestrator for direct usage
export { SessionBookingOrchestrator } from './booking';
