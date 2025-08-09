'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ClientDashboardPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Client Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p>This is your main client dashboard.</p>
          <p>Coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}
