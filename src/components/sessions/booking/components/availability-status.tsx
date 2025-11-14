'use client';

import { memo } from 'react';
import { Users, RefreshCw, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { AvailabilityStatus as AvailabilityStatusType } from '../hooks/use-booking-time-slots';

interface AvailabilityStatusProps {
  status: AvailabilityStatusType | null;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

/**
 * Presentational component for availability status overview
 * Pure UI component with no business logic
 */
export const AvailabilityStatus = memo<AvailabilityStatusProps>(
  ({ status, onRefresh, isRefreshing = false }) => {
    if (!status) return null;

    return (
      <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 mt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <h4 className="font-medium">Availability Overview</h4>
          </div>
          <Button variant="ghost" size="sm" onClick={onRefresh} disabled={isRefreshing} className="h-8">
            {isRefreshing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Refresh
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="font-semibold text-lg">{status.totalSlots}</div>
            <div className="text-muted-foreground">Total Slots</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-lg text-green-600">{status.availableSlots}</div>
            <div className="text-muted-foreground">Available</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-lg text-red-600">{status.bookedSlots}</div>
            <div className="text-muted-foreground">Booked</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-lg text-muted-foreground">{status.blockedSlots}</div>
            <div className="text-muted-foreground">Blocked</div>
          </div>
        </div>
        {status.lastUpdated && (
          <div className="text-xs text-muted-foreground mt-2">
            Last updated: {status.lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </Card>
    );
  }
);

AvailabilityStatus.displayName = 'AvailabilityStatus';
