'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  BarChart3,
  Users,
  Calendar,
  TrendingUp,
  Activity,
  Star,
  DollarSign,
  Download,
  RefreshCw
} from 'lucide-react';
import { UserGrowthChart, SessionMetricsChart } from '@/components/charts/chart-components';
import { EnhancedUserGrowthChart, EnhancedSessionMetricsChart } from '@/components/charts/enhanced-chart-components';
import { ANALYTICS_CONFIG, getGrowthRateOrDefault } from '@/lib/config/analytics-constants';
import { AnalyticsErrorBoundary, AnalyticsCardWrapper, ChartErrorFallback } from '@/components/error/analytics-error-boundary';
import { analyticsExportService, type ExportFormat } from '@/lib/services/analytics-export-service';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { SystemHealthDisplay } from './system-health-display';

interface AnalyticsData {
  overview: {
    totalUsers: number;
    activeUsers: number;
    totalSessions: number;
    completedSessions: number;
    revenue: number;
    averageRating: number;
    // Previous month data for growth calculations
    previousMonth?: {
      totalUsers: number;
      activeUsers: number;
      totalSessions: number;
      revenue: number;
    };
  };
  userGrowth: Array<{
    date: string;
    newUsers: number;
    activeUsers: number;
  }>;
  sessionMetrics: Array<{
    date: string;
    totalSessions: number;
    completedSessions: number;
    cancelledSessions: number;
  }>;
  coachPerformance: Array<{
    coachId: string;
    coachName: string;
    totalSessions: number;
    averageRating: number;
    revenue: number;
  }>;
}

export function AdminAnalyticsPage() {
  const t = useTranslations('admin.analytics');
  const router = useRouter();
  const locale = useLocale();
  const [timeRange, setTimeRange] = useState('30d');
  const [isExporting, setIsExporting] = useState(false);
  const [systemHealthOpen, setSystemHealthOpen] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const { data: analytics, isLoading, error, refetch } = useQuery<AnalyticsData>({
    queryKey: ['admin-analytics', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/admin/analytics?timeRange=${timeRange}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }
      
      const result = await response.json();
      return result.data;
    },
  });

  // Helper function to format growth percentage
  const formatGrowthRate = (current: number, previous: number | undefined, fallbackKey: 'users' | 'sessions' | 'completion' | 'revenue') => {
    if (!previous) {
      const defaultGrowth = ANALYTICS_CONFIG.DEFAULT_GROWTH_RATES[fallbackKey];
      return `+${defaultGrowth}%`;
    }
    
    const growthRate = getGrowthRateOrDefault(current, previous, fallbackKey);
    const sign = growthRate >= 0 ? '+' : '';
    return `${sign}${growthRate}%`;
  };

  // Helper to get growth rate color
  const getGrowthColor = (current: number, previous: number | undefined) => {
    if (!previous) return 'text-green-600'; // Default to positive
    const rate = (current - previous) / previous;
    return rate >= 0 ? 'text-green-600' : 'text-red-600';
  };

  // Export handler
  const handleExport = async (format: ExportFormat) => {
    if (isExporting) return;
    
    setIsExporting(true);
    try {
      // Calculate date range based on timeRange
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }

      const { blob, filename } = await analyticsExportService.exportData(startDate, endDate, format);
      analyticsExportService.downloadFile(blob, filename);
      
      // Show success message (you could add a toast notification here)
      console.log(`Analytics exported successfully as ${format.toUpperCase()}`);
      
    } catch (error) {
      console.error('Export failed:', error);
      // Create error notification
      const errorMessage = error instanceof Error ? error.message : 'Unknown export error';
      
      // Create an error blob for download as fallback
      const errorBlob = new Blob([
        `Export Error Report\n\nTimestamp: ${new Date().toISOString()}\nFormat: ${format.toUpperCase()}\nError: ${errorMessage}\n\nPlease contact support if this issue persists.`
      ], { type: 'text/plain' });
      
      const errorFilename = `export-error-${Date.now()}.txt`;
      analyticsExportService.downloadFile(errorBlob, errorFilename);
      
      alert(`Export failed: ${errorMessage}\nAn error report has been downloaded for support.`);
    } finally {
      setIsExporting(false);
    }
  };

  // Quick Action Handlers
  const handleManageUsers = () => {
    router.push(`/${locale}/admin/users`);
  };

  const handleViewSessions = () => {
    router.push(`/${locale}/sessions`);
  };

  const handleGenerateReport = async () => {
    if (isGeneratingReport) return;
    
    setIsGeneratingReport(true);
    try {
      // Generate a comprehensive report by exporting all formats
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 30); // Last 30 days
      
      const formats: ExportFormat[] = ['json', 'csv', 'excel', 'pdf'];
      
      for (const format of formats) {
        const { blob, filename } = await analyticsExportService.exportData(startDate, endDate, format);
        analyticsExportService.downloadFile(blob, filename);
        // Add small delay between downloads to prevent browser blocking
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      console.log('Comprehensive report generated successfully');
    } catch (error) {
      console.error('Report generation failed:', error);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleSystemHealth = () => {
    setSystemHealthOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('title')}</h1>
            <p className="text-muted-foreground">{t('description')}</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('title')}</h1>
            <p className="text-muted-foreground">{t('description')}</p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64 text-center">
            <div className="text-destructive mb-4">
              <Activity className="h-12 w-12 mx-auto mb-2" />
              <h3 className="text-lg font-semibold">Analytics Data Unavailable</h3>
            </div>
            <p className="text-muted-foreground mb-4 max-w-md">
              We're experiencing issues loading analytics data. This could be due to:
            </p>
            <ul className="text-sm text-muted-foreground text-left space-y-1 mb-4">
              <li>• Database connection issues</li>
              <li>• Missing database functions</li>
              <li>• Insufficient permissions</li>
              <li>• Network connectivity problems</li>
            </ul>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry Loading
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Refresh Page
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Error: {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Safely calculate completion rate with proper null checks
  const completionRate = (() => {
    if (!analytics?.overview) return 0;
    const { completedSessions, totalSessions } = analytics.overview;
    if (!totalSessions || totalSessions === 0) return 0;
    return Math.round((completedSessions / totalSessions) * 100);
  })();

  return (
    <AnalyticsErrorBoundary onRetry={() => refetch()}>
      <div className="space-y-6">
        {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={isExporting}>
                <Download className="mr-2 h-4 w-4" />
                {isExporting ? 'Exporting...' : 'Export'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('json')}>
                Export as JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('excel')}>
                Export as Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.overview.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              <span className={getGrowthColor(analytics?.overview.totalUsers || 0, analytics?.overview.previousMonth?.totalUsers)}>
                {formatGrowthRate(analytics?.overview.totalUsers || 0, analytics?.overview.previousMonth?.totalUsers, 'users')}
              </span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.overview.activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              <span className={getGrowthColor(analytics?.overview.activeUsers || 0, analytics?.overview.previousMonth?.activeUsers)}>
                {formatGrowthRate(analytics?.overview.activeUsers || 0, analytics?.overview.previousMonth?.activeUsers, 'users')}
              </span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.overview.totalSessions}</div>
            <p className="text-xs text-muted-foreground">
              <span className={getGrowthColor(analytics?.overview.totalSessions || 0, analytics?.overview.previousMonth?.totalSessions)}>
                {formatGrowthRate(analytics?.overview.totalSessions || 0, analytics?.overview.previousMonth?.totalSessions, 'sessions')}
              </span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate}%</div>
            <p className="text-xs text-muted-foreground">
              <span className={getGrowthColor(completionRate || 0, analytics?.overview.previousMonth ? Math.round((analytics.overview.completedSessions / analytics.overview.previousMonth.totalSessions) * 100) : undefined)}>
                {formatGrowthRate(completionRate || 0, analytics?.overview.previousMonth ? Math.round((analytics.overview.completedSessions / analytics.overview.previousMonth.totalSessions) * 100) : undefined, 'completion')}
              </span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics?.overview.revenue || 0)}</div>
            <p className="text-xs text-muted-foreground">
              <span className={getGrowthColor(analytics?.overview.revenue || 0, analytics?.overview.previousMonth?.revenue)}>
                {formatGrowthRate(analytics?.overview.revenue || 0, analytics?.overview.previousMonth?.revenue, 'revenue')}
              </span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.overview.averageRating}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+0.2</span> from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <AnalyticsErrorBoundary 
          fallback={<ChartErrorFallback onRetry={() => refetch()} />}
          onRetry={() => refetch()}
        >
          <EnhancedUserGrowthChart 
            data={analytics?.userGrowth || []}
            loading={isLoading}
            height={300}
            enableExport={true}
            enableZoom={true}
            enableBrush={true}
            showTrends={true}
            onDataPointClick={(data, index) => {
              console.log('User growth data point clicked:', data, index);
              // Could show detailed breakdown modal
            }}
            ariaLabel={`User growth chart showing ${analytics?.userGrowth?.length || 0} data points over ${timeRange}`}
          />
        </AnalyticsErrorBoundary>

        {/* Session Metrics Chart */}
        <AnalyticsErrorBoundary 
          fallback={<ChartErrorFallback onRetry={() => refetch()} />}
          onRetry={() => refetch()}
        >
          <EnhancedSessionMetricsChart 
            data={analytics?.sessionMetrics || []}
            loading={isLoading}
            height={300}
            enableExport={true}
            enableZoom={true}
            enableBrush={true}
            showTrends={true}
            onDataPointClick={(data, index) => {
              console.log('Session metrics data point clicked:', data, index);
              // Could navigate to sessions page with date filter
            }}
            ariaLabel={`Session metrics chart showing ${analytics?.sessionMetrics?.length || 0} data points over ${timeRange}`}
          />
        </AnalyticsErrorBoundary>
      </div>

      {/* Coach Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Coaches</CardTitle>
          <CardDescription>Coach performance metrics and rankings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics?.coachPerformance.map((coach, index) => (
              <div key={coach.coachId} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
                    <span className="text-sm font-medium text-primary">#{index + 1}</span>
                  </div>
                  <div>
                    <p className="font-medium">{coach.coachName}</p>
                    <p className="text-sm text-muted-foreground">{coach.totalSessions} sessions</p>
                  </div>
                </div>
                <div className="flex items-center space-x-6 text-sm">
                  <div className="text-center">
                    <p className="font-medium">{coach.averageRating}</p>
                    <p className="text-muted-foreground">Rating</p>
                  </div>
                  <div className="text-center">
                    <p className="font-medium">{formatCurrency(coach.revenue)}</p>
                    <p className="text-muted-foreground">Revenue</p>
                  </div>
                  <Badge variant="secondary">
                    {coach.averageRating >= 4.8 ? 'Excellent' : 
                     coach.averageRating >= 4.5 ? 'Good' : 'Average'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="h-20 flex-col" 
              onClick={handleManageUsers}
            >
              <Users className="h-6 w-6 mb-2" />
              <span>Manage Users</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col" 
              onClick={handleViewSessions}
            >
              <Calendar className="h-6 w-6 mb-2" />
              <span>View Sessions</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col" 
              onClick={handleGenerateReport}
              disabled={isGeneratingReport}
            >
              <BarChart3 className="h-6 w-6 mb-2" />
              <span>{isGeneratingReport ? 'Generating...' : 'Generate Report'}</span>
            </Button>
            <Dialog open={systemHealthOpen} onOpenChange={setSystemHealthOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="h-20 flex-col">
                  <Activity className="h-6 w-6 mb-2" />
                  <span>System Health</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>System Health Status</DialogTitle>
                  <DialogDescription>
                    Current system health and performance metrics
                  </DialogDescription>
                </DialogHeader>
                <SystemHealthDisplay />
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
    </AnalyticsErrorBoundary>
  );
}
