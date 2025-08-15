'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { 
  Mail, 
  Bell, 
  Smartphone, 
  TrendingUp, 
  TrendingDown,
  Users,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  MousePointer,
  RefreshCw,
  Download,
  Filter,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  AlertTriangle,
  Loader2
} from 'lucide-react';
// import { useToast } from '@/components/ui/enhanced-toast-provider'; // Commented out due to framer-motion dependency
import { useToast } from '@/components/ui/use-toast';
import { formatDistanceToNow, format, subDays, subWeeks, subMonths } from 'date-fns';

interface NotificationAnalytics {
  overview: {
    totalSent: number;
    totalDelivered: number;
    totalOpened: number;
    totalClicked: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
  };
  byChannel: {
    email: {
      sent: number;
      delivered: number;
      opened: number;
      clicked: number;
      bounced: number;
      failed: number;
    };
    push: {
      sent: number;
      delivered: number;
      opened: number;
      clicked: number;
      failed: number;
    };
    inapp: {
      sent: number;
      viewed: number;
      clicked: number;
      dismissed: number;
    };
  };
  byType: Record<string, {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    avgOpenTime: number;
  }>;
  timeSeriesData: Array<{
    date: string;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
  }>;
  topPerformingNotifications: Array<{
    id: string;
    type: string;
    title: string;
    sentCount: number;
    openRate: number;
    clickRate: number;
  }>;
  userEngagement: {
    activeUsers: number;
    engagedUsers: number;
    unsubscribeRate: number;
    avgNotificationsPerUser: number;
  };
  deliveryIssues: Array<{
    id: string;
    type: string;
    channel: string;
    error: string;
    count: number;
    lastOccurred: string;
  }>;
}

interface DeliveryStats {
  channel: string;
  status: string;
  count: number;
  percentage: number;
}

const COLORS = {
  email: '#3B82F6',
  push: '#10B981',
  inapp: '#F59E0B',
  sent: '#6B7280',
  delivered: '#10B981',
  opened: '#3B82F6',
  clicked: '#8B5CF6',
  failed: '#EF4444',
  bounced: '#F97316',
};

export function NotificationAnalyticsDashboard() {
  const toast = useToast();
  const [dateRange, setDateRange] = useState('7d');
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  // Fetch analytics data
  const { data: analytics, isLoading, error, refetch } = useQuery({
    queryKey: ['notification-analytics', dateRange, selectedChannel, selectedType],
    queryFn: async (): Promise<NotificationAnalytics> => {
      const params = new URLSearchParams({
        range: dateRange,
        ...(selectedChannel !== 'all' && { channel: selectedChannel }),
        ...(selectedType !== 'all' && { type: selectedType }),
      });

      const response = await fetch(`/api/admin/notifications/analytics?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      return response.json();
    },
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  // Export analytics data
  const exportAnalyticsMutation = useMutation({
    mutationFn: async (format: 'csv' | 'pdf') => {
      const params = new URLSearchParams({
        range: dateRange,
        format,
        ...(selectedChannel !== 'all' && { channel: selectedChannel }),
        ...(selectedType !== 'all' && { type: selectedType }),
      });

      const response = await fetch(`/api/admin/notifications/analytics/export?${params}`);
      if (!response.ok) {
        throw new Error('Failed to export analytics');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `notification-analytics-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
    onSuccess: (_, format) => {
      toast.toast.success(`Analytics exported as ${format.toUpperCase()}`);
    },
    onError: (error) => {
      toast.toast.error(`Failed to export analytics: ${error.message}`);
    },
  });

  // Calculate percentage change
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  // Format percentage
  const formatPercentage = (value: number, decimals = 1) => {
    return `${value.toFixed(decimals)}%`;
  };

  // Prepare chart data
  const channelData = analytics ? [
    { name: 'Email', sent: analytics.byChannel.email.sent, delivered: analytics.byChannel.email.delivered, color: COLORS.email },
    { name: 'Push', sent: analytics.byChannel.push.sent, delivered: analytics.byChannel.push.delivered, color: COLORS.push },
    { name: 'In-App', sent: analytics.byChannel.inapp.sent, delivered: analytics.byChannel.inapp.sent, color: COLORS.inapp },
  ] : [];

  const deliveryStatusData = analytics ? [
    { name: 'Delivered', value: analytics.overview.totalDelivered, color: COLORS.delivered },
    { name: 'Failed', value: analytics.overview.totalSent - analytics.overview.totalDelivered, color: COLORS.failed },
  ] : [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load notification analytics. Please try again.
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-2" 
            onClick={() => refetch()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notification Analytics</h1>
          <p className="text-muted-foreground">
            Monitor notification performance and delivery metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportAnalyticsMutation.mutate('csv')}
            disabled={exportAnalyticsMutation.isPending}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1d">Last 24 hours</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Channel</Label>
              <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Channels</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="push">Push</SelectItem>
                  <SelectItem value="inapp">In-App</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Notification Type</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="session_reminder">Session Reminders</SelectItem>
                  <SelectItem value="new_message">New Messages</SelectItem>
                  <SelectItem value="system_update">System Updates</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.totalSent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Across all channels
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(analytics.overview.deliveryRate)}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.overview.totalDelivered.toLocaleString()} delivered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(analytics.overview.openRate)}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.overview.totalOpened.toLocaleString()} opened
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(analytics.overview.clickRate)}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.overview.totalClicked.toLocaleString()} clicked
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
        </TabsList>

        {/* Trends Tab */}
        <TabsContent value="trends">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Delivery Trends</CardTitle>
                <CardDescription>Notification delivery over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analytics.timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(date) => format(new Date(date), 'MMM dd')}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(date) => format(new Date(date), 'MMM dd, yyyy')}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="sent" 
                      stackId="1" 
                      stroke={COLORS.sent} 
                      fill={COLORS.sent} 
                      fillOpacity={0.6}
                      name="Sent"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="delivered" 
                      stackId="1" 
                      stroke={COLORS.delivered} 
                      fill={COLORS.delivered} 
                      fillOpacity={0.6}
                      name="Delivered"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Engagement Trends</CardTitle>
                <CardDescription>User engagement over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(date) => format(new Date(date), 'MMM dd')}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(date) => format(new Date(date), 'MMM dd, yyyy')}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="opened" 
                      stroke={COLORS.opened} 
                      strokeWidth={2}
                      name="Opened"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="clicked" 
                      stroke={COLORS.clicked} 
                      strokeWidth={2}
                      name="Clicked"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Channels Tab */}
        <TabsContent value="channels">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Channel Performance</CardTitle>
                <CardDescription>Notifications by delivery channel</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={channelData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="sent" fill={COLORS.sent} name="Sent" />
                    <Bar dataKey="delivered" fill={COLORS.delivered} name="Delivered" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Delivery Status</CardTitle>
                <CardDescription>Overall delivery success rate</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={deliveryStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {deliveryStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Channel Details */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Channel Details</CardTitle>
                <CardDescription>Detailed metrics by channel</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-blue-600" />
                      <h3 className="font-semibold">Email</h3>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Sent:</span>
                        <span className="font-medium">{analytics.byChannel.email.sent.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Delivered:</span>
                        <span className="font-medium">{analytics.byChannel.email.delivered.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Opened:</span>
                        <span className="font-medium">{analytics.byChannel.email.opened.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Clicked:</span>
                        <span className="font-medium">{analytics.byChannel.email.clicked.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Bounced:</span>
                        <span className="font-medium text-orange-600">{analytics.byChannel.email.bounced.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-5 w-5 text-green-600" />
                      <h3 className="font-semibold">Push</h3>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Sent:</span>
                        <span className="font-medium">{analytics.byChannel.push.sent.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Delivered:</span>
                        <span className="font-medium">{analytics.byChannel.push.delivered.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Opened:</span>
                        <span className="font-medium">{analytics.byChannel.push.opened.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Clicked:</span>
                        <span className="font-medium">{analytics.byChannel.push.clicked.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Failed:</span>
                        <span className="font-medium text-red-600">{analytics.byChannel.push.failed.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Bell className="h-5 w-5 text-yellow-600" />
                      <h3 className="font-semibold">In-App</h3>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Sent:</span>
                        <span className="font-medium">{analytics.byChannel.inapp.sent.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Viewed:</span>
                        <span className="font-medium">{analytics.byChannel.inapp.viewed.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Clicked:</span>
                        <span className="font-medium">{analytics.byChannel.inapp.clicked.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Dismissed:</span>
                        <span className="font-medium">{analytics.byChannel.inapp.dismissed.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Notifications</CardTitle>
                <CardDescription>Notifications with highest engagement rates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.topPerformingNotifications.map((notification, index) => (
                    <div key={notification.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
                          <span className="text-sm font-semibold text-primary">{index + 1}</span>
                        </div>
                        <div>
                          <h4 className="font-medium">{notification.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {notification.type.replace('_', ' ')} • {notification.sentCount.toLocaleString()} sent
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className="text-sm font-medium">{formatPercentage(notification.openRate)}</div>
                          <div className="text-xs text-muted-foreground">Open Rate</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium">{formatPercentage(notification.clickRate)}</div>
                          <div className="text-xs text-muted-foreground">Click Rate</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Engagement</CardTitle>
                <CardDescription>User behavior and engagement metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">{analytics.userEngagement.activeUsers.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Active Users</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">{analytics.userEngagement.engagedUsers.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Engaged Users</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">{analytics.userEngagement.avgNotificationsPerUser.toFixed(1)}</div>
                    <div className="text-sm text-muted-foreground">Avg per User</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">{formatPercentage(analytics.userEngagement.unsubscribeRate)}</div>
                    <div className="text-sm text-muted-foreground">Unsubscribe Rate</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Issues Tab */}
        <TabsContent value="issues">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                Delivery Issues
              </CardTitle>
              <CardDescription>Common delivery problems and errors</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.deliveryIssues.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
                    <p>No delivery issues detected</p>
                  </div>
                ) : (
                  analytics.deliveryIssues.map((issue) => (
                    <div key={issue.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {issue.channel === 'email' && <Mail className="h-4 w-4" />}
                          {issue.channel === 'push' && <Smartphone className="h-4 w-4" />}
                          {issue.channel === 'inapp' && <Bell className="h-4 w-4" />}
                          <Badge variant="outline">{issue.channel}</Badge>
                        </div>
                        <div>
                          <h4 className="font-medium">{issue.error}</h4>
                          <p className="text-sm text-muted-foreground">
                            {issue.type} • Occurred {issue.count} times
                          </p>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(issue.lastOccurred), { addSuffix: true })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}