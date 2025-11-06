import { NextRequest, NextResponse } from 'next/server';

import { trackBusinessMetric } from '@/lib/monitoring/sentry';
import { rateLimit } from '@/lib/security/rate-limit';
import { logger } from '@/lib/logger';

// Performance metrics collection endpoint
const rateLimitedPerformance = rateLimit(200, 60000)( // 200 requests per minute
  async (request: NextRequest) => {
    const start = Date.now();
    
    try {
      const body = await request.json();
      
      // Validate request body
      if (!body.metrics || !Array.isArray(body.metrics)) {
        return NextResponse.json({ error: 'Invalid metrics format' }, { status: 400 });
      }
      
      const processedMetrics = [];
      
      // Process performance metrics
      for (const metric of body.metrics) {
        if (!metric.metric || typeof metric.value !== 'number') {
          continue;
        }
        
        const processedMetric = {
          metric: metric.metric,
          value: metric.value,
          rating: metric.rating || 'unknown',
          timestamp: metric.timestamp || Date.now(),
          url: metric.url || 'unknown',
          userId: metric.userId,
          sessionId: metric.sessionId,
          userAgent: request.headers.get('user-agent') || 'unknown',
        };
        
        // Track with Sentry
        trackBusinessMetric(`web_vitals_${metric.metric}`, metric.value, {
          rating: metric.rating,
          url: metric.url,
          user_id: metric.userId,
          session_id: metric.sessionId,
        });
        
        // Store in performance data (in a real app, you'd store this in a database)
        processedMetrics.push(processedMetric);
        
        // Log performance issues
        if (metric.rating === 'poor') {
          logger.warn(`Poor performance detected: ${metric.metric} = ${metric.value}`, {
            url: metric.url,
            userId: metric.userId,
            sessionId: metric.sessionId,
          });
        }
      }
      
      // Return success response
      const response = {
        status: 'success',
        timestamp: new Date().toISOString(),
        metricsProcessed: processedMetrics.length,
        processingTime: Date.now() - start,
        recommendations: generatePerformanceRecommendations(body.metrics),
      };
      
      return NextResponse.json(response);
      
    } catch (error) {
      const errorResponse = {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - start,
      };
      
      return NextResponse.json(errorResponse, { status: 500 });
    }
  }
);

// GET /api/monitoring/performance - Get performance metrics summary
export async function GET(request: NextRequest) {
  try {
    const start = Date.now();
    
    // Get performance summary (in a real app, this would come from your database)
    const summary = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      webVitals: {
        lcp: {
          average: 2100,
          p95: 3200,
          trend: 'improving',
          threshold: 2500,
          status: 'good',
        },
        fid: {
          average: 85,
          p95: 150,
          trend: 'stable',
          threshold: 100,
          status: 'needs-improvement',
        },
        cls: {
          average: 0.08,
          p95: 0.15,
          trend: 'improving',
          threshold: 0.1,
          status: 'good',
        },
        inp: {
          average: 180,
          p95: 280,
          trend: 'stable',
          threshold: 200,
          status: 'good',
        },
        ttfb: {
          average: 650,
          p95: 900,
          trend: 'improving',
          threshold: 800,
          status: 'good',
        },
      },
      customMetrics: {
        routeChangeDuration: {
          average: 150,
          p95: 300,
          trend: 'stable',
        },
        apiResponseTime: {
          average: 450,
          p95: 800,
          trend: 'improving',
        },
        resourceLoadTime: {
          average: 220,
          p95: 500,
          trend: 'stable',
        },
      },
      performanceScore: calculateOverallPerformanceScore(),
      recommendations: getPerformanceRecommendations(),
      processingTime: Date.now() - start,
    };
    
    return NextResponse.json(summary);

  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to retrieve performance metrics' },
      { status: 500 }
    );
  }
}

// POST /api/monitoring/performance - Submit performance metrics
export async function POST(request: NextRequest) {
  return rateLimitedPerformance(request);
}

// Generate performance recommendations based on metrics
function generatePerformanceRecommendations(metrics: any[]): string[] {
  const recommendations: string[] = [];
  
  for (const metric of metrics) {
    switch (metric.metric) {
      case 'LCP':
        if (metric.value > 4000) {
          recommendations.push('Optimize image loading and server response times to improve Largest Contentful Paint');
        } else if (metric.value > 2500) {
          recommendations.push('Consider implementing image optimization and CDN for better LCP scores');
        }
        break;
        
      case 'FID':
        if (metric.value > 300) {
          recommendations.push('Reduce JavaScript bundle size and optimize code splitting to improve First Input Delay');
        } else if (metric.value > 100) {
          recommendations.push('Consider lazy loading non-critical JavaScript to improve interactivity');
        }
        break;
        
      case 'INP':
        if (metric.value > 500) {
          recommendations.push('Optimize event handlers and reduce main thread blocking to improve Interaction to Next Paint');
        } else if (metric.value > 200) {
          recommendations.push('Review component rendering performance and consider React optimization techniques');
        }
        break;
        
      case 'CLS':
        if (metric.value > 0.25) {
          recommendations.push('Fix layout shifts by setting explicit dimensions for images and dynamic content');
        } else if (metric.value > 0.1) {
          recommendations.push('Review dynamic content loading to minimize layout shifts');
        }
        break;
        
      case 'TTFB':
        if (metric.value > 1800) {
          recommendations.push('Optimize server response times and consider edge caching for better TTFB');
        } else if (metric.value > 800) {
          recommendations.push('Review API performance and database query optimization');
        }
        break;
        
      case 'route_change':
        if (metric.value > 500) {
          recommendations.push('Optimize route transitions and consider preloading critical routes');
        }
        break;
        
      case 'api_request':
        if (metric.value > 2000) {
          recommendations.push('Optimize API endpoints and consider response caching');
        }
        break;
    }
  }
  
  return [...new Set(recommendations)]; // Remove duplicates
}

// Calculate overall performance score
function calculateOverallPerformanceScore(): number {
  // This would typically be calculated from real metrics
  // For now, return a mock score
  return 85;
}

// Get general performance recommendations
function getPerformanceRecommendations(): string[] {
  return [
    'Implement service worker for better caching strategy',
    'Optimize bundle splitting for faster initial load',
    'Consider implementing progressive web app features',
    'Review and optimize critical rendering path',
    'Implement performance monitoring dashboard',
  ];
}

// Helper functions (not exported as route handlers)
function checkPerformanceThresholds(metrics: any[]): Array<{
  metric: string;
  value: number;
  threshold: number;
  severity: 'warning' | 'critical';
  message: string;
}> {
  const alerts = [];

  for (const metric of metrics) {
    switch (metric.metric) {
      case 'LCP':
        if (metric.value > 4000) {
          alerts.push({
            metric: 'LCP',
            value: metric.value,
            threshold: 4000,
            severity: 'critical' as const,
            message: 'Largest Contentful Paint is critically slow',
          });
        } else if (metric.value > 2500) {
          alerts.push({
            metric: 'LCP',
            value: metric.value,
            threshold: 2500,
            severity: 'warning' as const,
            message: 'Largest Contentful Paint needs improvement',
          });
        }
        break;

      case 'FID':
      case 'INP':
        const threshold = metric.metric === 'FID' ? 300 : 500;
        const warningThreshold = metric.metric === 'FID' ? 100 : 200;

        if (metric.value > threshold) {
          alerts.push({
            metric: metric.metric,
            value: metric.value,
            threshold,
            severity: 'critical' as const,
            message: `${metric.metric} indicates poor interactivity`,
          });
        } else if (metric.value > warningThreshold) {
          alerts.push({
            metric: metric.metric,
            value: metric.value,
            threshold: warningThreshold,
            severity: 'warning' as const,
            message: `${metric.metric} could be improved`,
          });
        }
        break;

      case 'CLS':
        if (metric.value > 0.25) {
          alerts.push({
            metric: 'CLS',
            value: metric.value,
            threshold: 0.25,
            severity: 'critical' as const,
            message: 'Cumulative Layout Shift is causing poor user experience',
          });
        } else if (metric.value > 0.1) {
          alerts.push({
            metric: 'CLS',
            value: metric.value,
            threshold: 0.1,
            severity: 'warning' as const,
            message: 'Cumulative Layout Shift needs improvement',
          });
        }
        break;
    }
  }

  return alerts;
}