// Unified session booking components
export { UnifiedSessionBooking } from '../unified-session-booking';
export type { UnifiedSessionBookingProps } from '../unified-session-booking';

// Backward compatibility exports with specific configurations
import { UnifiedSessionBooking, UnifiedSessionBookingProps } from '../unified-session-booking';

// Basic booking form (replacement for session-booking-form.tsx)
export function SessionBookingForm(props: Omit<UnifiedSessionBookingProps, 'variant'>) {
  return UnifiedSessionBooking({ 
    ...props, 
    variant: 'basic',
    showCoachInfo: true,
    showAvailabilityStatus: false,
    showConnectionStatus: false,
    enableRealtimeUpdates: true
  });
}

// Enhanced booking form (replacement for enhanced-session-booking.tsx)  
export function EnhancedSessionBooking(props: Omit<UnifiedSessionBookingProps, 'variant'>) {
  return UnifiedSessionBooking({ 
    ...props, 
    variant: 'enhanced',
    showCoachInfo: true,
    showAvailabilityStatus: true,
    showConnectionStatus: false,
    enableRealtimeUpdates: true
  });
}

// Realtime booking form (replacement for realtime-session-booking.tsx)
export function RealtimeSessionBooking(props: Omit<UnifiedSessionBookingProps, 'variant'>) {
  return UnifiedSessionBooking({
    ...props,
    variant: 'realtime',
    showCoachInfo: true,
    showAvailabilityStatus: true,
    showConnectionStatus: true,
    enableRealtimeUpdates: true
  });
}

// Export default for dynamic imports
export default UnifiedSessionBooking;