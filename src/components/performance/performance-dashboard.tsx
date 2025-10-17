'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  Zap, 
  Clock, 
  Eye,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { collectWebVitals, checkPerformanceBudget } from '@/lib/performance/web-vitals';

interface PerformanceMetrics {
  LCP?: number;
  FID?: number;
  CLS?: number;
  FCP?: number;
  TTFB?: number;
  INP?: number;
}

interface PerformanceData {
  metrics: PerformanceMetrics;
  budget: {
    passed: boolean;
    violations: Array<{
      metric: string;
      value: number;
      budget: number;
      violation: number;
    }>;
  };
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export function PerformanceDashboard() {
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const calculateScore = useCallback((metrics: PerformanceMetrics): number => {
    let score = 100;
    
    if (metrics.LCP && metrics.LCP > 2500) score -= 20;
    if (metrics.FID && metrics.FID > 100) score -= 15;
    if (metrics.CLS && metrics.CLS > 0.1) score -= 20;
    if (metrics.FCP && metrics.FCP > 1800) score -= 15;
    if (metrics.TTFB && metrics.TTFB > 800) score -= 15;
    if (metrics.INP && metrics.INP > 200) score -= 15;
    
    return Math.max(0, score);
  }, []);

  const getGrade = useCallback((score: number): 'A' | 'B' | 'C' | 'D' | 'F' => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }, []);

  const updatePerformanceData = useCallback((metrics: PerformanceMetrics) => {
    const budget = checkPerformanceBudget(metrics as Record<string, number>);
    const score = calculateScore(metrics);
    const grade = getGrade(score);

    setPerformanceData({
      metrics,
      budget,
      score,
      grade
    });
    setIsLoading(false);
  }, [calculateScore, getGrade]);

  useEffect(() => {
    const metrics: PerformanceMetrics = {};
    let metricsReceived = 0;
    const totalMetrics = 6;

    collectWebVitals((metric) => {
      metrics[metric.name as keyof PerformanceMetrics] = metric.value;
      metricsReceived++;
      
      if (metricsReceived >= Math.min(totalMetrics, 3)) {
        updatePerformanceData(metrics);
      }
    });

    // Timeout to show partial results
    const timeout = setTimeout(() => {
      if (metricsReceived > 0) {
        updatePerformanceData(metrics);
      } else {
        setIsLoading(false);
      }
    }, 3000);

    return () => clearTimeout(timeout);
  }, [updatePerformanceData]);

  const getMetricColor = (metric: keyof PerformanceMetrics, value?: number): string => {
    if (!value) return 'text-muted-foreground';
    
    const thresholds = {
      LCP: { good: 2500, poor: 4000 },
      FID: { good: 100, poor: 300 },
      CLS: { good: 0.1, poor: 0.25 },
      FCP: { good: 1800, poor: 3000 },
      TTFB: { good: 800, poor: 1800 },
      INP: { good: 200, poor: 500 }
    };

    const threshold = thresholds[metric];
    if (value <= threshold.good) return 'text-green-600';
    if (value <= threshold.poor) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatMetricValue = (metric: keyof PerformanceMetrics, value?: number): string => {
    if (!value) return '--';

    if (metric === 'CLS') {
      return value.toFixed(3);
    }
    return `${Math.round(value)}ms`;
  };

  const refreshMetrics = () => {
    setIsLoading(true);
    window.location.reload();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Performance Dashboard
            <RefreshCw className="h-4 w-4 animate-spin ml-auto" />
          </CardTitle>
          <CardDescription>Loading performance metrics...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="h-4 bg-muted rounded w-1/3 animate-pulse" />
                <div className="h-4 bg-muted rounded w-16 animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!performanceData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Performance Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Unable to collect performance metrics. This may be expected in development mode.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Performance Dashboard
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={performanceData.grade === 'A' ? 'default' : 
                            performanceData.grade === 'B' ? 'secondary' : 'destructive'}>
                Grade {performanceData.grade}
              </Badge>
              <Button variant="outline" size="sm" onClick={refreshMetrics}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Current page performance score: {performanceData.score}/100
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={performanceData.score} className="h-2" />
            
            {!performanceData.budget.passed && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Performance budget exceeded in {performanceData.budget.violations.length} metric(s)
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="metrics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="metrics">Core Web Vitals</TabsTrigger>
          <TabsTrigger value="budget">Performance Budget</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  LCP
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getMetricColor('LCP', performanceData.metrics.LCP)}`}>
                  {formatMetricValue('LCP', performanceData.metrics.LCP)}
                </div>
                <p className="text-xs text-muted-foreground">Largest Contentful Paint</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  INP
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getMetricColor('INP', performanceData.metrics.INP)}`}>
                  {formatMetricValue('INP', performanceData.metrics.INP)}
                </div>
                <p className="text-xs text-muted-foreground">Interaction to Next Paint</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  CLS
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getMetricColor('CLS', performanceData.metrics.CLS)}`}>
                  {formatMetricValue('CLS', performanceData.metrics.CLS)}
                </div>
                <p className="text-xs text-muted-foreground">Cumulative Layout Shift</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  FCP
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getMetricColor('FCP', performanceData.metrics.FCP)}`}>
                  {formatMetricValue('FCP', performanceData.metrics.FCP)}
                </div>
                <p className="text-xs text-muted-foreground">First Contentful Paint</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  TTFB
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getMetricColor('TTFB', performanceData.metrics.TTFB)}`}>
                  {formatMetricValue('TTFB', performanceData.metrics.TTFB)}
                </div>
                <p className="text-xs text-muted-foreground">Time to First Byte</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  FID
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getMetricColor('FID', performanceData.metrics.FID)}`}>
                  {formatMetricValue('FID', performanceData.metrics.FID)}
                </div>
                <p className="text-xs text-muted-foreground">First Input Delay</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="budget" className="space-y-4">
          {performanceData.budget.passed ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                All performance budgets are within acceptable limits!
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {performanceData.budget.violations.length} metric(s) exceed performance budget
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                {performanceData.budget.violations.map((violation) => (
                  <Card key={violation.metric}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{violation.metric}</h4>
                          <p className="text-sm text-muted-foreground">
                            Current: {violation.value} | Budget: {violation.budget}
                          </p>
                        </div>
                        <Badge variant="destructive">
                          +{Math.round(violation.violation)}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <div className="space-y-4">
            {performanceData.metrics.LCP && performanceData.metrics.LCP > 2500 && (
              <Alert>
                <TrendingDown className="h-4 w-4" />
                <AlertDescription>
                  <strong>LCP Optimization:</strong> Consider optimizing images, reducing server response time, or implementing resource hints.
                </AlertDescription>
              </Alert>
            )}
            
            {performanceData.metrics.TTFB && performanceData.metrics.TTFB > 800 && (
              <Alert>
                <TrendingDown className="h-4 w-4" />
                <AlertDescription>
                  <strong>TTFB Optimization:</strong> Server response time is slow. Consider caching, CDN, or server optimization.
                </AlertDescription>
              </Alert>
            )}
            
            {performanceData.metrics.CLS && performanceData.metrics.CLS > 0.1 && (
              <Alert>
                <TrendingDown className="h-4 w-4" />
                <AlertDescription>
                  <strong>CLS Optimization:</strong> Layout shifts detected. Reserve space for dynamic content and avoid DOM changes.
                </AlertDescription>
              </Alert>
            )}
            
            {performanceData.score >= 90 && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Excellent Performance!</strong> Your page is performing well across all metrics.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}