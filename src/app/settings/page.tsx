'use client';

// Force dynamic rendering to avoid prerender issues with React Query
export const dynamic = 'force-dynamic';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bell,
  User,
  Shield,
  Eye,
  Save,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Mail,
  Smartphone,
  Monitor,
  Clock,
  VolumeX,
  Volume2,
  Key,
  Trash2
} from 'lucide-react';
import { useToast } from '@/components/ui/toast-provider';
import { useUser } from '@/lib/auth/use-user';

// Validation schemas
const notificationPreferencesSchema = z.object({
  email: z.object({
    enabled: z.boolean(),
    sessionReminders: z.boolean(),
    sessionUpdates: z.boolean(),
    messageNotifications: z.boolean(),
    marketing: z.boolean(),
    weeklyDigest: z.boolean(),
    frequency: z.enum(['immediate', 'hourly', 'daily']),
  }),
  push: z.object({
    enabled: z.boolean(),
    sessionReminders: z.boolean(),
    sessionUpdates: z.boolean(),
    messageNotifications: z.boolean(),
    systemUpdates: z.boolean(),
    quietHours: z.object({
      enabled: z.boolean(),
      start: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
      end: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    }),
  }),
  inApp: z.object({
    enabled: z.boolean(),
    sessionReminders: z.boolean(),
    messageNotifications: z.boolean(),
    systemNotifications: z.boolean(),
    sounds: z.boolean(),
    desktop: z.boolean(),
  }),
  preferences: z.object({
    language: z.string(),
    timezone: z.string(),
    reminderTiming: z.number().min(5).max(1440),
  }),
});

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  timezone: z.string(),
  language: z.string(),
});

type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;
type ProfileData = z.infer<typeof profileSchema>;

interface SettingsTabProps {
  activeTab: string;
}

function SettingsContent({ activeTab }: SettingsTabProps) {
  const user = useUser();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Notification preferences query and mutation
  const { data: notificationSettings, isLoading: isLoadingNotifications, error: notificationError } = useQuery<NotificationPreferences>({
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
    staleTime: 5 * 60 * 1000,
  });

  // Profile data query and mutation
  const { data: profileData, isLoading: isLoadingProfile } = useQuery<ProfileData>({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }
      const result = await response.json();
      return {
        firstName: result.data.user.firstName || '',
        lastName: result.data.user.lastName || '',
        email: result.data.user.email,
        timezone: result.data.user.timezone || 'UTC',
        language: result.data.user.language || 'en',
      };
    },
    enabled: !!user?.id,
  });

  // Forms
  const notificationForm = useForm<NotificationPreferences>({
    resolver: zodResolver(notificationPreferencesSchema),
    defaultValues: notificationSettings,
  });

  const profileForm = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: profileData,
  });

  // Update form when data loads
  useEffect(() => {
    if (notificationSettings) {
      notificationForm.reset(notificationSettings);
    }
  }, [notificationSettings, notificationForm]);

  useEffect(() => {
    if (profileData) {
      profileForm.reset(profileData);
    }
  }, [profileData, profileForm]);

  // Mutations
  const updateNotificationsMutation = useMutation({
    mutationFn: async (newSettings: NotificationPreferences) => {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update notification preferences');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
      setHasUnsavedChanges(false);
      toast.success('Settings Updated', 'Your notification preferences have been saved successfully.');
    },
    onError: (error) => {
      console.error('Failed to update notification settings:', error);
      toast.error('Update Failed', 'Failed to update notification settings. Please try again.');
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (newProfile: ProfileData) => {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProfile),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update profile');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      setHasUnsavedChanges(false);
      toast.success('Profile Updated', 'Your profile has been saved successfully.');
    },
    onError: (error) => {
      console.error('Failed to update profile:', error);
      toast.error('Update Failed', 'Failed to update profile. Please try again.');
    },
  });

  // Form handlers
  const handleNotificationSubmit = useCallback((data: NotificationPreferences) => {
    updateNotificationsMutation.mutate(data);
  }, [updateNotificationsMutation]);

  const handleProfileSubmit = useCallback((data: ProfileData) => {
    updateProfileMutation.mutate(data);
  }, [updateProfileMutation]);

  // Optimistic update for notification toggles
  const handleNotificationToggle = useCallback((
    category: keyof NotificationPreferences,
    key: string,
    value: boolean | string | number
  ) => {
    if (!notificationSettings) return;
    
    const currentValues = notificationForm.getValues();
    const newSettings = {
      ...currentValues,
      [category]: {
        ...currentValues[category],
        [key]: value,
      },
    };
    
    notificationForm.setValue(category as any, newSettings[category] as any);
    setHasUnsavedChanges(true);
    updateNotificationsMutation.mutate(newSettings);
  }, [notificationSettings, notificationForm, updateNotificationsMutation]);

  // Handle nested notification settings
  const handleNestedNotificationToggle = useCallback((
    category: keyof NotificationPreferences,
    nestedKey: string,
    key: string,
    value: boolean | string | number
  ) => {
    if (!notificationSettings) return;
    
    const currentValues = notificationForm.getValues();
    const newSettings = {
      ...currentValues,
      [category]: {
        ...currentValues[category],
        [nestedKey]: {
          ...((currentValues[category] as any)[nestedKey]),
          [key]: value,
        },
      },
    };
    
    notificationForm.setValue(category as any, newSettings[category] as any);
    setHasUnsavedChanges(true);
    updateNotificationsMutation.mutate(newSettings);
  }, [notificationSettings, notificationForm, updateNotificationsMutation]);

  // Loading states
  if (isLoadingNotifications && activeTab === 'notifications') {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading notification settings...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoadingProfile && activeTab === 'profile') {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading profile...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error states
  if (notificationError && activeTab === 'notifications') {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
            <div className="space-y-2">
              <p className="text-destructive">Failed to load notification settings</p>
              <p className="text-sm text-muted-foreground">{notificationError.message}</p>
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

  return (
    <div className="space-y-6">
      {/* Notifications Tab */}
      {activeTab === 'notifications' && notificationSettings && (
        <div className="space-y-6">
          {/* Unsaved changes warning */}
          {hasUnsavedChanges && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You have unsaved changes that are being automatically saved.
              </AlertDescription>
            </Alert>
          )}

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
                  checked={notificationSettings.email.enabled}
                  onCheckedChange={(checked) => handleNotificationToggle('email', 'enabled', checked)}
                  disabled={updateNotificationsMutation.isPending}
                />
              </div>

              {notificationSettings.email.enabled && (
                <div className="space-y-4 pl-4 border-l-2 border-muted">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Session Reminders</Label>
                      <p className="text-sm text-muted-foreground">
                        Get reminded about upcoming sessions
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.email.sessionReminders}
                      onCheckedChange={(checked) => handleNotificationToggle('email', 'sessionReminders', checked)}
                      disabled={updateNotificationsMutation.isPending}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Session Confirmations</Label>
                      <p className="text-sm text-muted-foreground">
                        Notifications about session confirmations and changes
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.email.sessionUpdates}
                      onCheckedChange={(checked) => handleNotificationToggle('email', 'sessionUpdates', checked)}
                      disabled={updateNotificationsMutation.isPending}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>New Messages from Coach</Label>
                      <p className="text-sm text-muted-foreground">
                        New messages from your coach or clients
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.email.messageNotifications}
                      onCheckedChange={(checked) => handleNotificationToggle('email', 'messageNotifications', checked)}
                      disabled={updateNotificationsMutation.isPending}
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
                      checked={notificationSettings.email.sessionUpdates}
                      onCheckedChange={(checked) => handleNotificationToggle('email', 'sessionUpdates', checked)}
                      disabled={updateNotificationsMutation.isPending}
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
                      checked={notificationSettings.email.marketing}
                      onCheckedChange={(checked) => handleNotificationToggle('email', 'marketing', checked)}
                      disabled={updateNotificationsMutation.isPending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Notification Frequency</Label>
                    <Select
                      value={notificationSettings.email.frequency}
                      onValueChange={(value) => handleNotificationToggle('email', 'frequency', value)}
                      disabled={updateNotificationsMutation.isPending}
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
                  checked={notificationSettings.push.enabled}
                  onCheckedChange={(checked) => handleNotificationToggle('push', 'enabled', checked)}
                  disabled={updateNotificationsMutation.isPending}
                />
              </div>

              {notificationSettings.push.enabled && (
                <div className="space-y-4 pl-4 border-l-2 border-muted">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Session Reminders</Label>
                      <p className="text-sm text-muted-foreground">
                        Get reminded before sessions start
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.push.sessionReminders}
                      onCheckedChange={(checked) => handleNotificationToggle('push', 'sessionReminders', checked)}
                      disabled={updateNotificationsMutation.isPending}
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
                      checked={notificationSettings.push.sessionUpdates}
                      onCheckedChange={(checked) => handleNotificationToggle('push', 'sessionUpdates', checked)}
                      disabled={updateNotificationsMutation.isPending}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>New Messages</Label>
                      <p className="text-sm text-muted-foreground">
                        New messages from your coach or clients
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.push.messageNotifications}
                      onCheckedChange={(checked) => handleNotificationToggle('push', 'messageNotifications', checked)}
                      disabled={updateNotificationsMutation.isPending}
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
                        checked={notificationSettings.push.quietHours.enabled}
                        onCheckedChange={(checked) => handleNestedNotificationToggle('push', 'quietHours', 'enabled', checked)}
                        disabled={updateNotificationsMutation.isPending}
                      />
                    </div>

                    {notificationSettings.push.quietHours.enabled && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="quietStart">From</Label>
                          <Input
                            id="quietStart"
                            type="time"
                            value={notificationSettings.push.quietHours.start}
                            onChange={(e) => handleNestedNotificationToggle('push', 'quietHours', 'start', e.target.value)}
                            disabled={updateNotificationsMutation.isPending}
                          />
                        </div>
                        <div>
                          <Label htmlFor="quietEnd">To</Label>
                          <Input
                            id="quietEnd"
                            type="time"
                            value={notificationSettings.push.quietHours.end}
                            onChange={(e) => handleNestedNotificationToggle('push', 'quietHours', 'end', e.target.value)}
                            disabled={updateNotificationsMutation.isPending}
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
                  checked={notificationSettings.inApp.enabled}
                  onCheckedChange={(checked) => handleNotificationToggle('inApp', 'enabled', checked)}
                  disabled={updateNotificationsMutation.isPending}
                />
              </div>

              {notificationSettings.inApp.enabled && (
                <div className="space-y-4 pl-4 border-l-2 border-muted">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Session Reminders</Label>
                      <p className="text-sm text-muted-foreground">
                        Show popup reminders for upcoming sessions
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.inApp.sessionReminders}
                      onCheckedChange={(checked) => handleNotificationToggle('inApp', 'sessionReminders', checked)}
                      disabled={updateNotificationsMutation.isPending}
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
                      checked={notificationSettings.inApp.messageNotifications}
                      onCheckedChange={(checked) => handleNotificationToggle('inApp', 'messageNotifications', checked)}
                      disabled={updateNotificationsMutation.isPending}
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
                      checked={notificationSettings.inApp.sounds}
                      onCheckedChange={(checked) => handleNotificationToggle('inApp', 'sounds', checked)}
                      disabled={updateNotificationsMutation.isPending}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Timing Preferences</span>
              </CardTitle>
              <CardDescription>
                Customize notification timing and delivery preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Session Reminder Timing</Label>
                  <Select
                    value={notificationSettings.preferences.reminderTiming.toString()}
                    onValueChange={(value) => handleNotificationToggle('preferences', 'reminderTiming', parseInt(value))}
                    disabled={updateNotificationsMutation.isPending}
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
                    value={notificationSettings.preferences.timezone}
                    onValueChange={(value) => handleNotificationToggle('preferences', 'timezone', value)}
                    disabled={updateNotificationsMutation.isPending}
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
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && profileData && (
        <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Profile Information</span>
              </CardTitle>
              <CardDescription>
                Manage your personal information and profile details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    {...profileForm.register('firstName')}
                    disabled={updateProfileMutation.isPending}
                  />
                  {profileForm.formState.errors.firstName && (
                    <p className="text-sm text-destructive">{profileForm.formState.errors.firstName.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    {...profileForm.register('lastName')}
                    disabled={updateProfileMutation.isPending}
                  />
                  {profileForm.formState.errors.lastName && (
                    <p className="text-sm text-destructive">{profileForm.formState.errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  {...profileForm.register('email')}
                  disabled={updateProfileMutation.isPending}
                />
                {profileForm.formState.errors.email && (
                  <p className="text-sm text-destructive">{profileForm.formState.errors.email.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={profileForm.watch('timezone')}
                    onValueChange={(value) => profileForm.setValue('timezone', value)}
                    disabled={updateProfileMutation.isPending}
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

                <div>
                  <Label htmlFor="language">Language</Label>
                  <Select
                    value={profileForm.watch('language')}
                    onValueChange={(value) => profileForm.setValue('language', value)}
                    disabled={updateProfileMutation.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="he">Hebrew</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  type="submit" 
                  disabled={updateProfileMutation.isPending}
                  className="w-full md:w-auto"
                >
                  {updateProfileMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Profile
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      )}

      {/* Privacy Tab */}
      {activeTab === 'privacy' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Eye className="h-5 w-5" />
                <span>Privacy Settings</span>
              </CardTitle>
              <CardDescription>
                Control your privacy and data sharing preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Profile Visibility</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow coaches to see your profile in search results
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Session History</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow coaches to view your session history for better coaching
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Progress Sharing</Label>
                  <p className="text-sm text-muted-foreground">
                    Share progress data with coaches to improve recommendations
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Analytics</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow anonymous usage analytics to improve the platform
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
              <CardDescription>
                Manage your data and account information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline">
                  Export Data
                </Button>
                <Button variant="outline">
                  Download Sessions
                </Button>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Security Settings</span>
              </CardTitle>
              <CardDescription>
                Manage your account security and authentication methods
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">
                    Add an extra layer of security to your account
                  </p>
                </div>
                <Button variant="outline">
                  <Key className="h-4 w-4 mr-2" />
                  Setup
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Login Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when someone logs into your account
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Session Timeout</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically log out after period of inactivity
                  </p>
                </div>
                <Select defaultValue="60">
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 min</SelectItem>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="240">4 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>
                Change your account password
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input id="currentPassword" type="password" />
              </div>
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" type="password" />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input id="confirmPassword" type="password" />
              </div>
              <Button>Update Password</Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function SettingsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    return searchParams.get('tab') || 'notifications';
  });

  // Update URL when tab changes
  const handleTabChange = useCallback((newTab: string) => {
    setActiveTab(newTab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', newTab);
    router.push(`/settings?${params.toString()}`);
  }, [router, searchParams]);

  // Update active tab when URL changes
  useEffect(() => {
    const tab = searchParams.get('tab') || 'notifications';
    setActiveTab(tab);
  }, [searchParams]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="page-title mb-1">Settings</h1>
        <p className="page-subtitle">
          Manage your account settings and preferences
        </p>
        <div className="premium-divider mt-4" />
      </div>

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="notifications" className="flex items-center space-x-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center space-x-2">
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">Privacy</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications">
          <SettingsContent activeTab="notifications" />
        </TabsContent>

        <TabsContent value="profile">
          <SettingsContent activeTab="profile" />
        </TabsContent>

        <TabsContent value="privacy">
          <SettingsContent activeTab="privacy" />
        </TabsContent>

        <TabsContent value="security">
          <SettingsContent activeTab="security" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading settings...</span>
          </div>
        </div>
      </div>
    }>
      <SettingsPageContent />
    </Suspense>
  );
}
