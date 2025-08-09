'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  Mail,
  Smartphone,
  Monitor,
  CheckCircle,
  Volume2,
  VolumeX,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { useUser } from '@/lib/store/auth-store';
import { useToast } from '@/components/ui/toast-provider';

interface NotificationSettings {
  email: {
    enabled: boolean;
    sessionReminders: boolean;
    sessionUpdates: boolean;
    messageNotifications: boolean;
    marketing: boolean;
    weeklyDigest: boolean;
    frequency: 'immediate' | 'hourly' | 'daily';
  };
  push: {
    enabled: boolean;
    sessionReminders: boolean;
    sessionUpdates: boolean;
    messageNotifications: boolean;
    systemUpdates: boolean;
    quietHours: {
      enabled: boolean;
      start: string;
      end: string;
    };
  };
  inApp: {
    enabled: boolean;
    sessionReminders: boolean;
    messageNotifications: boolean;
    systemNotifications: boolean;
    sounds: boolean;
    desktop: boolean;
  };
  preferences: {
    language: string;
    timezone: string;
    reminderTiming: number; // minutes before session
  };
}

export function NotificationSettingsCard() {
  const user = useUser();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch real notification preferences from API
  const { data: settings, isLoading, error } = useQuery<NotificationSettings>({
    queryKey: ['notification-settings', user?.id],
    queryFn: async () => {
      const response = await fetch('/api/notifications/preferences');
      if (!response.ok) {
        throw new Error('Failed to fetch notification preferences');
      }
      const result = await response.json();
      return result.data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: NotificationSettings) => {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update notification preferences');
      }

      const result = await response.json();
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
      setHasChanges(false);
      toast.success('Settings Updated', 'Your notification preferences have been saved successfully.');
    },
    onError: (error) => {
      console.error('Failed to update notification settings:', error);
      toast.error('Update Failed', 'Failed to update notification settings. Please try again.');
    },
  });

  const handleSettingChange = (category: keyof NotificationSettings, key: string, value: boolean | string | number) => {
    if (!settings) return;
    
    const updatedSettings = {
      ...settings,
      [category]: {
        ...settings[category],
        [key]: value,
      },
    };
    
    updateSettingsMutation.mutate(updatedSettings);
    setHasChanges(true);
  };

  const handleNestedSettingChange = (
    category: keyof NotificationSettings, 
    nestedKey: string, 
    key: string, 
    value: boolean | string | number
  ) => {
    if (!settings) return;
    
    const updatedSettings = {
      ...settings,
      [category]: {
        ...settings[category],
        [nestedKey]: {
          ...((settings[category] as Record<string, any>)[nestedKey] as Record<string, any>),
          [key]: value,
        },
      },
    };
    
    updateSettingsMutation.mutate(updatedSettings);
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
            <div className="space-y-2">
              <p className="text-destructive">Failed to load notification settings</p>
              <p className="text-sm text-muted-foreground">{error.message}</p>
            </div>
            <Button
              variant="outline"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['notification-settings'] })}
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">No notification settings found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Mail className="h-5 w-5" />
            <span>Email Notifications</span>
          </CardTitle>
          <CardDescription>
            Configure when and how you receive email notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Enable Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications via email
              </p>
            </div>
            <Switch
              checked={settings.email.enabled}
              onCheckedChange={(checked) => handleSettingChange('email', 'enabled', checked)}
            />
          </div>

          {settings.email.enabled && (
            <div className="space-y-4 pl-4 border-l-2 border-muted">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Session Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Get reminded about upcoming sessions
                  </p>
                </div>
                <Switch
                  checked={settings.email.sessionReminders}
                  onCheckedChange={(checked) => handleSettingChange('email', 'sessionReminders', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Session Updates</Label>
                  <p className="text-sm text-muted-foreground">
                    Notifications about session changes or cancellations
                  </p>
                </div>
                <Switch
                  checked={settings.email.sessionUpdates}
                  onCheckedChange={(checked) => handleSettingChange('email', 'sessionUpdates', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Message Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    New messages from coaches or clients
                  </p>
                </div>
                <Switch
                  checked={settings.email.messageNotifications}
                  onCheckedChange={(checked) => handleSettingChange('email', 'messageNotifications', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Weekly Digest</Label>
                  <p className="text-sm text-muted-foreground">
                    Weekly summary of your sessions and progress
                  </p>
                </div>
                <Switch
                  checked={settings.email.weeklyDigest}
                  onCheckedChange={(checked) => handleSettingChange('email', 'weeklyDigest', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Marketing Communications</Label>
                  <p className="text-sm text-muted-foreground">
                    Updates about new features and promotional content
                  </p>
                </div>
                <Switch
                  checked={settings.email.marketing}
                  onCheckedChange={(checked) => handleSettingChange('email', 'marketing', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label>Email Frequency</Label>
                <Select
                  value={settings.email.frequency}
                  onValueChange={(value) => handleSettingChange('email', 'frequency', value)}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediate</SelectItem>
                    <SelectItem value="hourly">Hourly Digest</SelectItem>
                    <SelectItem value="daily">Daily Digest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Push Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Smartphone className="h-5 w-5" />
            <span>Push Notifications</span>
          </CardTitle>
          <CardDescription>
            Get real-time notifications on your devices
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Enable Push Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive push notifications on your devices
              </p>
            </div>
            <Switch
              checked={settings.push.enabled}
              onCheckedChange={(checked) => handleSettingChange('push', 'enabled', checked)}
            />
          </div>

          {settings.push.enabled && (
            <div className="space-y-4 pl-4 border-l-2 border-muted">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Session Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Get reminded 15 minutes before sessions
                  </p>
                </div>
                <Switch
                  checked={settings.push.sessionReminders}
                  onCheckedChange={(checked) => handleSettingChange('push', 'sessionReminders', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Session Updates</Label>
                  <p className="text-sm text-muted-foreground">
                    Instant notifications for session changes
                  </p>
                </div>
                <Switch
                  checked={settings.push.sessionUpdates}
                  onCheckedChange={(checked) => handleSettingChange('push', 'sessionUpdates', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Message Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    New messages from your coach or clients
                  </p>
                </div>
                <Switch
                  checked={settings.push.messageNotifications}
                  onCheckedChange={(checked) => handleSettingChange('push', 'messageNotifications', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>System Updates</Label>
                  <p className="text-sm text-muted-foreground">
                    Important system announcements and updates
                  </p>
                </div>
                <Switch
                  checked={settings.push.systemUpdates}
                  onCheckedChange={(checked) => handleSettingChange('push', 'systemUpdates', checked)}
                />
              </div>

              {/* Quiet Hours */}
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="flex items-center space-x-2">
                      <VolumeX className="h-4 w-4" />
                      <span>Quiet Hours</span>
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Disable notifications during specified hours
                    </p>
                  </div>
                  <Switch
                    checked={settings.push.quietHours.enabled}
                    onCheckedChange={(checked) => handleNestedSettingChange('push', 'quietHours', 'enabled', checked)}
                  />
                </div>

                {settings.push.quietHours.enabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="quietStart">From</Label>
                      <input
                        id="quietStart"
                        type="time"
                        value={settings.push.quietHours.start}
                        onChange={(e) => handleNestedSettingChange('push', 'quietHours', 'start', e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-md"
                      />
                    </div>
                    <div>
                      <Label htmlFor="quietEnd">To</Label>
                      <input
                        id="quietEnd"
                        type="time"
                        value={settings.push.quietHours.end}
                        onChange={(e) => handleNestedSettingChange('push', 'quietHours', 'end', e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-md"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* In-App Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Monitor className="h-5 w-5" />
            <span>In-App Notifications</span>
          </CardTitle>
          <CardDescription>
            Configure notifications within the application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Enable In-App Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Show notifications while using the app
              </p>
            </div>
            <Switch
              checked={settings.inApp.enabled}
              onCheckedChange={(checked) => handleSettingChange('inApp', 'enabled', checked)}
            />
          </div>

          {settings.inApp.enabled && (
            <div className="space-y-4 pl-4 border-l-2 border-muted">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Session Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Show popup reminders for upcoming sessions
                  </p>
                </div>
                <Switch
                  checked={settings.inApp.sessionReminders}
                  onCheckedChange={(checked) => handleSettingChange('inApp', 'sessionReminders', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Message Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Show notifications for new messages
                  </p>
                </div>
                <Switch
                  checked={settings.inApp.messageNotifications}
                  onCheckedChange={(checked) => handleSettingChange('inApp', 'messageNotifications', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>System Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Updates and system announcements
                  </p>
                </div>
                <Switch
                  checked={settings.inApp.systemNotifications}
                  onCheckedChange={(checked) => handleSettingChange('inApp', 'systemNotifications', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="flex items-center space-x-2">
                    <Volume2 className="h-4 w-4" />
                    <span>Notification Sounds</span>
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Play sounds for notifications
                  </p>
                </div>
                <Switch
                  checked={settings.inApp.sounds}
                  onCheckedChange={(checked) => handleSettingChange('inApp', 'sounds', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Desktop Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Show browser notifications when app is in background
                  </p>
                </div>
                <Switch
                  checked={settings.inApp.desktop}
                  onCheckedChange={(checked) => handleSettingChange('inApp', 'desktop', checked)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Notification Preferences</span>
          </CardTitle>
          <CardDescription>
            Customize timing and delivery preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Session Reminder Timing</Label>
              <Select
                value={settings.preferences.reminderTiming.toString()}
                onValueChange={(value) => handleSettingChange('preferences', 'reminderTiming', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 minutes before</SelectItem>
                  <SelectItem value="15">15 minutes before</SelectItem>
                  <SelectItem value="30">30 minutes before</SelectItem>
                  <SelectItem value="60">1 hour before</SelectItem>
                  <SelectItem value="1440">1 day before</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Timezone</Label>
              <Select
                value={settings.preferences.timezone}
                onValueChange={(value) => handleSettingChange('preferences', 'timezone', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/New_York">Eastern Time</SelectItem>
                  <SelectItem value="America/Chicago">Central Time</SelectItem>
                  <SelectItem value="America/Denver">Mountain Time</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      {hasChanges && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Your notification settings have been updated successfully.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}