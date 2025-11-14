/**
 * Messaging Analytics Page
 * View your messaging engagement and activity
 */

import { MessagingAnalyticsDashboard } from '@/components/analytics/messaging-analytics-dashboard';

export const metadata = {
  title: 'Messaging Analytics',
  description: 'View your messaging engagement and activity',
};

export default function MessagingAnalyticsPage() {
  return (
    <div className="container mx-auto py-8">
      <MessagingAnalyticsDashboard scope="user" />
    </div>
  );
}
