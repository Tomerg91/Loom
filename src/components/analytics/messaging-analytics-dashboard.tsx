'use client';

import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import {
  MessageSquare,
  Eye,
  Heart,
  Reply,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AnalyticsSummary {
  totalMessages: number;
  totalRead: number;
  totalReactions: number;
  totalReplies: number;
  avgResponseTime: number;
  readRate: number;
  replyRate: number;
}

interface AnalyticsData {
  date: string;
  messages_sent?: number;
  total_messages?: number;
  messages_read?: number;
  reactions_added?: number;
  total_reactions?: number;
  replies_sent?: number;
  total_replies?: number;
  avg_response_time_seconds?: number;
}

interface MessagingAnalyticsDashboardProps {
  scope?: 'user' | 'overall';
  conversationId?: string;
}

export function MessagingAnalyticsDashboard({
  scope = 'user',
  conversationId,
}: MessagingAnalyticsDashboardProps) {
  const [dateRange, setDateRange] = useState(30); // days
  const [selectedTab, setSelectedTab] = useState('overview');

  const startDate = format(subDays(new Date(), dateRange), 'yyyy-MM-dd');
  const endDate = format(new Date(), 'yyyy-MM-dd');

  // Fetch analytics data
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['analytics', 'messaging', scope, conversationId, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        scope,
        startDate,
        endDate,
        ...(conversationId && { conversationId }),
      });

      const response = await fetch(`/api/analytics/messaging?${params}`);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      return response.json() as Promise<{
        data: AnalyticsData[];
        summary: AnalyticsSummary;
        period: { startDate: string; endDate: string };
      }>;
    },
  });

  const summary = analyticsData?.summary;
  const chartData = analyticsData?.data?.reverse() || [];

  // Format data for charts
  const formattedChartData = chartData.map(day => ({
    date: format(new Date(day.date), 'MMM d'),
    messages: Number(day.messages_sent || day.total_messages || 0),
    read: Number(day.messages_read || 0),
    reactions: Number(day.reactions_added || day.total_reactions || 0),
    replies: Number(day.replies_sent || day.total_replies || 0),
    responseTime: day.avg_response_time_seconds
      ? Math.round(day.avg_response_time_seconds / 60)
      : 0, // Convert to minutes
  }));

  // Format response time for display
  const formatResponseTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  // Calculate trend (compare first half vs second half of period)
  const calculateTrend = (field: keyof typeof formattedChartData[0]) => {
    if (formattedChartData.length < 2) return 0;

    const midpoint = Math.floor(formattedChartData.length / 2);
    const firstHalf = formattedChartData.slice(0, midpoint);
    const secondHalf = formattedChartData.slice(midpoint);

    const firstAvg = firstHalf.reduce((sum, d) => sum + Number(d[field]), 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + Number(d[field]), 0) / secondHalf.length;

    if (firstAvg === 0) return secondAvg > 0 ? 100 : 0;
    return ((secondAvg - firstAvg) / firstAvg) * 100;
  };

  const TrendIndicator = ({ value }: { value: number }) => {
    if (value > 5) {
      return (
        <span className="flex items-center text-green-600 text-sm">
          <TrendingUp className="h-4 w-4 mr-1" />
          {value.toFixed(1)}%
        </span>
      );
    }
    if (value < -5) {
      return (
        <span className="flex items-center text-red-600 text-sm">
          <TrendingDown className="h-4 w-4 mr-1" />
          {Math.abs(value).toFixed(1)}%
        </span>
      );
    }
    return (
      <span className="flex items-center text-muted-foreground text-sm">
        <Minus className="h-4 w-4 mr-1" />
        No change
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Messaging Analytics</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {format(new Date(startDate), 'MMM d, yyyy')} - {format(new Date(endDate), 'MMM d, yyyy')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={dateRange === 7 ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDateRange(7)}
          >
            7 days
          </Button>
          <Button
            variant={dateRange === 30 ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDateRange(30)}
          >
            30 days
          </Button>
          <Button
            variant={dateRange === 90 ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDateRange(90)}
          >
            90 days
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.totalMessages?.toLocaleString() || 0}
            </div>
            <TrendIndicator value={calculateTrend('messages')} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Read Rate</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.readRate?.toFixed(1) || 0}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.totalRead?.toLocaleString() || 0} messages read
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatResponseTime(summary?.avgResponseTime || 0)}
            </div>
            <TrendIndicator
              value={-calculateTrend('responseTime')} // Negative because lower is better
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((summary?.totalReactions || 0) + (summary?.totalReplies || 0)).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.totalReactions || 0} reactions, {summary?.totalReplies || 0} replies
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="response">Response Time</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Message Activity</CardTitle>
              <CardDescription>Messages sent and read over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={formattedChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="messages"
                    stackId="1"
                    stroke="#8884d8"
                    fill="#8884d8"
                    name="Sent"
                  />
                  <Area
                    type="monotone"
                    dataKey="read"
                    stackId="2"
                    stroke="#82ca9d"
                    fill="#82ca9d"
                    name="Read"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Messages Sent</CardTitle>
              <CardDescription>Daily message volume</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={formattedChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="messages" fill="#8884d8" name="Messages" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Engagement Metrics</CardTitle>
              <CardDescription>Reactions and replies over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={formattedChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="reactions"
                    stroke="#ff7300"
                    name="Reactions"
                  />
                  <Line type="monotone" dataKey="replies" stroke="#387908" name="Replies" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="response" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Response Time</CardTitle>
              <CardDescription>Average time to read messages (in minutes)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={formattedChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="responseTime"
                    stroke="#8884d8"
                    name="Avg Response Time (min)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
