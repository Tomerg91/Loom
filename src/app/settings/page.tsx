'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <p>This page will allow you to configure your application settings.</p>
          <p>Coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}
