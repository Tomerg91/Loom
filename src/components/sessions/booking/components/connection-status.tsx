'use client';

import { memo } from 'react';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ConnectionStatusProps {
  isConnected: boolean;
  onReconnect: () => void;
}

/**
 * Presentational component for connection status
 * Pure UI component with no business logic
 */
export const ConnectionStatus = memo<ConnectionStatusProps>(({ isConnected, onReconnect }) => {
  return (
    <div className="flex items-center gap-2">
      <Badge variant={isConnected ? 'default' : 'destructive'}>
        {isConnected ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
        {isConnected ? 'Live Updates' : 'Offline'}
      </Badge>
      <Button variant="outline" size="sm" onClick={onReconnect} disabled={isConnected}>
        {!isConnected && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
        Reconnect
      </Button>
    </div>
  );
});

ConnectionStatus.displayName = 'ConnectionStatus';
