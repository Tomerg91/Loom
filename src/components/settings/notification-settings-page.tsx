'use client';

import { useTranslations } from 'next-intl';
import { NotificationSettingsCard } from './notification-settings-card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function NotificationSettingsPage() {
  const t = useTranslations('settings');
  const router = useRouter();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Button>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Bell className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Notification Settings
            </h1>
            <p className="text-muted-foreground">
              Manage how and when you receive notifications
            </p>
          </div>
        </div>
      </div>

      {/* Settings Content */}
      <NotificationSettingsCard />
    </div>
  );
}