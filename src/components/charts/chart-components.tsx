'use client';

import React from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Theme colors for consistent styling
const CHART_COLORS = {
  primary: '#3B82F6',
  secondary: '#10B981',
  accent: '#F59E0B',
  danger: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  info: '#3B82F6',
  muted: '#6B7280',
};

const MULTI_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
  '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'
];

// Common chart props interface
interface BaseChartProps {
  title?: string;
  description?: string;
  className?: string;
  height?: number;
  loading?: boolean;
}

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-medium text-gray-900">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }} className="text-sm">
            {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// User Growth Line Chart
interface UserGrowthChartProps extends BaseChartProps {
  data: Array<{
    date: string;
    newUsers: number;
    activeUsers: number;
  }>;
}

export const UserGrowthChart: React.FC<UserGrowthChartProps> = ({
  data,
  title = "User Growth",
  description = "New and active users over time",
  className,
  height = 300,
  loading = false
}) => {
  if (loading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-32 mb-2" />
          <div className="h-4 bg-gray-100 rounded w-48" />
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-gray-100 rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="newUsers" 
              stroke={CHART_COLORS.primary} 
              strokeWidth={2}
              dot={{ r: 4 }}
              name="New Users"
            />
            <Line 
              type="monotone" 
              dataKey="activeUsers" 
              stroke={CHART_COLORS.secondary} 
              strokeWidth={2}
              dot={{ r: 4 }}
              name="Active Users"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// Session Metrics Stacked Bar Chart
interface SessionMetricsChartProps extends BaseChartProps {
  data: Array<{
    date: string;
    totalSessions: number;
    completedSessions: number;
    cancelledSessions: number;
  }>;
}

export const SessionMetricsChart: React.FC<SessionMetricsChartProps> = ({
  data,
  title = "Session Metrics",
  description = "Sessions completed vs cancelled over time",
  className,
  height = 300,
  loading = false
}) => {
  if (loading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-32 mb-2" />
          <div className="h-4 bg-gray-100 rounded w-48" />
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-gray-100 rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="completedSessions" stackId="a" fill={CHART_COLORS.success} name="Completed" />
            <Bar dataKey="cancelledSessions" stackId="a" fill={CHART_COLORS.danger} name="Cancelled" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// Revenue Area Chart
interface RevenueChartProps extends BaseChartProps {
  data: Array<{
    date: string;
    revenue: number;
    sessions: number;
  }>;
}

export const RevenueChart: React.FC<RevenueChartProps> = ({
  data,
  title = "Revenue Trends",
  description = "Daily revenue and session count",
  className,
  height = 300,
  loading = false
}) => {
  if (loading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-32 mb-2" />
          <div className="h-4 bg-gray-100 rounded w-48" />
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-gray-100 rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            />
            <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area 
              yAxisId="left"
              type="monotone" 
              dataKey="revenue" 
              fill={CHART_COLORS.primary} 
              fillOpacity={0.3}
              stroke={CHART_COLORS.primary}
              strokeWidth={2}
              name="Revenue ($)"
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="sessions" 
              stroke={CHART_COLORS.accent} 
              strokeWidth={2}
              dot={{ r: 4 }}
              name="Sessions"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// Progress Multi-Line Chart
interface ProgressChartProps extends BaseChartProps {
  data: Array<{
    date: string;
    progressScore: number;
    mood: number;
    energy: number;
    confidence: number;
  }>;
}

export const ProgressChart: React.FC<ProgressChartProps> = ({
  data,
  title = "Progress Over Time",
  description = "Your growth journey and key metrics",
  className,
  height = 300,
  loading = false
}) => {
  if (loading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-32 mb-2" />
          <div className="h-4 bg-gray-100 rounded w-48" />
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-gray-100 rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            />
            <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="progressScore" 
              stroke={CHART_COLORS.primary} 
              strokeWidth={3}
              dot={{ r: 4 }}
              name="Overall Progress"
            />
            <Line 
              type="monotone" 
              dataKey="mood" 
              stroke={CHART_COLORS.success} 
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Mood"
            />
            <Line 
              type="monotone" 
              dataKey="energy" 
              stroke={CHART_COLORS.accent} 
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Energy"
            />
            <Line 
              type="monotone" 
              dataKey="confidence" 
              stroke={CHART_COLORS.info} 
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Confidence"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// Goal Progress Radial Chart
interface GoalProgressChartProps extends BaseChartProps {
  data: Array<{
    name: string;
    progress: number;
    color?: string;
  }>;
}

export const GoalProgressChart: React.FC<GoalProgressChartProps> = ({
  data,
  title = "Goal Progress",
  description = "Current goal completion status",
  className,
  height = 300,
  loading = false
}) => {
  if (loading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-32 mb-2" />
          <div className="h-4 bg-gray-100 rounded w-48" />
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-gray-100 rounded" />
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((item, index) => ({
    ...item,
    fill: item.color || MULTI_COLORS[index % MULTI_COLORS.length]
  }));

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <RadialBarChart innerRadius="40%" outerRadius="80%" data={chartData}>
            <RadialBar dataKey="progress" cornerRadius={4} />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                      <p className="font-medium text-gray-900">{data.name}</p>
                      <p className="text-sm text-gray-600">{data.progress}% complete</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
          </RadialBarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// Completion Rate Donut Chart
interface CompletionRateChartProps extends BaseChartProps {
  data: Array<{
    name: string;
    value: number;
    color?: string;
  }>;
}

export const CompletionRateChart: React.FC<CompletionRateChartProps> = ({
  data,
  title = "Completion Rate",
  description = "Session completion breakdown",
  className,
  height = 300,
  loading = false
}) => {
  if (loading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-32 mb-2" />
          <div className="h-4 bg-gray-100 rounded w-48" />
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-gray-100 rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color || MULTI_COLORS[index % MULTI_COLORS.length]} 
                />
              ))}
            </Pie>
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0];
                  return (
                    <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                      <p className="font-medium text-gray-900">{data.name}</p>
                      <p className="text-sm text-gray-600">{data.value}%</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// Export all chart components
export {
  CHART_COLORS,
  MULTI_COLORS,
  CustomTooltip
};