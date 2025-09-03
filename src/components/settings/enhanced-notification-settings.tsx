'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/lib/auth/use-user';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  Mail, 
  Smartphone, 
  Clock, 
  Volume2, 
  VolumeX, 
  Moon,
  Sun,
  Settings2,
  Test,
  CheckCircle,
  AlertCircle,
  Info,
  Loader2,
  Globe,
  Shield
} from 'lucide-react';
import { useToast } from '@/components/ui/toast-provider';

interface NotificationPreferences {
  email: {
    enabled: boolean;
    sessionReminders: boolean;
    sessionUpdates: boolean;
    messageNotifications: boolean;
    marketing: boolean;
    frequency: 'immediate' | 'hourly' | 'daily' | 'weekly' | 'never';
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
    reminderTiming: number;
  };
}

interface NotificationTest {
  type: 'email' | 'push' | 'inapp';
  status: 'idle' | 'testing' | 'success' | 'error';
  message?: string;
}

export function EnhancedNotificationSettings() {
  const t = useTranslations('settings.notifications');
  const user = useUser();
  const queryClient = useQueryClient();
  const toast = useToast();
  const pushNotifications = usePushNotifications();

  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [testStatus, setTestStatus] = useState<NotificationTest[]>([
    { type: 'email', status: 'idle' },
    { type: 'push', status: 'idle' },
    { type: 'inapp', status: 'idle' }
  ]);
  const [isDoNotDisturb, setIsDoNotDisturb] = useState(false);

  // Fetch notification preferences
  const { data: preferencesData, isLoading } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: async () => {
      const response = await fetch('/api/notifications/preferences');
      if (!response.ok) throw new Error('Failed to fetch preferences');
      return response.json();
    },
    enabled: !!user?.id,
  });

  // Save preferences mutation
  const savePreferencesMutation = useMutation({
    mutationFn: async (updatedPreferences: Partial<NotificationPreferences>) => {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPreferences),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save preferences');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      toast.success('Success', 'Notification preferences saved successfully');
    },
    onError: (error) => {
      console.error('Error saving preferences:', error);
      toast.error('Error', 'Failed to save notification preferences');
    },
  });

  // Test notification mutation
  const testNotificationMutation = useMutation({
    mutationFn: async (type: 'email' | 'push' | 'inapp') => {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Test failed');
      }
      
      return response.json();
    },
    onSuccess: (data, type) => {
      setTestStatus(prev => prev.map(test => 
        test.type === type 
          ? { ...test, status: 'success', message: 'Test notification sent successfully' }
          : test
      ));
      toast.success('Success', `Test ${type} notification sent successfully`);
    },
    onError: (error, type) => {
      setTestStatus(prev => prev.map(test => 
        test.type === type 
          ? { ...test, status: 'error', message: error.message }
          : test
      ));
      toast.error('Error', `Failed to send test ${type} notification`);
    },
  });

  // Initialize preferences from API data
  useEffect(() => {
    if (preferencesData?.data) {
      setPreferences(preferencesData.data);
    }
  }, [preferencesData]);

  // Handle preference updates
  const updatePreferences = (updates: Partial<NotificationPreferences>) => {
    if (!preferences) return;
    
    const newPreferences = { ...preferences, ...updates };
    setPreferences(newPreferences);
    savePreferencesMutation.mutate(updates);
  };

  // Test notification handler
  const handleTestNotification = (type: 'email' | 'push' | 'inapp') => {
    setTestStatus(prev => prev.map(test => 
      test.type === type 
        ? { ...test, status: 'testing', message: undefined }
        : test
    ));
    
    testNotificationMutation.mutate(type);
  };

  // Do not disturb toggle
  const toggleDoNotDisturb = () => {
    setIsDoNotDisturb(!isDoNotDisturb);
    // This would integrate with the notification store
  };

  if (isLoading || !preferences) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Do Not Disturb */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Settings
              </CardTitle>
              <CardDescription>
                Manage how and when you receive notifications
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleDoNotDisturb}
                className={isDoNotDisturb ? 'bg-gray-100' : ''}
              >
                {isDoNotDisturb ? (
                  <>
                    <Moon className="h-4 w-4 mr-2" />
                    Do Not Disturb ON
                  </>
                ) : (
                  <>
                    <Sun className="h-4 w-4 mr-2" />
                    Do Not Disturb OFF
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {isDoNotDisturb && (
            <Alert className="mt-3">
              <Moon className="h-4 w-4" />
              <AlertDescription>
                Do Not Disturb is enabled. You won't receive any notifications until you turn it off.
              </AlertDescription>
            </Alert>
          )}
        </CardHeader>
      </Card>

      {/* Main Settings Tabs */}
      <Tabs defaultValue="email" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="push" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            Push
          </TabsTrigger>
          <TabsTrigger value="inapp" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            In-App
          </TabsTrigger>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            General
          </TabsTrigger>
        </TabsList>

        {/* Email Notifications */}
        <TabsContent value="email">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Email Notifications
                  </CardTitle>
                  <CardDescription>
                    Configure email notification preferences
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestNotification('email')}
                    disabled={testStatus.find(t => t.type === 'email')?.status === 'testing'}
                  >
                    {testStatus.find(t => t.type === 'email')?.status === 'testing' ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Test className="h-4 w-4 mr-2" />
                    )}
                    Test Email
                  </Button>
                  {testStatus.find(t => t.type === 'email')?.status === 'success' && (
                    <Badge variant="secondary" className="bg-green-50 text-green-700">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Success
                    </Badge>
                  )}
                  {testStatus.find(t => t.type === 'email')?.status === 'error' && (
                    <Badge variant="destructive">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Failed
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Master Email Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Enable Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via email
                  </p>
                </div>
                <Switch
                  checked={preferences.email.enabled}
                  onCheckedChange={(enabled) => 
                    updatePreferences({ email: { ...preferences.email, enabled } })
                  }
                />
              </div>

              {preferences.email.enabled && (
                <>
                  <Separator />
                  
                  {/* Email Notification Types */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Notification Types</h4>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Session Reminders</Label>
                          <p className="text-sm text-muted-foreground">
                            Reminders before your coaching sessions
                          </p>
                        </div>
                        <Switch
                          checked={preferences.email.sessionReminders}
                          onCheckedChange={(sessionReminders) => 
                            updatePreferences({ email: { ...preferences.email, sessionReminders } })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Session Updates</Label>
                          <p className="text-sm text-muted-foreground">
                            Changes to your scheduled sessions
                          </p>
                        </div>
                        <Switch
                          checked={preferences.email.sessionUpdates}
                          onCheckedChange={(sessionUpdates) => 
                            updatePreferences({ email: { ...preferences.email, sessionUpdates } })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Message Notifications</Label>
                          <p className="text-sm text-muted-foreground">
                            New messages from coaches or clients
                          </p>
                        </div>
                        <Switch
                          checked={preferences.email.messageNotifications}
                          onCheckedChange={(messageNotifications) => 
                            updatePreferences({ email: { ...preferences.email, messageNotifications } })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Marketing Emails</Label>
                          <p className="text-sm text-muted-foreground">
                            Product updates and promotional content
                          </p>
                        </div>
                        <Switch
                          checked={preferences.email.marketing}
                          onCheckedChange={(marketing) => 
                            updatePreferences({ email: { ...preferences.email, marketing } })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Email Frequency */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Email Frequency</Label>
                    <Select
                      value={preferences.email.frequency}
                      onValueChange={(frequency: any) =>
                        updatePreferences({ email: { ...preferences.email, frequency } })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediate">Immediate</SelectItem>
                        <SelectItem value="hourly">Hourly Digest</SelectItem>
                        <SelectItem value="daily">Daily Digest</SelectItem>
                        <SelectItem value="weekly">Weekly Digest</SelectItem>
                        <SelectItem value="never">Never</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      How often to receive email notifications
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Push Notifications */}
        <TabsContent value="push">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5" />
                    Push Notifications
                  </CardTitle>
                  <CardDescription>
                    Configure push notification preferences for your device
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestNotification('push')}
                    disabled={testStatus.find(t => t.type === 'push')?.status === 'testing' || !pushNotifications.isSubscribed}
                  >
                    {testStatus.find(t => t.type === 'push')?.status === 'testing' ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Test className="h-4 w-4 mr-2" />
                    )}
                    Test Push
                  </Button>
                  {pushNotifications.isSubscribed && (
                    <Badge variant="secondary" className="bg-green-50 text-green-700">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Enabled
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Push Support Check */}
              {!pushNotifications.isSupported && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Push notifications are not supported on this browser or device.
                  </AlertDescription>
                </Alert>
              )}

              {pushNotifications.isSupported && (
                <>
                  {/* Browser Permission Status */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <Label className="text-base font-medium">Browser Permission</Label>
                      <p className="text-sm text-muted-foreground">
                        Current permission status: {pushNotifications.permission}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {pushNotifications.permission === 'granted' && (
                        <Badge variant="secondary" className="bg-green-50 text-green-700">
                          Granted
                        </Badge>
                      )}
                      {pushNotifications.permission === 'denied' && (
                        <Badge variant="destructive">Denied</Badge>
                      )}
                      {pushNotifications.permission === 'default' && (
                        <Button
                          size="sm"
                          onClick={pushNotifications.requestPermission}
                          disabled={pushNotifications.isLoading}
                        >
                          {pushNotifications.isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : null}
                          Request Permission
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Push Subscription Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base font-medium">Enable Push Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive push notifications on this device
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {pushNotifications.permission === 'granted' && (
                        <Button
                          variant={pushNotifications.isSubscribed ? "destructive" : "default"}
                          size="sm"
                          onClick={pushNotifications.isSubscribed ? pushNotifications.unsubscribe : pushNotifications.subscribe}
                          disabled={pushNotifications.isLoading}
                        >
                          {pushNotifications.isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : null}
                          {pushNotifications.isSubscribed ? 'Unsubscribe' : 'Subscribe'}
                        </Button>
                      )}
                    </div>
                  </div>

                  {pushNotifications.error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{pushNotifications.error}</AlertDescription>
                    </Alert>
                  )}

                  {pushNotifications.isSubscribed && (
                    <>
                      <Separator />
                      
                      {/* Push Notification Types */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium">Notification Types</h4>
                        
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label>Session Reminders</Label>
                              <p className="text-sm text-muted-foreground">
                                Push reminders before your coaching sessions
                              </p>
                            </div>
                            <Switch
                              checked={preferences.push.sessionReminders}
                              onCheckedChange={(sessionReminders) => 
                                updatePreferences({ push: { ...preferences.push, sessionReminders } })
                              }
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label>Message Notifications</Label>
                              <p className="text-sm text-muted-foreground">
                                Push notifications for new messages
                              </p>
                            </div>
                            <Switch
                              checked={preferences.push.messageNotifications}
                              onCheckedChange={(messageNotifications) => 
                                updatePreferences({ push: { ...preferences.push, messageNotifications } })
                              }
                            />
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Quiet Hours */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label className="text-base font-medium">Quiet Hours</Label>
                            <p className="text-sm text-muted-foreground">
                              Don't send push notifications during specific hours
                            </p>
                          </div>
                          <Switch
                            checked={preferences.push.quietHours.enabled}
                            onCheckedChange={(enabled) => 
                              updatePreferences({ 
                                push: { 
                                  ...preferences.push, 
                                  quietHours: { ...preferences.push.quietHours, enabled } 
                                } 
                              })
                            }
                          />
                        </div>

                        {preferences.push.quietHours.enabled && (
                          <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/50">
                            <div className="space-y-2">
                              <Label>Start Time</Label>
                              <Input
                                type="time"
                                value={preferences.push.quietHours.start}
                                onChange={(e) => 
                                  updatePreferences({ 
                                    push: { 
                                      ...preferences.push, 
                                      quietHours: { 
                                        ...preferences.push.quietHours, 
                                        start: e.target.value 
                                      } 
                                    } 
                                  })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>End Time</Label>
                              <Input
                                type="time"
                                value={preferences.push.quietHours.end}
                                onChange={(e) => 
                                  updatePreferences({ 
                                    push: { 
                                      ...preferences.push, 
                                      quietHours: { 
                                        ...preferences.push.quietHours, 
                                        end: e.target.value 
                                      } 
                                    } 
                                  })
                                }
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* In-App Notifications */}
        <TabsContent value="inapp">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    In-App Notifications
                  </CardTitle>
                  <CardDescription>
                    Configure in-app notification behavior
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestNotification('inapp')}
                    disabled={testStatus.find(t => t.type === 'inapp')?.status === 'testing'}
                  >
                    {testStatus.find(t => t.type === 'inapp')?.status === 'testing' ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Test className="h-4 w-4 mr-2" />
                    )}
                    Test In-App
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Master In-App Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Enable In-App Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Show notifications within the application
                  </p>
                </div>
                <Switch
                  checked={preferences.inApp.enabled}
                  onCheckedChange={(enabled) => 
                    updatePreferences({ inApp: { ...preferences.inApp, enabled } })
                  }
                />
              </div>

              {preferences.inApp.enabled && (
                <>
                  <Separator />
                  
                  {/* In-App Notification Types */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Notification Types</h4>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Session Reminders</Label>
                          <p className="text-sm text-muted-foreground">
                            In-app reminders for upcoming sessions
                          </p>
                        </div>
                        <Switch
                          checked={preferences.inApp.sessionReminders}
                          onCheckedChange={(sessionReminders) => 
                            updatePreferences({ inApp: { ...preferences.inApp, sessionReminders } })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Message Notifications</Label>
                          <p className="text-sm text-muted-foreground">
                            Show new message notifications
                          </p>
                        </div>
                        <Switch
                          checked={preferences.inApp.messageNotifications}
                          onCheckedChange={(messageNotifications) => 
                            updatePreferences({ inApp: { ...preferences.inApp, messageNotifications } })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>System Notifications</Label>
                          <p className="text-sm text-muted-foreground">
                            Platform updates and announcements
                          </p>
                        </div>
                        <Switch
                          checked={preferences.inApp.systemNotifications}
                          onCheckedChange={(systemNotifications) => 
                            updatePreferences({ inApp: { ...preferences.inApp, systemNotifications } })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Sound and Visual Settings */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Audio & Visual</h4>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5 flex items-center gap-2">
                          {preferences.inApp.sounds ? (
                            <Volume2 className="h-4 w-4" />
                          ) : (
                            <VolumeX className="h-4 w-4" />
                          )}
                          <div>
                            <Label>Notification Sounds</Label>
                            <p className="text-sm text-muted-foreground">
                              Play sound when notifications arrive
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={preferences.inApp.sounds}
                          onCheckedChange={(sounds) => 
                            updatePreferences({ inApp: { ...preferences.inApp, sounds } })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Desktop Notifications</Label>
                          <p className="text-sm text-muted-foreground">
                            Show system notifications outside the app
                          </p>
                        </div>
                        <Switch
                          checked={preferences.inApp.desktop}
                          onCheckedChange={(desktop) => 
                            updatePreferences({ inApp: { ...preferences.inApp, desktop } })
                          }
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* General Settings */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                General Preferences
              </CardTitle>
              <CardDescription>
                Configure general notification settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Language */}
              <div className="space-y-3">
                <Label className="text-base font-medium flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Language
                </Label>
                <Select
                  value={preferences.preferences.language}
                  onValueChange={(language) =>
                    updatePreferences({ preferences: { ...preferences.preferences, language } })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="he">עברית (Hebrew)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Language for notification content
                </p>
              </div>

              <Separator />

              {/* Timezone */}
              <div className="space-y-3">
                <Label className="text-base font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Timezone
                </Label>
                <Select
                  value={preferences.preferences.timezone}
                  onValueChange={(timezone) =>
                    updatePreferences({ preferences: { ...preferences.preferences, timezone } })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">Eastern Time</SelectItem>
                    <SelectItem value="America/Chicago">Central Time</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                    <SelectItem value="Europe/London">London</SelectItem>
                    <SelectItem value="Europe/Paris">Paris</SelectItem>
                    <SelectItem value="Asia/Jerusalem">Jerusalem</SelectItem>
                    <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Your local timezone for scheduling notifications
                </p>
              </div>

              <Separator />

              {/* Reminder Timing */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Reminder Timing</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min="5"
                    max="1440"
                    value={preferences.preferences.reminderTiming}
                    onChange={(e) =>
                      updatePreferences({ 
                        preferences: { 
                          ...preferences.preferences, 
                          reminderTiming: parseInt(e.target.value) || 15 
                        } 
                      })
                    }
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">minutes before sessions</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  How far in advance to receive session reminders
                </p>
              </div>

              <Separator />

              {/* Privacy Notice */}
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <strong>Privacy Notice:</strong> We respect your privacy and will only send notifications 
                  based on your preferences. You can change these settings at any time.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => savePreferencesMutation.mutate(preferences)}
          disabled={savePreferencesMutation.isPending}
        >
          {savePreferencesMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          Save All Changes
        </Button>
      </div>
    </div>
  );
}
