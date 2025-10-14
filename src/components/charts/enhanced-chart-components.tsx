'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Brush,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// Theme colors for consistent styling
const ENHANCED_CHART_COLORS = {
  primary: '#3B82F6',
  secondary: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#8B5CF6',
  success: '#059669',
  muted: '#6B7280',
  gradient: {
    primary: 'url(#primaryGradient)',
    secondary: 'url(#secondaryGradient)',
  }
};

// Enhanced base props for interactive charts
interface EnhancedBaseChartProps {
  title?: string;
  description?: string;
  className?: string;
  height?: number;
  loading?: boolean;
  enableExport?: boolean;
  enableBrush?: boolean;
  enableZoom?: boolean;
  showTrends?: boolean;
  ariaLabel?: string;
  onDataPointClick?: (data: any, index: number) => void;
}

type ChartStateWithActiveTooltip = {
  activeTooltipIndex?: number | string | null;
};

// Custom tooltip with enhanced styling and accessibility
const EnhancedTooltip = ({ active, payload, label, formatter }: any) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-background border border-border rounded-lg shadow-lg p-3" role="tooltip">
      <p className="font-medium text-sm mb-2">{label}</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2 text-xs">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: entry.color }}
            aria-hidden="true"
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">
            {formatter ? formatter(entry.value, entry.name) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// Export functionality for charts
const useChartExport = () => {
  const exportChart = (
    chartRef: React.RefObject<HTMLDivElement | null>,
    filename: string,
    format: 'png' | 'svg' | 'pdf'
  ) => {
    if (!chartRef.current) return;

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const svg = chartRef.current.querySelector('svg');
      
      if (format === 'svg' && svg) {
        const svgData = new XMLSerializer().serializeToString(svg);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.svg`;
        link.click();
        URL.revokeObjectURL(url);
      }
      // For PNG/PDF, would need additional libraries like html2canvas or puppeteer
      else {
        console.warn('PNG/PDF export requires additional dependencies');
      }
    } catch (error) {
      console.error('Chart export failed:', error);
    }
  };

  return { exportChart };
};

// Enhanced User Growth Chart with interactions
interface EnhancedUserGrowthChartProps extends EnhancedBaseChartProps {
  data: Array<{
    date: string;
    newUsers: number;
    activeUsers: number;
    totalUsers?: number;
  }>;
}

export const EnhancedUserGrowthChart: React.FC<EnhancedUserGrowthChartProps> = ({
  data,
  title = "User Growth Analytics",
  description = "Interactive user growth trends with drill-down capabilities",
  className,
  height = 300,
  loading = false,
  enableExport = true,
  enableBrush = true,
  enableZoom = false,
  showTrends = true,
  ariaLabel = "User growth chart showing new and active users over time",
  onDataPointClick,
}) => {
  const [selectedMetric, setSelectedMetric] = useState<'both' | 'newUsers' | 'activeUsers'>('both');
  const [zoomDomain, setZoomDomain] = useState<[string, string] | undefined>(() =>
    data.length > 0 ? [data[0].date, data[data.length - 1].date] : undefined
  );
  const chartRef = useRef<HTMLDivElement | null>(null);
  const { exportChart } = useChartExport();

  const handleChartClick = useCallback(
    (chartState: ChartStateWithActiveTooltip | undefined) => {
      if (!onDataPointClick || !chartState) {
        return;
      }

      const activeIndex = chartState.activeTooltipIndex;

      if (typeof activeIndex === 'number' && activeIndex >= 0) {
        const point = data[activeIndex];

        if (point) {
          onDataPointClick(point, activeIndex);
          return;
        }
      }

      if (typeof activeIndex === 'string') {
        const derivedIndex = data.findIndex(item => item.date === activeIndex);

        if (derivedIndex >= 0) {
          onDataPointClick(data[derivedIndex], derivedIndex);
        }
      }
    },
    [data, onDataPointClick]
  );

  useEffect(() => {
    if (data.length > 0) {
      setZoomDomain([data[0].date, data[data.length - 1].date]);
    } else {
      setZoomDomain(undefined);
    }
  }, [data]);

  const handleBrushChange = useCallback(
    (range: { startIndex?: number | null; endIndex?: number | null } | undefined) => {
      if (
        range &&
        typeof range.startIndex === 'number' &&
        typeof range.endIndex === 'number'
      ) {
        const startPoint = data[range.startIndex];
        const endPoint = data[range.endIndex];

        if (startPoint && endPoint) {
          setZoomDomain([startPoint.date, endPoint.date]);
          return;
        }
      }

      if (data.length > 0) {
        setZoomDomain([data[0].date, data[data.length - 1].date]);
      } else {
        setZoomDomain(undefined);
      }
    },
    [data]
  );

  // Calculate trends
  const calculateTrend = (data: number[]) => {
    if (data.length < 2) return 0;
    const recent = data.slice(-7).reduce((a, b) => a + b, 0) / Math.min(7, data.length);
    const previous = data.slice(-14, -7).reduce((a, b) => a + b, 0) / Math.min(7, data.length);
    return ((recent - previous) / previous) * 100;
  };

  const newUsersTrend = showTrends ? calculateTrend(data.map(d => d.newUsers)) : 0;
  const activeUsersTrend = showTrends ? calculateTrend(data.map(d => d.activeUsers)) : 0;

  const handleExport = (format: 'png' | 'svg' | 'pdf') => {
    exportChart(chartRef, 'user-growth-chart', format);
  };

  if (loading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardHeader>
          <CardTitle className="h-6 bg-muted rounded w-1/3"></CardTitle>
          <CardDescription className="h-4 bg-muted rounded w-1/2"></CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className} ref={chartRef}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {title}
              {showTrends && (
                <div className="flex gap-2">
                  <Badge variant={newUsersTrend >= 0 ? "default" : "destructive"} className="text-xs">
                    {newUsersTrend >= 0 ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    )}
                    {Math.abs(newUsersTrend).toFixed(1)}%
                  </Badge>
                </div>
              )}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {enableExport && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleExport('svg')}>
                    Export as SVG
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('png')}>
                    Export as PNG
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div 
          role="img" 
          aria-label={ariaLabel}
          tabIndex={0}
          className="focus:outline-none focus:ring-2 focus:ring-primary rounded"
        >
          <ResponsiveContainer width="100%" height={height}>
              <ComposedChart
                data={data}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                onClick={(chartState) => handleChartClick(chartState)}
              >
              <defs>
                <linearGradient id="primaryGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={ENHANCED_CHART_COLORS.primary} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={ENHANCED_CHART_COLORS.primary} stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="secondaryGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={ENHANCED_CHART_COLORS.secondary} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={ENHANCED_CHART_COLORS.secondary} stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              
              <CartesianGrid strokeDasharray="3 3" stroke={ENHANCED_CHART_COLORS.muted} opacity={0.3} />
              <XAxis
                dataKey="date"
                stroke={ENHANCED_CHART_COLORS.muted}
                tick={{ fontSize: 12 }}
                domain={zoomDomain ?? ['auto', 'auto']}
              />
              <YAxis stroke={ENHANCED_CHART_COLORS.muted} tick={{ fontSize: 12 }} />
              <Tooltip content={<EnhancedTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                onClick={(e) => {
                  const metric = e.dataKey as 'newUsers' | 'activeUsers';
                  setSelectedMetric(selectedMetric === metric ? 'both' : metric);
                }}
              />
              
              {(selectedMetric === 'both' || selectedMetric === 'newUsers') && (
                <Area
                  type="monotone"
                  dataKey="newUsers"
                  stroke={ENHANCED_CHART_COLORS.primary}
                  fill="url(#primaryGradient)"
                  strokeWidth={2}
                  name="New Users"
                  dot={{ fill: ENHANCED_CHART_COLORS.primary, strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: ENHANCED_CHART_COLORS.primary, strokeWidth: 2 }}
                />
              )}
              
              {(selectedMetric === 'both' || selectedMetric === 'activeUsers') && (
                <Line
                  type="monotone"
                  dataKey="activeUsers"
                  stroke={ENHANCED_CHART_COLORS.secondary}
                  strokeWidth={2}
                  name="Active Users"
                  dot={{ fill: ENHANCED_CHART_COLORS.secondary, strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: ENHANCED_CHART_COLORS.secondary, strokeWidth: 2 }}
                />
              )}

              {enableBrush && (
                <Brush
                  dataKey="date"
                  height={30}
                  stroke={ENHANCED_CHART_COLORS.primary}
                  onChange={handleBrushChange}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

// Enhanced Session Metrics Chart
interface EnhancedSessionMetricsChartProps extends EnhancedBaseChartProps {
  data: Array<{
    date: string;
    totalSessions: number;
    completedSessions: number;
    cancelledSessions: number;
    scheduledSessions?: number;
    completionRate?: number;
  }>;
}

export const EnhancedSessionMetricsChart: React.FC<EnhancedSessionMetricsChartProps> = ({
  data,
  title = "Session Metrics Analytics",
  description = "Interactive session performance with trend analysis",
  className,
  height = 300,
  loading = false,
  enableExport = true,
  enableBrush = true,
  enableZoom = false,
  showTrends = true,
  ariaLabel = "Session metrics chart showing completed, cancelled, and scheduled sessions over time",
  onDataPointClick,
}) => {
  const [viewMode, setViewMode] = useState<'absolute' | 'percentage'>('absolute');
  const chartRef = useRef<HTMLDivElement | null>(null);
  const { exportChart } = useChartExport();

  // Transform data for percentage view
  const transformedData = viewMode === 'percentage' 
    ? data.map(item => ({
        ...item,
        completedSessions: (item.completedSessions / item.totalSessions) * 100,
        cancelledSessions: (item.cancelledSessions / item.totalSessions) * 100,
        scheduledSessions: ((item.scheduledSessions || 0) / item.totalSessions) * 100,
      }))
    : data;

  const completionTrend = showTrends 
    ? data.slice(-7).reduce((acc, curr) => acc + (curr.completionRate || 0), 0) / 7
    : 0;

  const handleExport = (format: 'png' | 'svg' | 'pdf') => {
    exportChart(chartRef, 'session-metrics-chart', format);
  };

  const handleChartClick = useCallback(
    (chartState: ChartStateWithActiveTooltip | undefined) => {
      if (!onDataPointClick || !chartState) {
        return;
      }

      const activeIndex = chartState.activeTooltipIndex;

      if (typeof activeIndex === 'number' && activeIndex >= 0) {
        const point = transformedData[activeIndex];

        if (point) {
          onDataPointClick(point, activeIndex);
          return;
        }
      }

      if (typeof activeIndex === 'string') {
        const derivedIndex = transformedData.findIndex(item => item.date === activeIndex);

        if (derivedIndex >= 0) {
          onDataPointClick(transformedData[derivedIndex], derivedIndex);
        }
      }
    },
    [onDataPointClick, transformedData]
  );

  if (loading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardHeader>
          <CardTitle className="h-6 bg-muted rounded w-1/3"></CardTitle>
          <CardDescription className="h-4 bg-muted rounded w-1/2"></CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className} ref={chartRef}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {title}
              {showTrends && (
                <Badge variant={completionTrend >= 75 ? "default" : "secondary"} className="text-xs">
                  {completionTrend.toFixed(1)}% completion
                </Badge>
              )}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setViewMode(viewMode === 'absolute' ? 'percentage' : 'absolute')}
              variant="outline"
              size="sm"
            >
              {viewMode === 'absolute' ? '%' : '#'}
            </Button>
            {enableExport && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleExport('svg')}>
                    Export as SVG
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('png')}>
                    Export as PNG
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div 
          role="img" 
          aria-label={ariaLabel}
          tabIndex={0}
          className="focus:outline-none focus:ring-2 focus:ring-primary rounded"
        >
          <ResponsiveContainer width="100%" height={height}>
              <BarChart
                data={transformedData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                onClick={(chartState) => handleChartClick(chartState)}
              >
              <CartesianGrid strokeDasharray="3 3" stroke={ENHANCED_CHART_COLORS.muted} opacity={0.3} />
              <XAxis 
                dataKey="date" 
                stroke={ENHANCED_CHART_COLORS.muted}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                stroke={ENHANCED_CHART_COLORS.muted} 
                tick={{ fontSize: 12 }}
                label={{ 
                  value: viewMode === 'percentage' ? 'Percentage (%)' : 'Sessions', 
                  angle: -90, 
                  position: 'insideLeft' 
                }}
              />
              <Tooltip 
                content={<EnhancedTooltip formatter={(value: number) => 
                  viewMode === 'percentage' ? `${value.toFixed(1)}%` : value.toString()
                } />} 
              />
              <Legend />
              
              <Bar 
                dataKey="completedSessions" 
                name="Completed" 
                fill={ENHANCED_CHART_COLORS.success}
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="cancelledSessions" 
                name="Cancelled" 
                fill={ENHANCED_CHART_COLORS.danger}
                radius={[4, 4, 0, 0]}
              />
              {transformedData[0]?.scheduledSessions !== undefined && (
                <Bar 
                  dataKey="scheduledSessions" 
                  name="Scheduled" 
                  fill={ENHANCED_CHART_COLORS.info}
                  radius={[4, 4, 0, 0]}
                />
              )}

              {enableBrush && (
                <Brush 
                  dataKey="date" 
                  height={30} 
                  stroke={ENHANCED_CHART_COLORS.primary}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};