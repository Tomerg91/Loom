'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { 
  Bell,
  User,
  Shield,
  Palette,
  Globe,
  CreditCard,
  Key,
  Smartphone,
  Monitor,
  ArrowRight
} from 'lucide-react';
import { NotificationSettingsCard } from './notification-settings-card';
import { ProfileSettingsCard } from './profile-settings-card';
import { SecuritySettingsCard } from './security-settings-card';
import { PreferencesSettingsCard } from './preferences-settings-card';
import { LanguageSwitcher } from '@/components/ui/language-switcher';

export function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('profile');

  const settingsCategories = [
    {
      id: 'profile',
      label: 'Profile',
      description: 'Manage your personal information and profile details',
      icon: User,
      href: '/settings',
    },
    {
      id: 'notifications',
      label: 'Notifications',
      description: 'Configure your notification preferences',
      icon: Bell,
      href: '/settings/notifications',
    },
    {
      id: 'security',
      label: 'Security &amp; Privacy',
      description: 'Manage your security settings and privacy preferences',
      icon: Shield,
      href: '/settings/security',
    },
    {
      id: 'preferences',
      label: 'Preferences',
      description: 'Customize your app experience',
      icon: Palette,
      href: '/settings/preferences',
    },
  ];

  const quickActions = [
    {
      title: 'Notification Settings',
      description: 'Manage email, push, and in-app notifications',
      icon: Bell,
      href: '/settings/notifications',
      action: 'Configure',
    },
    {
      title: 'Two-Factor Authentication',
      description: 'Add an extra layer of security to your account',
      icon: Smartphone,
      href: '/settings/security',
      action: 'Setup',
    },
    {
      title: 'Language &amp; Region',
      description: 'Change your language and regional settings',
      icon: Globe,
      href: '/settings/preferences',
      action: 'Change',
    },
    {
      title: 'Connected Devices',
      description: 'Manage devices that have access to your account',
      icon: Monitor,
      href: '/settings/security',
      action: 'Manage',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <LanguageSwitcher variant="select" showFlag={true} />
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common settings you might want to adjust
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickActions.map((action) => (
              <div
                key={action.title}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => router.push(action.href)}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <action.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{action.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-primary">{action.action}</span>
                  <ArrowRight className="w-4 h-4 text-primary" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          {settingsCategories.map((category) => (
            <TabsTrigger key={category.id} value={category.id} className="flex items-center space-x-2">
              <category.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{category.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <ProfileSettingsCard />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <NotificationSettingsCard />
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <SecuritySettingsCard />
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <PreferencesSettingsCard />
        </TabsContent>
      </Tabs>

      {/* Account Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Account Actions</CardTitle>
          <CardDescription>
            Manage your account and data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-20 flex-col">
              <CreditCard className="h-6 w-6 mb-2" />
              <span>Billing &amp; Payments</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Key className="h-6 w-6 mb-2" />
              <span>API Keys</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col text-destructive">
              <User className="h-6 w-6 mb-2" />
              <span>Delete Account</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Help & Support */}
      <Card>
        <CardHeader>
          <CardTitle>Help &amp; Support</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button variant="link" className="p-0">
              Privacy Policy
            </Button>
            <Button variant="link" className="p-0">
              Terms of Service
            </Button>
            <Button variant="link" className="p-0">
              Contact Support
            </Button>
            <Button variant="link" className="p-0">
              Feature Requests
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}