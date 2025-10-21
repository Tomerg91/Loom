'use client';

/**
 * Resource Library Analytics Chart Components
 *
 * Visualization components for resource library analytics:
 * - Top Resources Bar Chart
 * - Category Performance Pie Chart
 * - Engagement Trends Line Chart
 * - Client Activity Heatmap
 * - Resource ROI Chart
 *
 * @module components/resources/analytics-charts
 */

import React from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ResourcePerformanceSummary, CategoryAnalytics } from '@/types/resources';

// Chart colors
const CHART_COLORS = {
  primary: '#3B82F6',
  secondary: '#10B981',
  accent: '#F59E0B',
  danger: '#EF4444',
  success: '#10B981',
  muted: '#6B7280',
};

const CATEGORY_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'
];

// Custom tooltip
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

/**
 * Top Resources Bar Chart
 * Shows the top 10 resources by views and completions
 */
interface TopResourcesChartProps {
  resources: ResourcePerformanceSummary[];
  title?: string;
  description?: string;
}

export function TopResourcesChart({
  resources,
  title = 'Top Resources',
  description = 'Resources ranked by views and completions',
}: TopResourcesChartProps) {
  // Prepare data - limit to top 10
  const chartData = resources.slice(0, 10).map(r => ({
    name: r.filename.length > 25 ? r.filename.substring(0, 25) + '...' : r.filename,
    views: r.viewCount,
    completions: r.completionCount,
    completionRate: Math.round(r.completionRate),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={100}
              tick={{ fontSize: 12 }}
            />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="views" fill={CHART_COLORS.primary} name="Views" />
            <Bar dataKey="completions" fill={CHART_COLORS.success} name="Completions" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

/**
 * Category Performance Pie Chart
 * Shows resource distribution and performance by category
 */
interface CategoryPerformanceChartProps {
  categories: CategoryAnalytics[];
  title?: string;
  description?: string;
  metric?: 'resourceCount' | 'totalViews' | 'totalCompletions';
}

export function CategoryPerformanceChart({
  categories,
  title = 'Category Distribution',
  description = 'Resources by category',
  metric = 'resourceCount',
}: CategoryPerformanceChartProps) {
  const chartData = categories.map(c => ({
    name: c.category,
    value: c[metric],
  }));

  const metricLabel = {
    resourceCount: 'Resources',
    totalViews: 'Views',
    totalCompletions: 'Completions',
  }[metric];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          {categories.map((cat, index) => (
            <div key={cat.category} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
              />
              <span className="text-muted-foreground">
                {cat.category}: {cat[metric]} {metricLabel.toLowerCase()}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Engagement Trends Line Chart
 * Shows views and completions over time
 */
interface EngagementTrendsChartProps {
  data: Array<{ date: string; views: number; completions: number }>;
  title?: string;
  description?: string;
}

export function EngagementTrendsChart({
  data,
  title = 'Engagement Trends',
  description = 'Views and completions over time',
}: EngagementTrendsChartProps) {
  const chartData = data.map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    views: d.views,
    completions: d.completions,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="views"
              stroke={CHART_COLORS.primary}
              strokeWidth={2}
              name="Views"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="completions"
              stroke={CHART_COLORS.success}
              strokeWidth={2}
              name="Completions"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

/**
 * Completion Rate by Category Bar Chart
 * Shows average completion rate for each category
 */
interface CompletionRateChartProps {
  categories: CategoryAnalytics[];
  title?: string;
  description?: string;
}

export function CompletionRateChart({
  categories,
  title = 'Completion Rate by Category',
  description = 'Average completion rate across categories',
}: CompletionRateChartProps) {
  const chartData = categories.map(c => ({
    name: c.category,
    rate: Math.round(c.avgCompletionRate),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="name" />
            <YAxis domain={[0, 100]} label={{ value: 'Completion Rate (%)', angle: -90, position: 'insideLeft' }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="rate" fill={CHART_COLORS.accent} name="Completion Rate (%)" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

/**
 * Resource ROI Chart
 * Shows correlation between resource views and client progress
 * This demonstrates the value/impact of resources
 */
interface ResourceROIChartProps {
  data: Array<{
    resourceName: string;
    views: number;
    completions: number;
    clientProgress: number; // Average progress score
  }>;
  title?: string;
  description?: string;
}

export function ResourceROIChart({
  data,
  title = 'Resource Impact',
  description = 'Correlation between resource engagement and client progress',
}: ResourceROIChartProps) {
  const chartData = data.slice(0, 10).map(d => ({
    name: d.resourceName.length > 20 ? d.resourceName.substring(0, 20) + '...' : d.resourceName,
    completionRate: d.views > 0 ? Math.round((d.completions / d.views) * 100) : 0,
    impact: d.clientProgress,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={100}
              tick={{ fontSize: 12 }}
            />
            <YAxis yAxisId="left" label={{ value: 'Completion Rate (%)', angle: -90, position: 'insideLeft' }} />
            <YAxis yAxisId="right" orientation="right" label={{ value: 'Impact Score', angle: 90, position: 'insideRight' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar yAxisId="left" dataKey="completionRate" fill={CHART_COLORS.primary} name="Completion Rate (%)" />
            <Bar yAxisId="right" dataKey="impact" fill={CHART_COLORS.success} name="Impact Score" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
