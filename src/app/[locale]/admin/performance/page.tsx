import { Metadata } from 'next';

import { PerformanceDashboard } from '@/components/admin/performance-dashboard';

export const metadata: Metadata = {
  title: 'Performance Monitoring | Admin',
  description: 'Database query performance monitoring and optimization tracking',
};

/**
 * Admin Performance Monitoring Page
 *
 * Displays comprehensive database performance metrics including:
 * - MFA query performance (tracking 80% improvement from materialized view)
 * - Resource Library query performance (tracking 30-50% improvement from RLS optimization)
 * - Slow query detection and flagging (>100ms threshold)
 * - Overall system performance metrics
 *
 * Route: /admin/performance
 * Access: Admin users only
 */
export default function PerformanceMonitoringPage() {
  return (
    <div className="container mx-auto py-6">
      <PerformanceDashboard />
    </div>
  );
}
