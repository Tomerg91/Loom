'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Shield,
  Key,
  Search,
  RefreshCw,
  Download,
  Calendar,
  User,
  Activity,
  AlertCircle,
  CheckCircle,
  Info,
  Filter
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { DashboardHeader, LoadingState, ErrorState } from '@/components/dashboard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

interface AuditLog {
  id: string;
  log_type: 'auth' | 'mfa';
  event_type: string;
  action: string;
  resource_type: string;
  user_id?: string;
  user_email: string;
  user_role: string;
  ip_address?: string;
  user_agent?: string;
  device_id?: string;
  success: boolean;
  error_message?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  severity?: 'info' | 'warning' | 'error' | 'critical';
}

interface AuditLogsData {
  logs: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
  filters: {
    type: string;
    userId?: string;
    eventTypes?: string[];
    startDate?: string;
    endDate?: string;
  };
}

export function AuthAuditLogsPage() {
  const t = useTranslations('admin.audit');
  const [searchTerm, setSearchTerm] = useState('');
  const [logType, setLogType] = useState<'all' | 'auth' | 'mfa'>('all');
  const [successFilter, setSuccessFilter] = useState<'all' | 'success' | 'failure'>('all');
  const [page, setPage] = useState(1);
  const [dateRange, setDateRange] = useState<string>('7d');

  const { data: auditData, isLoading, error, refetch } = useQuery<AuditLogsData>({
    queryKey: ['admin-auth-audit-logs', logType, dateRange, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        type: logType,
        page: page.toString(),
        limit: '50',
        offset: ((page - 1) * 50).toString(),
        dateRange,
      });

      const response = await fetch(`/api/admin/audit-logs?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }

      const result = await response.json();
      return result.data;
    },
  });

  const getSeverityColor = (severity?: string, success?: boolean) => {
    if (success === false) return 'destructive';
    switch (severity) {
      case 'critical':
      case 'error':
        return 'destructive';
      case 'warning':
        return 'secondary';
      case 'info':
      default:
        return 'outline';
    }
  };

  const getSeverityIcon = (severity?: string, success?: boolean) => {
    if (success === false) {
      return <AlertCircle className="h-4 w-4" />;
    }
    switch (severity) {
      case 'critical':
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4" />;
      case 'info':
      default:
        return <CheckCircle className="h-4 w-4" />;
    }
  };

  const getActionIcon = (logType: string) => {
    if (logType === 'mfa') return <Key className="h-4 w-4 text-purple-600" />;
    return <Shield className="h-4 w-4 text-blue-600" />;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        type: logType,
        dateRange,
      });

      const response = await fetch(`/api/admin/audit-logs?${params.toString()}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Export failed with status ${response.status}`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `auth-audit-logs-${new Date().toISOString()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const filteredLogs = auditData?.logs.filter((log) => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matches =
        log.event_type.toLowerCase().includes(searchLower) ||
        log.user_email.toLowerCase().includes(searchLower) ||
        log.resource_type.toLowerCase().includes(searchLower) ||
        log.ip_address?.toLowerCase().includes(searchLower);

      if (!matches) return false;
    }

    // Success filter
    if (successFilter !== 'all') {
      if (successFilter === 'success' && !log.success) return false;
      if (successFilter === 'failure' && log.success) return false;
    }

    return true;
  });

  const getEventTypeLabel = (eventType: string): string => {
    return eventType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (isLoading) {
    return <LoadingState title="Authentication Audit Logs" description="Loading audit logs..." />;
  }

  if (error) {
    return <ErrorState title="Authentication Audit Logs" description="Security event monitoring" message="Error loading audit logs" />;
  }

  const authEvents = auditData?.logs.filter(log => log.log_type === 'auth') || [];
  const mfaEvents = auditData?.logs.filter(log => log.log_type === 'mfa') || [];
  const failedEvents = auditData?.logs.filter(log => !log.success) || [];

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Authentication & Security Audit Logs"
        description="Monitor authentication events, session management, and MFA activities"
        showTimeRange={false}
        showExport={false}
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </DashboardHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{auditData?.pagination.totalItems || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Auth Events</CardTitle>
            <Shield className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{authEvents.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MFA Events</CardTitle>
            <Key className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mfaEvents.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Events</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{failedEvents.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search events, users, or IP addresses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Tabs value={logType} onValueChange={(value) => setLogType(value as any)} className="w-full sm:w-auto">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="auth">Auth</TabsTrigger>
                <TabsTrigger value="mfa">MFA</TabsTrigger>
              </TabsList>
            </Tabs>

            <Select value={successFilter} onValueChange={(value) => setSuccessFilter(value as any)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Success filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="success">Success Only</SelectItem>
                <SelectItem value="failure">Failures Only</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1d">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Event Log
          </CardTitle>
          <CardDescription>
            Showing {filteredLogs?.length || 0} of {auditData?.pagination.totalItems || 0} log entries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredLogs && filteredLogs.length > 0 ? (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="mt-1">
                    {getActionIcon(log.log_type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="font-medium">{getEventTypeLabel(log.event_type)}</span>
                      <Badge variant={getSeverityColor(log.severity, log.success)} className="flex items-center gap-1">
                        {getSeverityIcon(log.severity, log.success)}
                        {log.success ? 'Success' : 'Failed'}
                      </Badge>
                      <Badge variant="outline">{log.log_type.toUpperCase()}</Badge>
                      {log.device_id && (
                        <Badge variant="secondary">Trusted Device</Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3" />
                        {log.user_email} ({log.user_role})
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        {formatDate(log.created_at)}
                      </div>
                    </div>

                    {log.ip_address && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        IP: {log.ip_address}
                        {log.user_agent && ` • ${log.user_agent.substring(0, 50)}...`}
                      </div>
                    )}

                    {log.error_message && (
                      <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
                        <strong>Error:</strong> {log.error_message}
                      </div>
                    )}

                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                          View event details
                        </summary>
                        <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No audit logs found</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {auditData && auditData.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {auditData.pagination.page} of {auditData.pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page >= auditData.pagination.totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Export as default for dynamic imports
export default AuthAuditLogsPage;
