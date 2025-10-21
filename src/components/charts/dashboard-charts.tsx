'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  Cell,
  LineChart,
  Line,
} from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import { CHART_COLORS, MULTI_COLORS, CustomTooltip } from './chart-components';

// Coach Performance Horizontal Bar Chart
interface CoachPerformanceChartProps {
  data: Array<{
    name: string;
    revenue: number;
    sessions: number;
    rating: number;
  }>;
  title?: string;
  description?: string;
  className?: string;
  height?: number;
  loading?: boolean;
}

const CoachPerformanceChart: React.FC<CoachPerformanceChartProps> = ({
  data,
  title = "Top Performing Coaches",
  description = "Revenue and session count by coach",
  className,
  height = 400,
  loading = false
}) => {
  if (loading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-48 mb-2" />
          <div className="h-4 bg-gray-100 rounded w-64" />
        </CardHeader>
        <CardContent>
          <div className="h-[400px] bg-gray-100 rounded" />
        </CardContent>
      </Card>
    );
  }

  // Sort by revenue for better visualization
  const sortedData = [...data].sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={sortedData}
            layout="horizontal"
            margin={{ top: 20, right: 30, left: 80, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis 
              type="category" 
              dataKey="name" 
              tick={{ fontSize: 12 }}
              width={70}
            />
            <Tooltip 
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                      <p className="font-medium text-gray-900">{label}</p>
                      <p className="text-sm" style={{ color: CHART_COLORS.primary }}>
                        Revenue: ${data.revenue.toLocaleString()}
                      </p>
                      <p className="text-sm" style={{ color: CHART_COLORS.success }}>
                        Sessions: {data.sessions}
                      </p>
                      <p className="text-sm" style={{ color: CHART_COLORS.accent }}>
                        Rating: {data.rating}/5 ⭐
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar 
              dataKey="revenue" 
              fill={CHART_COLORS.primary}
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// Session Time Distribution Chart
interface SessionTimeDistributionProps {
  data: Array<{
    hour: string;
    sessions: number;
    bookingRate: number;
  }>;
  title?: string;
  description?: string;
  className?: string;
  height?: number;
  loading?: boolean;
}

const SessionTimeDistributionChart: React.FC<SessionTimeDistributionProps> = ({
  data,
  title = "Session Time Distribution",
  description = "Popular booking times throughout the day",
  className,
  height = 300,
  loading = false
}) => {
  if (loading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-48 mb-2" />
          <div className="h-4 bg-gray-100 rounded w-64" />
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
              dataKey="hour" 
              tick={{ fontSize: 12 }}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip 
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                      <p className="font-medium text-gray-900">{label}:00</p>
                      <p className="text-sm" style={{ color: CHART_COLORS.primary }}>
                        Sessions: {data.sessions}
                      </p>
                      <p className="text-sm" style={{ color: CHART_COLORS.success }}>
                        Booking Rate: {data.bookingRate}%
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar 
              dataKey="sessions"
              fill={CHART_COLORS.primary}
              radius={[4, 4, 0, 0]}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`}
                  fill={entry.bookingRate > 80 ? CHART_COLORS.success : 
                        entry.bookingRate > 50 ? CHART_COLORS.accent : 
                        CHART_COLORS.primary}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// Client Progress Correlation Chart
interface ClientProgressCorrelationProps {
  data: Array<{
    clientName: string;
    sessionsCompleted: number;
    progressScore: number;
    goalAchievement: number;
  }>;
  title?: string;
  description?: string;
  className?: string;
  height?: number;
  loading?: boolean;
}

const ClientProgressCorrelationChart: React.FC<ClientProgressCorrelationProps> = ({
  data,
  title = "Client Progress Correlation",
  description = "Sessions completed vs progress achieved",
  className,
  height = 400,
  loading = false
}) => {
  if (loading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-48 mb-2" />
          <div className="h-4 bg-gray-100 rounded w-64" />
        </CardHeader>
        <CardContent>
          <div className="h-[400px] bg-gray-100 rounded" />
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
          <ScatterChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              type="number" 
              dataKey="sessionsCompleted" 
              name="Sessions Completed"
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              type="number" 
              dataKey="progressScore" 
              name="Progress Score"
              domain={[0, 10]}
              tick={{ fontSize: 12 }}
            />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                      <p className="font-medium text-gray-900">{data.clientName}</p>
                      <p className="text-sm text-gray-600">
                        Sessions: {data.sessionsCompleted}
                      </p>
                      <p className="text-sm text-gray-600">
                        Progress: {data.progressScore}/10
                      </p>
                      <p className="text-sm text-gray-600">
                        Goal Achievement: {data.goalAchievement}%
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Scatter 
              dataKey="progressScore" 
              fill={CHART_COLORS.primary}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`}
                  fill={entry.goalAchievement > 80 ? CHART_COLORS.success : 
                        entry.goalAchievement > 50 ? CHART_COLORS.accent : 
                        CHART_COLORS.danger}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// Retention Rate Trend Chart
interface RetentionRateChartProps {
  data: Array<{
    month: string;
    newClients: number;
    retainedClients: number;
    churnRate: number;
  }>;
  title?: string;
  description?: string;
  className?: string;
  height?: number;
  loading?: boolean;
}

const RetentionRateChart: React.FC<RetentionRateChartProps> = ({
  data,
  title = "Client Retention Trends",
  description = "New clients vs retention over time",
  className,
  height = 300,
  loading = false
}) => {
  if (loading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-48 mb-2" />
          <div className="h-4 bg-gray-100 rounded w-64" />
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
              dataKey="month" 
              tick={{ fontSize: 12 }}
            />
            <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
            <Tooltip 
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                      <p className="font-medium text-gray-900">{label}</p>
                      <p className="text-sm" style={{ color: CHART_COLORS.success }}>
                        New Clients: {data.newClients}
                      </p>
                      <p className="text-sm" style={{ color: CHART_COLORS.primary }}>
                        Retained: {data.retainedClients}
                      </p>
                      <p className="text-sm" style={{ color: CHART_COLORS.danger }}>
                        Churn Rate: {data.churnRate}%
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar 
              yAxisId="left"
              dataKey="newClients" 
              fill={CHART_COLORS.success}
              opacity={0.7}
              name="New Clients"
            />
            <Bar 
              yAxisId="left"
              dataKey="retainedClients" 
              fill={CHART_COLORS.primary}
              opacity={0.7}
              name="Retained Clients"
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="churnRate" 
              stroke={CHART_COLORS.danger}
              strokeWidth={3}
              dot={{ r: 4 }}
              name="Churn Rate (%)"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// Goal Category Distribution Chart
interface GoalCategoryChartProps {
  data: Array<{
    category: string;
    count: number;
    successRate: number;
  }>;
  title?: string;
  description?: string;
  className?: string;
  height?: number;
  loading?: boolean;
}

const GoalCategoryChart: React.FC<GoalCategoryChartProps> = ({
  data,
  title = "Goal Categories",
  description = "Distribution and success rates by goal type",
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
              dataKey="category" 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
            <Tooltip 
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                      <p className="font-medium text-gray-900">{label}</p>
                      <p className="text-sm" style={{ color: CHART_COLORS.primary }}>
                        Count: {data.count}
                      </p>
                      <p className="text-sm" style={{ color: CHART_COLORS.success }}>
                        Success Rate: {data.successRate}%
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar 
              yAxisId="left"
              dataKey="count" 
              fill={CHART_COLORS.primary}
              name="Goal Count"
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="successRate" 
              stroke={CHART_COLORS.success}
              strokeWidth={2}
              dot={{ r: 4 }}
              name="Success Rate (%)"
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// Named exports
export {
  CoachPerformanceChart,
  SessionTimeDistributionChart,
  ClientProgressCorrelationChart,
  RetentionRateChart,
  GoalCategoryChart
};

// Dashboard Charts Bundle Component
interface DashboardChartsProps {
  coachData?: Array<{
    name: string;
    revenue: number;
    sessions: number;
    rating: number;
  }>;
  sessionTimeData?: Array<{
    hour: string;
    sessions: number;
    bookingRate: number;
  }>;
  clientProgressData?: Array<{
    clientName: string;
    sessionsCompleted: number;
    progressScore: number;
    goalAchievement: number;
  }>;
  retentionData?: Array<{
    month: string;
    newClients: number;
    retainedClients: number;
    churnRate: number;
  }>;
  goalCategoryData?: Array<{
    category: string;
    count: number;
    successRate: number;
  }>;
  loading?: boolean;
}

const DashboardChartsBundle: React.FC<DashboardChartsProps> = ({
  coachData = [],
  sessionTimeData = [],
  clientProgressData = [],
  retentionData = [],
  goalCategoryData = [],
  loading = false,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {coachData.length > 0 && (
        <CoachPerformanceChart data={coachData} loading={loading} />
      )}
      {sessionTimeData.length > 0 && (
        <SessionTimeDistributionChart data={sessionTimeData} loading={loading} />
      )}
      {clientProgressData.length > 0 && (
        <ClientProgressCorrelationChart data={clientProgressData} loading={loading} />
      )}
      {retentionData.length > 0 && (
        <RetentionRateChart data={retentionData} loading={loading} />
      )}
      {goalCategoryData.length > 0 && (
        <GoalCategoryChart data={goalCategoryData} loading={loading} />
      )}
    </div>
  );
};

// Default export for dynamic imports
export default DashboardChartsBundle;