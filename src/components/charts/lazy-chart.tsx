'use client';

import { lazy, Suspense } from 'react';

import { Skeleton } from '@/components/ui/skeleton';

// Lazy load Recharts components to reduce initial bundle size
const LineChart = lazy(() => import('recharts').then(mod => ({ default: mod.LineChart })));
const Line = lazy(() => import('recharts').then(mod => ({ default: mod.Line })));
const AreaChart = lazy(() => import('recharts').then(mod => ({ default: mod.AreaChart })));
const Area = lazy(() => import('recharts').then(mod => ({ default: mod.Area })));
const PieChart = lazy(() => import('recharts').then(mod => ({ default: mod.PieChart })));
const Pie = lazy(() => import('recharts').then(mod => ({ default: mod.Pie })));
const Cell = lazy(() => import('recharts').then(mod => ({ default: mod.Cell })));
const XAxis = lazy(() => import('recharts').then(mod => ({ default: mod.XAxis })));
const YAxis = lazy(() => import('recharts').then(mod => ({ default: mod.YAxis })));
const CartesianGrid = lazy(() => import('recharts').then(mod => ({ default: mod.CartesianGrid })));
const Tooltip = lazy(() => import('recharts').then(mod => ({ default: mod.Tooltip })));
const ResponsiveContainer = lazy(() => import('recharts').then(mod => ({ default: mod.ResponsiveContainer })));

// Chart loading skeleton
const ChartSkeleton = () => (
  <div className="h-64 animate-pulse">
    <Skeleton className="w-full h-full rounded-lg" />
  </div>
);

// Lazy Progress Line Chart
export function LazyProgressChart({ 
  data, 
  _height = 264 
}: { 
  data: Array<{ name: string; mood: number; sessions: number }>;
  height?: number;
}) {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="name" 
              className="text-sm text-gray-600"
            />
            <YAxis className="text-sm text-gray-600" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="mood" 
              stroke="#3B82F6" 
              strokeWidth={2}
              name="Mood Rating"
            />
            <Line 
              type="monotone" 
              dataKey="sessions" 
              stroke="#10B981" 
              strokeWidth={2}
              name="Sessions"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Suspense>
  );
}

// Lazy Goal Pie Chart  
export function LazyGoalChart({ 
  data 
}: { 
  data: Array<{ name: string; value: number; color: string }>;
}) {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Suspense>
  );
}

// Lazy Session Area Chart
export function LazySessionChart({ 
  data 
}: { 
  data: Array<{ name: string; sessions: number }>;
}) {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="name" 
              className="text-sm text-gray-600"
            />
            <YAxis className="text-sm text-gray-600" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Area 
              type="monotone" 
              dataKey="sessions" 
              stroke="#10B981" 
              fill="#10B981"
              fillOpacity={0.3}
              name="Sessions"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Suspense>
  );
}