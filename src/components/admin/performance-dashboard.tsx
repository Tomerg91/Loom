'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Database,
  Zap,
  Activity,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface PerformanceMetric {
  category: string;
  metric_name: string;
  metric_value: number;
  metric_unit: string;
  status: string;
  description: string;
}

interface QueryPerformance {
  query_type: string;
  query_pattern: string;
  calls: number;
  mean_exec_time_ms: number;
  total_exec_time_ms: number;
  rows_returned: number;
}

interface MFAQueryPerformance extends QueryPerformance {
  improvement_estimate: string;
}

interface ResourceQueryPerformance extends QueryPerformance {
  rls_status: string;
}

interface SlowQuery {
  query_id: number;
  query_text: string;
  calls: number;
  mean_exec_time_ms: number;
  max_exec_time_ms: number;
  optimization_priority: string;
  cache_hit_ratio: number;
}

interface PerformanceData {
  metrics: {
    mfa: PerformanceMetric[];
    resource_library: PerformanceMetric[];
    overall: PerformanceMetric[];
    cache: PerformanceMetric[];
  };
  mfa: {
    queries: MFAQueryPerformance[];
    improvements: {
      status: string;
      materializedViewAvg: number;
      legacyAvg: number | null;
      improvementPercentage: number;
      targetImprovement: number;
      meetsTarget: boolean;
    };
  };
  resourceLibrary: {
    queries: ResourceQueryPerformance[];
    improvements: {
      status: string;
      averageExecutionTime: number;
      optimizationRate: number;
      improvementPercentage: number;
      targetImprovement: string;
      meetsTarget: boolean;
    };
  };
  slowQueries: SlowQuery[];
  threshold: {
    slowQuery: number;
    unit: string;
  };
  timestamp: string;
}

export function PerformanceDashboard() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const slowQueryThreshold = 100;

  const fetchPerformanceData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/performance-metrics?slowQueryThreshold=${slowQueryThreshold}`);
      if (!response.ok) {
        throw new Error('Failed to fetch performance metrics');
      }
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error fetching performance data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const resetStats = async () => {
    if (!confirm('Are you sure you want to reset performance statistics? This will clear all current metrics.')) {
      return;
    }

    try {
      const response = await fetch('/api/admin/performance-metrics', { method: 'POST' });
      if (!response.ok) {
        throw new Error('Failed to reset statistics');
      }
      await fetchPerformanceData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error resetting stats:', err);
    }
  };

  useEffect(() => {
    fetchPerformanceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slowQueryThreshold]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading performance metrics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-700">Error Loading Performance Metrics</CardTitle>
          <CardDescription className="text-red-600">{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={fetchPerformanceData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; icon?: React.ComponentType<{ className?: string }> }> = {
      excellent: { className: 'bg-green-100 text-green-800', icon: CheckCircle },
      good: { className: 'bg-blue-100 text-blue-800', icon: TrendingUp },
      warning: { className: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
      error: { className: 'bg-red-100 text-red-800', icon: AlertTriangle },
      needs_optimization: { className: 'bg-orange-100 text-orange-800', icon: TrendingDown },
    };

    const variant = variants[status] || variants.info;
    const Icon = variant.icon;

    return (
      <Badge className={variant.className}>
        {Icon && <Icon className="h-3 w-3 mr-1" />}
        {status.replace(/_/g, ' ').toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Database Performance Monitoring</h1>
          <p className="text-muted-foreground mt-1">
            Track query performance improvements from database refactoring
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={resetStats} variant="outline" size="sm">
            Reset Stats
          </Button>
          <Button onClick={fetchPerformanceData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* MFA Performance Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4" />
              MFA Queries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold">
                  {data.mfa.improvements.improvementPercentage}%
                </span>
                <span className="text-sm text-muted-foreground">improvement</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(data.mfa.improvements.status)}
                {data.mfa.improvements.meetsTarget && (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    Target: 80%
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Avg: {data.mfa.improvements.materializedViewAvg.toFixed(2)}ms
                {data.mfa.improvements.legacyAvg && (
                  <> (was {data.mfa.improvements.legacyAvg.toFixed(2)}ms)</>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Resource Library Performance Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Resource Library Queries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold">
                  {data.resourceLibrary.improvements.improvementPercentage}%
                </span>
                <span className="text-sm text-muted-foreground">improvement</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(data.resourceLibrary.improvements.status)}
                {data.resourceLibrary.improvements.meetsTarget && (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    Target: 30-50%
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Avg: {data.resourceLibrary.improvements.averageExecutionTime}ms
                <br />
                {data.resourceLibrary.improvements.optimizationRate}% queries optimized
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Slow Queries Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Slow Queries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold">{data.slowQueries.length}</span>
                <span className="text-sm text-muted-foreground">
                  &gt;{data.threshold.slowQuery}
                  {data.threshold.unit}
                </span>
              </div>
              <div>
                {data.slowQueries.length === 0 ? (
                  getStatusBadge('excellent')
                ) : data.slowQueries.length < 10 ? (
                  getStatusBadge('good')
                ) : (
                  getStatusBadge('warning')
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {data.slowQueries.filter((q) => q.optimization_priority === 'CRITICAL').length} critical queries
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="mfa">MFA Queries</TabsTrigger>
          <TabsTrigger value="resources">Resource Library</TabsTrigger>
          <TabsTrigger value="slow">Slow Queries</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* MFA Query Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle>MFA Query Performance</CardTitle>
                <CardDescription>Execution time comparison (target: 80% improvement)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={data.mfa.queries.map((q) => ({
                      name: q.query_type,
                      time: q.mean_exec_time_ms,
                      calls: q.calls,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis label={{ value: 'Time (ms)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="time" fill="#3b82f6" name="Avg Time (ms)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Resource Library Query Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Resource Library Query Performance</CardTitle>
                <CardDescription>Execution time by query type (target: 30-50% improvement)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={data.resourceLibrary.queries.slice(0, 10).map((q) => ({
                      name: q.query_type,
                      time: q.mean_exec_time_ms,
                      calls: q.calls,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis label={{ value: 'Time (ms)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="time" fill="#10b981" name="Avg Time (ms)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Performance Metrics Table */}
          <Card>
            <CardHeader>
              <CardTitle>Overall Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(data.metrics).map(([category, metrics]) =>
                  metrics.length > 0 ? (
                    <div key={category} className="space-y-2">
                      <h3 className="font-semibold capitalize">{category.replace(/_/g, ' ')}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {metrics.map((metric, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div>
                              <p className="text-sm font-medium">{metric.description}</p>
                              <p className="text-xs text-muted-foreground">{metric.metric_name}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold">
                                {metric.metric_value}
                                <span className="text-sm font-normal ml-1">{metric.metric_unit}</span>
                              </p>
                              {getStatusBadge(metric.status)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MFA Tab */}
        <TabsContent value="mfa" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>MFA Query Details</CardTitle>
              <CardDescription>
                Tracking 80% improvement from materialized view optimization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.mfa.queries.map((query, idx) => (
                  <div key={idx} className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">{query.query_type}</h4>
                      <Badge>{query.improvement_estimate}</Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Calls:</span>{' '}
                        <span className="font-medium">{query.calls.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Avg Time:</span>{' '}
                        <span className="font-medium">{query.mean_exec_time_ms.toFixed(2)}ms</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total Time:</span>{' '}
                        <span className="font-medium">{query.total_exec_time_ms.toFixed(2)}ms</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Rows:</span>{' '}
                        <span className="font-medium">{query.rows_returned.toLocaleString()}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
                      {query.query_pattern}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resource Library Tab */}
        <TabsContent value="resources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resource Library Query Details</CardTitle>
              <CardDescription>
                Tracking 30-50% improvement from RLS policy optimization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.resourceLibrary.queries.slice(0, 15).map((query, idx) => (
                  <div key={idx} className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">{query.query_type}</h4>
                      <Badge>{query.rls_status}</Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Calls:</span>{' '}
                        <span className="font-medium">{query.calls.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Avg Time:</span>{' '}
                        <span className="font-medium">{query.mean_exec_time_ms.toFixed(2)}ms</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total Time:</span>{' '}
                        <span className="font-medium">{query.total_exec_time_ms.toFixed(2)}ms</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Rows:</span>{' '}
                        <span className="font-medium">{query.rows_returned.toLocaleString()}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
                      {query.query_pattern}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Slow Queries Tab */}
        <TabsContent value="slow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Slow Queries (&gt;{data.threshold.slowQuery}ms)</CardTitle>
              <CardDescription>Queries flagged for optimization</CardDescription>
            </CardHeader>
            <CardContent>
              {data.slowQueries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p>No slow queries detected! All queries are performing well.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.slowQueries.map((query, idx) => (
                    <div key={idx} className="p-4 border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge
                          className={
                            query.optimization_priority === 'CRITICAL'
                              ? 'bg-red-100 text-red-800'
                              : query.optimization_priority === 'HIGH'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-yellow-100 text-yellow-800'
                          }
                        >
                          {query.optimization_priority} PRIORITY
                        </Badge>
                        <span className="text-sm text-muted-foreground">Query ID: {query.query_id}</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Calls:</span>{' '}
                          <span className="font-medium">{query.calls.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Avg Time:</span>{' '}
                          <span className="font-medium">{query.mean_exec_time_ms.toFixed(2)}ms</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Max Time:</span>{' '}
                          <span className="font-medium">{query.max_exec_time_ms.toFixed(2)}ms</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Cache Hit:</span>{' '}
                          <span className="font-medium">{query.cache_hit_ratio.toFixed(1)}%</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
                        {query.query_text}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer Info */}
      <div className="text-xs text-muted-foreground text-center">
        Last updated: {new Date(data.timestamp).toLocaleString()} | Slow query threshold:{' '}
        {data.threshold.slowQuery}
        {data.threshold.unit}
      </div>
    </div>
  );
}
