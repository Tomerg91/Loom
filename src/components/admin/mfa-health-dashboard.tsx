'use client';

import { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, CheckCircle, Shield, RefreshCw, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MfaDiscrepancyTable, type MfaDiscrepancy } from './mfa-discrepancy-table';
import { Skeleton } from '@/components/ui/skeleton';

interface MfaHealthStats {
  totalDiscrepancies: number;
  lastRefreshTime: string | null;
  nextScheduledRefresh: string;
}

export function MfaHealthDashboard() {
  const [discrepancies, setDiscrepancies] = useState<MfaDiscrepancy[]>([]);
  const [stats, setStats] = useState<MfaHealthStats>({
    totalDiscrepancies: 0,
    lastRefreshTime: null,
    nextScheduledRefresh: '2:00 AM UTC (Daily)',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDiscrepancies = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/admin/mfa/discrepancies');

      if (!response.ok) {
        throw new Error(`Failed to fetch discrepancies: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        setDiscrepancies(result.data.discrepancies || []);
        setStats((prev) => ({
          ...prev,
          totalDiscrepancies: result.data.total || 0,
          lastRefreshTime: new Date().toISOString(),
        }));
      } else {
        throw new Error(result.error || 'Failed to load discrepancies');
      }
    } catch (err) {
      console.error('Error fetching MFA discrepancies:', err);
      setError(err instanceof Error ? err.message : 'Failed to load MFA discrepancies');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchDiscrepancies();
  }, [fetchDiscrepancies]);

  const handleManualViewRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setError(null);

      // Call the refresh endpoint
      const response = await fetch('/api/admin/refresh-mfa-status', {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || ''}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to refresh materialized view');
      }

      const result = await response.json();

      // After refreshing the view, fetch updated discrepancies
      await fetchDiscrepancies();

      console.log('View refreshed:', result);
    } catch (err) {
      console.error('Error refreshing view:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to refresh materialized view'
      );
      setIsRefreshing(false);
    }
  }, [fetchDiscrepancies]);

  useEffect(() => {
    fetchDiscrepancies();
  }, [fetchDiscrepancies]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">MFA Health Monitoring</h1>
          <p className="text-muted-foreground">
            Monitor and resolve MFA source discrepancies
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>

        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">MFA Health Monitoring</h1>
        <p className="text-muted-foreground">
          Monitor and resolve MFA source discrepancies between unified and legacy sources
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Discrepancies</CardTitle>
            {stats.totalDiscrepancies === 0 ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDiscrepancies}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalDiscrepancies === 0
                ? 'All sources in sync'
                : `Require${stats.totalDiscrepancies === 1 ? 's' : ''} attention`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Refresh</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.lastRefreshTime
                ? new Date(stats.lastRefreshTime).toLocaleTimeString()
                : 'Never'}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.lastRefreshTime
                ? new Date(stats.lastRefreshTime).toLocaleDateString()
                : 'No refresh yet'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Scheduled Refresh</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2:00 AM</div>
            <p className="text-xs text-muted-foreground">UTC - Daily via cron</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                About MFA Health
              </CardTitle>
              <CardDescription>Understanding the unified MFA source of truth</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualViewRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh View
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">What are MFA discrepancies?</h3>
            <p className="text-sm text-muted-foreground">
              The system maintains two MFA status sources: the new unified source (user_mfa_methods
              table) and the legacy users.mfa_enabled column. Discrepancies occur when these
              sources disagree about a user&apos;s MFA status.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">How are discrepancies resolved?</h3>
            <p className="text-sm text-muted-foreground">
              An automatic sync trigger updates users.mfa_enabled whenever MFA methods change. The
              materialized view (user_mfa_status_unified) is refreshed nightly at 2 AM UTC to
              detect any remaining discrepancies.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">What should I do if discrepancies persist?</h3>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Click &quot;Refresh View&quot; to manually update the materialized view</li>
              <li>
                Check the user&apos;s MFA methods in the main admin panel to verify the correct
                state
              </li>
              <li>
                The next MFA method change for that user will automatically trigger sync and
                resolve the discrepancy
              </li>
              <li>
                If issues persist, check database logs and the sync trigger function
                (sync_mfa_enabled_column)
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <MfaDiscrepancyTable
        discrepancies={discrepancies}
        isLoading={isRefreshing}
        onRefresh={handleRefresh}
      />
    </div>
  );
}
