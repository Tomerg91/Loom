'use client';

import { RefreshCw, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SystemHealth {
  database: {
    status: 'healthy' | 'warning' | 'error';
    connections: number;
    maxConnections: number;
    responseTime: number;
  };
  server: {
    status: 'healthy' | 'warning' | 'error';
    uptime: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  cache: {
    status: 'healthy' | 'warning' | 'error';
    hitRate: number;
    memoryUsed: number;
  };
  services: {
    analytics: 'healthy' | 'warning' | 'error';
    notifications: 'healthy' | 'warning' | 'error';
    fileStorage: 'healthy' | 'warning' | 'error';
  };
  lastChecked: string;
}

export function SystemHealthDisplay() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealthData = async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/system-health', { signal });
      if (!response.ok) {
        throw new Error('Failed to fetch system health data');
      }
      const result = await response.json();
      if (result.success) {
        setHealth(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch system health');
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was cancelled, don't update state
        return;
      }
      console.error('Failed to fetch system health:', err);
      setError('Unable to fetch real-time system health data');
      // Use mock data as fallback for development
      setHealth(generateMockHealthData());
    } finally {
      setIsLoading(false);
    }
  };

  // Generate mock health data for demonstration
  const generateMockHealthData = (): SystemHealth => ({
    database: {
      status: 'healthy',
      connections: 12,
      maxConnections: 100,
      responseTime: 45,
    },
    server: {
      status: 'healthy',
      uptime: Date.now() - (7 * 24 * 60 * 60 * 1000), // 7 days ago
      memoryUsage: 68,
      cpuUsage: 23,
    },
    cache: {
      status: 'healthy',
      hitRate: 94.2,
      memoryUsed: 256,
    },
    services: {
      analytics: 'healthy',
      notifications: 'healthy',
      fileStorage: 'healthy',
    },
    lastChecked: new Date().toISOString(),
  });

  useEffect(() => {
    const abortController = new AbortController();
    fetchHealthData(abortController.signal);

    return () => {
      abortController.abort();
    };
  }, []);

  const getStatusIcon = (status: 'healthy' | 'warning' | 'error') => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: 'healthy' | 'warning' | 'error') => {
    const variant = status === 'healthy' ? 'default' : 
                   status === 'warning' ? 'secondary' : 'destructive';
    return (
      <Badge variant={variant} className="capitalize">
        {status}
      </Badge>
    );
  };

  const formatUptime = (timestamp: number) => {
    const uptime = Date.now() - timestamp;
    const days = Math.floor(uptime / (24 * 60 * 60 * 1000));
    const hours = Math.floor((uptime % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    return `${days}d ${hours}h`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center p-8">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !health) {
    return (
      <div className="space-y-4">
        <div className="text-center p-8">
          <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{error || 'No health data available'}</p>
        </div>
        <div className="flex justify-center">
          <Button onClick={fetchHealthData} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Last checked: {new Date(health.lastChecked).toLocaleString()}
        </p>
        <Button onClick={fetchHealthData} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Database Health */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            {getStatusIcon(health.database.status)}
            Database
            {getStatusBadge(health.database.status)}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Connections:</span>
              <span className="ml-2">{health.database.connections}/{health.database.maxConnections}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Response Time:</span>
              <span className="ml-2">{health.database.responseTime}ms</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Server Health */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            {getStatusIcon(health.server.status)}
            Server
            {getStatusBadge(health.server.status)}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Uptime:</span>
              <span className="ml-2">{formatUptime(health.server.uptime)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Memory:</span>
              <span className="ml-2">{health.server.memoryUsage}%</span>
            </div>
            <div>
              <span className="text-muted-foreground">CPU:</span>
              <span className="ml-2">{health.server.cpuUsage}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cache Health */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            {getStatusIcon(health.cache.status)}
            Cache
            {getStatusBadge(health.cache.status)}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Hit Rate:</span>
              <span className="ml-2">{health.cache.hitRate}%</span>
            </div>
            <div>
              <span className="text-muted-foreground">Memory:</span>
              <span className="ml-2">{health.cache.memoryUsed}MB</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Services Health */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Services</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {Object.entries(health.services).map(([service, status]) => (
              <div key={service} className="flex items-center justify-between">
                <span className="text-sm capitalize">{service.replace(/([A-Z])/g, ' $1')}</span>
                <div className="flex items-center gap-2">
                  {getStatusIcon(status)}
                  {getStatusBadge(status)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}