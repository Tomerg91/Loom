'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useUser } from '@/lib/store/auth-store';
import { useRealtimeSubscriptions } from '@/lib/realtime/hooks';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RealtimeContextType {
  isConnected: boolean;
  reconnect: () => void;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
}

const RealtimeContext = createContext<RealtimeContextType | null>(null);

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
}

interface RealtimeProviderProps {
  children: React.ReactNode;
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const user = useUser();
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected');
  const [showConnectionStatus, setShowConnectionStatus] = useState(false);

  const { isConnected, reconnect } = useRealtimeSubscriptions();

  // Update connection status
  useEffect(() => {
    if (isConnected) {
      setConnectionStatus('connected');
      // Hide status indicator after 3 seconds if connected
      const timer = setTimeout(() => {
        setShowConnectionStatus(false);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setConnectionStatus('disconnected');
      setShowConnectionStatus(true);
    }
  }, [isConnected]);

  // Handle reconnection
  const handleReconnect = () => {
    setConnectionStatus('reconnecting');
    reconnect();
  };

  // Only show for authenticated users
  if (!user) {
    return <>{children}</>;
  }

  const contextValue: RealtimeContextType = {
    isConnected,
    reconnect: handleReconnect,
    connectionStatus,
  };

  return (
    <RealtimeContext.Provider value={contextValue}>
      {children}
      
      {/* Connection Status Indicator */}
      {showConnectionStatus && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-card border border-border rounded-lg shadow-lg p-4 min-w-64">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {connectionStatus === 'connected' && (
                  <>
                    <Wifi className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">Connected</span>
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      Live
                    </Badge>
                  </>
                )}
                
                {connectionStatus === 'disconnected' && (
                  <>
                    <WifiOff className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium">Disconnected</span>
                    <Badge variant="outline" className="text-red-600 border-red-600">
                      Offline
                    </Badge>
                  </>
                )}
                
                {connectionStatus === 'reconnecting' && (
                  <>
                    <RotateCcw className="h-4 w-4 text-yellow-600 animate-spin" />
                    <span className="text-sm font-medium">Reconnecting...</span>
                    <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                      Connecting
                    </Badge>
                  </>
                )}
              </div>
              
              {connectionStatus === 'disconnected' && (
                <Button size="sm" variant="outline" onClick={handleReconnect}>
                  Retry
                </Button>
              )}
              
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowConnectionStatus(false)}
                className="h-6 w-6 p-0"
              >
                ×
              </Button>
            </div>
            
            <div className="mt-2 text-xs text-muted-foreground">
              {connectionStatus === 'connected' && 'Receiving live updates'}
              {connectionStatus === 'disconnected' && 'Some features may not work properly'}
              {connectionStatus === 'reconnecting' && 'Attempting to restore connection'}
            </div>
          </div>
        </div>
      )}
    </RealtimeContext.Provider>
  );
}