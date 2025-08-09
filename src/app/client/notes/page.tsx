'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ClientNotesPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>My Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <p>This page will display your personal notes.</p>
          <p>Coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}
