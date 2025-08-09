'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CoachSessionsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>My Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <p>This page will display your coaching sessions.</p>
          <p>Coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}
