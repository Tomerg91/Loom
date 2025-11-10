'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Shield,
  FileText,
  Search,
  RefreshCw,
  Download,
  Calendar,
  User,
  Activity,
  AlertCircle,
  CheckCircle,
  Info
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



interface AuditLog {
  id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  user_id: string;
  user_email: string;
  user_role: string;
  ip_address?: string;
  user_agent?: string;
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
}

export function AdminAuditPage() {
  const t = useTranslations('admin.audit');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [dateRange, setDateRange] = useState<string>('7d');

  const { data: auditData, isLoading, error, refetch } = useQuery<AuditLogsData>({
    queryKey: ['admin-audit-logs', actionFilter, dateRange, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        dateRange,
      });

      if (actionFilter !== 'all') {
        params.set('action', actionFilter);
      }

      const response = await fetch(`/api/admin/audit?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }

      const result = await response.json();
      return result.data;
    },
  });

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'error':
        return 'destructive';
      case 'warning':
        return 'secondary';
      case 'info':
      default:
        return 'outline';
    }
  };

  const getSeverityIcon = (severity?: string) => {
    switch (severity) {
      case 'critical':
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4" />;
      case 'info':
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes('create')) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (action.includes('delete')) return <AlertCircle className="h-4 w-4 text-red-600" />;
    if (action.includes('update')) return <Activity className="h-4 w-4 text-blue-600" />;
    return <FileText className="h-4 w-4" />;
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
        format: 'csv',
        dateRange,
      });

      if (actionFilter !== 'all') {
        params.set('action', actionFilter);
      }

      const response = await fetch(`/api/admin/audit/export?${params.toString()}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const filteredLogs = auditData?.logs.filter((log) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      log.action.toLowerCase().includes(searchLower) ||
      log.user_email.toLowerCase().includes(searchLower) ||
      log.resource_type.toLowerCase().includes(searchLower)
    );
  });

  if (isLoading) {
    return <LoadingState title={t('title')} description={t('description')} />;
  }

  if (error) {
    return <ErrorState title={t('title')} description={t('description')} message="Error loading audit logs" />;
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title={t('title')}
        description={t('description')}
        showTimeRange={false}
        showExport={false}
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
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
            <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{auditData?.pagination.totalItems || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(auditData?.logs.map(log => log.user_id)).size || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Events</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {auditData?.logs.filter(log => log.severity === 'critical' || log.severity === 'error').length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Range</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dateRange}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search actions, users, or resources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="create">Create</SelectItem>
            <SelectItem value="update">Update</SelectItem>
            <SelectItem value="delete">Delete</SelectItem>
            <SelectItem value="login">Login</SelectItem>
            <SelectItem value="logout">Logout</SelectItem>
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

      {/* Audit Logs List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Audit Logs
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
                    {getActionIcon(log.action)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">{log.action}</span>
                      <Badge variant={getSeverityColor(log.severity)} className="flex items-center gap-1">
                        {getSeverityIcon(log.severity)}
                        {log.severity || 'info'}
                      </Badge>
                      <Badge variant="outline">{log.resource_type}</Badge>
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
                      </div>
                    )}

                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                          View metadata
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
export default AdminAuditPage;
