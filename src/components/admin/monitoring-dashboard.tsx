'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database, 
  Globe, 
  Monitor, 
  RefreshCw, 
  Server, 
  TrendingUp,
  Users,
  FileText,
  Shield,
  Zap,
  Heart,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import { alertManager } from '@/lib/monitoring/alerting';

// Types for monitoring data
interface SystemHealth {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  checks: {
    database: HealthCheck;
    external_services: HealthCheck;
    system: HealthCheck;
    environment: HealthCheck;
    cache: HealthCheck;
  };
  performance: {
    responseTime: string;
    uptime: string;
    cpuUsage: any;
    nodeVersion: string;
  };
}

interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'slow' | 'degraded';
  latency?: string;
  connected?: boolean;
  error?: string;
  timestamp: string;
}

interface BusinessMetrics {
  user_engagement: {
    active_users_24h: number;
    active_users_7d: number;
    new_users_24h: number;
    avg_session_duration_minutes: number;
    user_retention_7d: number;
  };
  session_metrics: {
    sessions_booked_24h: number;
    sessions_completed_24h: number;
    completion_rate_7d: number;
    avg_session_rating: number;
  };
  file_metrics: {
    files_uploaded_24h: number;
    files_downloaded_24h: number;
    total_storage_used_mb: number;
  };
  auth_metrics: {
    login_attempts_24h: number;
    mfa_adoption_rate: number;
  };
}

interface PerformanceMetrics {
  webVitals: {
    lcp: MetricData;
    fid: MetricData;
    cls: MetricData;
    inp: MetricData;
    ttfb: MetricData;
  };
  customMetrics: {
    routeChangeDuration: MetricData;
    apiResponseTime: MetricData;
    resourceLoadTime: MetricData;
  };
  performanceScore: number;
}

interface MetricData {
  average: number;
  p95: number;
  trend: 'improving' | 'stable' | 'degrading';
  threshold?: number;
  status: 'good' | 'needs-improvement' | 'poor';
}

export default function MonitoringDashboard() {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [businessMetrics, setBusinessMetrics] = useState<BusinessMetrics | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch monitoring data
  const fetchMonitoringData = async () => {
    try {
      setLoading(true);
      
      const [healthResponse, businessResponse, performanceResponse] = await Promise.allSettled([
        fetch('/api/health'),
        fetch('/api/monitoring/business-metrics'),
        fetch('/api/monitoring/performance'),
      ]);

      if (healthResponse.status === 'fulfilled' && healthResponse.value.ok) {
        const healthData = await healthResponse.value.json();
        setSystemHealth(healthData);
      }

      if (businessResponse.status === 'fulfilled' && businessResponse.value.ok) {
        const businessData = await businessResponse.value.json();
        setBusinessMetrics(businessData.metrics);
      }

      if (performanceResponse.status === 'fulfilled' && performanceResponse.value.ok) {
        const performanceData = await performanceResponse.value.json();
        setPerformanceMetrics(performanceData);
      }

      // Get active alerts
      const alerts = alertManager.getActiveAlerts();
      setActiveAlerts(alerts);

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    fetchMonitoringData();

    if (autoRefresh) {
      const interval = setInterval(fetchMonitoringData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Status badge component
  const StatusBadge: React.FC<{ status: string; size?: 'sm' | 'default' }> = ({ status, size = 'default' }) => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'healthy':
        case 'good':
          return 'bg-green-100 text-green-800 border-green-200';
        case 'degraded':
        case 'needs-improvement':
        case 'slow':
          return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'unhealthy':
        case 'poor':
          return 'bg-red-100 text-red-800 border-red-200';
        default:
          return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    };

    const getStatusIcon = (status: string) => {
      switch (status) {
        case 'healthy':
        case 'good':
          return <CheckCircle className="w-3 h-3" />;
        case 'degraded':
        case 'needs-improvement':
        case 'slow':
          return <AlertTriangle className="w-3 h-3" />;
        case 'unhealthy':
        case 'poor':
          return <XCircle className="w-3 h-3" />;
        default:
          return <AlertCircle className="w-3 h-3" />;
      }
    };

    return (
      <Badge 
        variant="outline" 
        className={`${getStatusColor(status)} ${size === 'sm' ? 'text-xs px-2 py-1' : ''} inline-flex items-center gap-1`}
      >
        {getStatusIcon(status)}
        {status}
      </Badge>
    );
  };

  // Metric card component
  const MetricCard: React.FC<{
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    status?: string;
    trend?: 'improving' | 'stable' | 'degrading';
  }> = ({ title, value, subtitle, icon, status, trend }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {icon}
            <div>
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className="text-2xl font-bold">{value}</p>
              {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
            </div>
          </div>
          <div className="text-right">
            {status && <StatusBadge status={status} size="sm" />}
            {trend && (
              <div className={`text-xs mt-1 ${
                trend === 'improving' ? 'text-green-600' : 
                trend === 'degrading' ? 'text-red-600' : 'text-gray-600'
              }`}>
                {trend === 'improving' ? '↗️ Improving' : 
                 trend === 'degrading' ? '↘️ Degrading' : '➡️ Stable'}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading && !systemHealth) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading monitoring data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Monitoring</h1>
          <p className="text-gray-600">
            Real-time system health, performance, and business metrics
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="text-sm text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className={`w-4 h-4 mr-2 ${autoRefresh ? 'text-green-600' : 'text-gray-400'}`} />
            Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchMonitoringData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Active Alerts ({activeAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activeAlerts.slice(0, 5).map((alert, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div className="flex items-center space-x-3">
                    <StatusBadge status={alert.severity} size="sm" />
                    <div>
                      <p className="font-medium">{alert.title}</p>
                      <p className="text-sm text-gray-600">{alert.message}</p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
              {activeAlerts.length > 5 && (
                <p className="text-sm text-gray-600 text-center">
                  And {activeAlerts.length - 5} more alerts...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* System Health Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Heart className="w-5 h-5 mr-2" />
                System Health
              </CardTitle>
              <CardDescription>
                Overall system status and critical component health
              </CardDescription>
            </CardHeader>
            <CardContent>
              {systemHealth ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded-full ${
                        systemHealth.status === 'healthy' ? 'bg-green-500' :
                        systemHealth.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                      }`} />
                      <span className="text-lg font-semibold">
                        {systemHealth.status.charAt(0).toUpperCase() + systemHealth.status.slice(1)}
                      </span>
                      <StatusBadge status={systemHealth.status} />
                    </div>
                    <div className="text-sm text-gray-500">
                      Response time: {systemHealth.performance.responseTime}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Database className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium">Database</span>
                      </div>
                      <StatusBadge status={systemHealth.checks.database.status} size="sm" />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Globe className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium">External Services</span>
                      </div>
                      <StatusBadge status={systemHealth.checks.external_services.status} size="sm" />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Server className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-medium">System Resources</span>
                      </div>
                      <StatusBadge status={systemHealth.checks.system.status} size="sm" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Unable to load system health data
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {businessMetrics && (
              <>
                <MetricCard
                  title="Active Users (24h)"
                  value={businessMetrics.user_engagement.active_users_24h}
                  icon={<Users className="w-5 h-5 text-blue-600" />}
                  subtitle={`${businessMetrics.user_engagement.new_users_24h} new today`}
                />
                <MetricCard
                  title="Sessions Today"
                  value={businessMetrics.session_metrics.sessions_booked_24h}
                  icon={<Clock className="w-5 h-5 text-green-600" />}
                  subtitle={`${businessMetrics.session_metrics.sessions_completed_24h} completed`}
                />
                <MetricCard
                  title="Files Uploaded"
                  value={businessMetrics.file_metrics.files_uploaded_24h}
                  icon={<FileText className="w-5 h-5 text-purple-600" />}
                  subtitle={`${businessMetrics.file_metrics.files_downloaded_24h} downloads`}
                />
                <MetricCard
                  title="System Uptime"
                  value={systemHealth?.performance.uptime || 'N/A'}
                  icon={<Clock className="w-5 h-5 text-orange-600" />}
                  status={systemHealth?.status || 'unknown'}
                />
              </>
            )}
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Core Web Vitals */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="w-5 h-5 mr-2" />
                  Core Web Vitals
                </CardTitle>
                <CardDescription>
                  Google's core metrics for user experience
                </CardDescription>
              </CardHeader>
              <CardContent>
                {performanceMetrics ? (
                  <div className="space-y-4">
                    {Object.entries(performanceMetrics.webVitals).map(([key, metric]) => (
                      <div key={key} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{key.toUpperCase()}</p>
                          <p className="text-sm text-gray-600">
                            Avg: {metric.average}ms | P95: {metric.p95}ms
                          </p>
                        </div>
                        <div className="text-right">
                          <StatusBadge status={metric.status} size="sm" />
                          <div className={`text-xs mt-1 ${
                            metric.trend === 'improving' ? 'text-green-600' : 
                            metric.trend === 'degrading' ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {metric.trend}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No performance data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Custom Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Monitor className="w-5 h-5 mr-2" />
                  Custom Metrics
                </CardTitle>
                <CardDescription>
                  Application-specific performance metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                {performanceMetrics ? (
                  <div className="space-y-4">
                    {Object.entries(performanceMetrics.customMetrics).map(([key, metric]) => (
                      <div key={key} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                          <p className="text-sm text-gray-600">
                            Avg: {metric.average}ms | P95: {metric.p95}ms
                          </p>
                        </div>
                        <div className={`text-xs ${
                          metric.trend === 'improving' ? 'text-green-600' : 
                          metric.trend === 'degrading' ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {metric.trend}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No custom metrics available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Performance Score */}
          {performanceMetrics && (
            <Card>
              <CardHeader>
                <CardTitle>Overall Performance Score</CardTitle>
                <CardDescription>
                  Composite score based on all performance metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <Progress value={performanceMetrics.performanceScore} className="h-3" />
                  </div>
                  <div className="text-2xl font-bold">
                    {performanceMetrics.performanceScore}/100
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {performanceMetrics.performanceScore >= 90 ? 'Excellent performance' :
                   performanceMetrics.performanceScore >= 75 ? 'Good performance' :
                   performanceMetrics.performanceScore >= 50 ? 'Needs improvement' :
                   'Poor performance'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Business Tab */}
        <TabsContent value="business" className="space-y-6">
          {businessMetrics ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* User Engagement */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="w-5 h-5 mr-2" />
                    User Engagement
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Users (24h)</p>
                      <p className="text-2xl font-bold">{businessMetrics.user_engagement.active_users_24h}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Users (7d)</p>
                      <p className="text-2xl font-bold">{businessMetrics.user_engagement.active_users_7d}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">New Users (24h)</p>
                      <p className="text-2xl font-bold">{businessMetrics.user_engagement.new_users_24h}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Avg Session (min)</p>
                      <p className="text-2xl font-bold">{businessMetrics.user_engagement.avg_session_duration_minutes}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">User Retention (7d)</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Progress value={businessMetrics.user_engagement.user_retention_7d} className="flex-1" />
                      <span className="text-sm font-medium">{businessMetrics.user_engagement.user_retention_7d}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Session Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    Session Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Booked (24h)</p>
                      <p className="text-2xl font-bold">{businessMetrics.session_metrics.sessions_booked_24h}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Completed (24h)</p>
                      <p className="text-2xl font-bold">{businessMetrics.session_metrics.sessions_completed_24h}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Avg Rating</p>
                      <p className="text-2xl font-bold">{businessMetrics.session_metrics.avg_session_rating}/5</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                      <p className="text-2xl font-bold">{businessMetrics.session_metrics.completion_rate_7d}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* File Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    File Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Uploaded (24h)</p>
                      <p className="text-2xl font-bold">{businessMetrics.file_metrics.files_uploaded_24h}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Downloaded (24h)</p>
                      <p className="text-2xl font-bold">{businessMetrics.file_metrics.files_downloaded_24h}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-gray-600">Total Storage Used</p>
                      <p className="text-2xl font-bold">{businessMetrics.file_metrics.total_storage_used_mb} MB</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Auth Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="w-5 h-5 mr-2" />
                    Authentication
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Login Attempts (24h)</p>
                      <p className="text-2xl font-bold">{businessMetrics.auth_metrics.login_attempts_24h}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">MFA Adoption</p>
                      <p className="text-2xl font-bold">{businessMetrics.auth_metrics.mfa_adoption_rate}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No business metrics available
            </div>
          )}
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-6">
          {systemHealth ? (
            <div className="space-y-6">
              {/* Detailed System Checks */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Object.entries(systemHealth.checks).map(([key, check]) => (
                  <Card key={key}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="capitalize">{key.replace('_', ' ')}</span>
                        <StatusBadge status={check.status} />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        {check.latency && (
                          <div className="flex justify-between">
                            <span>Latency:</span>
                            <span className="font-mono">{check.latency}</span>
                          </div>
                        )}
                        {check.connected !== undefined && (
                          <div className="flex justify-between">
                            <span>Connected:</span>
                            <span className={check.connected ? 'text-green-600' : 'text-red-600'}>
                              {check.connected ? 'Yes' : 'No'}
                            </span>
                          </div>
                        )}
                        {check.error && (
                          <div className="flex justify-between">
                            <span>Error:</span>
                            <span className="font-mono text-red-600 text-xs">{check.error}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>Last Check:</span>
                          <span className="text-gray-500">
                            {new Date(check.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* System Performance Details */}
              <Card>
                <CardHeader>
                  <CardTitle>System Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-2">Response Time</p>
                      <p className="text-2xl font-bold">{systemHealth.performance.responseTime}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-2">Uptime</p>
                      <p className="text-2xl font-bold">{systemHealth.performance.uptime}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-2">Node.js Version</p>
                      <p className="text-2xl font-bold">{systemHealth.performance.nodeVersion}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No system health data available
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

