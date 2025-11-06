'use client';

import { 
  Palette,
  Globe,
  Moon,
  Sun,
  Monitor,
  Volume2,
  VolumeX,
  Calendar,
  Layout,
  Accessibility
} from 'lucide-react';
import { useLocale } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { usePathname, useRouter, buildLocalizedPath } from '@/i18n/routing';
import { logger } from '@/lib/logger';

export function PreferencesSettingsCard() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [sounds, setSounds] = useState(true);
  const [animations, setAnimations] = useState(true);
  const [compactMode, setCompactMode] = useState(false);

  const switchLanguage = (newLocale: string) => {
    // usePathname() from next-intl returns path without locale prefix
    // buildLocalizedPath adds the correct locale prefix
    const newPathname = buildLocalizedPath(pathname, newLocale);
    router.push(newPathname);
  };

  const themes = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  const languages = [
    { value: 'en', label: 'English', flag: '🇺🇸' },
    { value: 'he', label: 'עברית', flag: '🇮🇱' },
    { value: 'es', label: 'Español', flag: '🇪🇸' },
    { value: 'fr', label: 'Français', flag: '🇫🇷' },
  ];

  const timezones = [
    { value: 'America/New_York', label: 'Eastern Time (UTC-5)' },
    { value: 'America/Chicago', label: 'Central Time (UTC-6)' },
    { value: 'America/Denver', label: 'Mountain Time (UTC-7)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (UTC-8)' },
    { value: 'Europe/London', label: 'Greenwich Mean Time (UTC+0)' },
    { value: 'Europe/Paris', label: 'Central European Time (UTC+1)' },
    { value: 'Asia/Tokyo', label: 'Japan Standard Time (UTC+9)' },
    { value: 'UTC', label: 'Coordinated Universal Time (UTC)' },
  ];

  const calendarViews = [
    { value: 'month', label: 'Month View' },
    { value: 'week', label: 'Week View' },
    { value: 'day', label: 'Day View' },
    { value: 'agenda', label: 'Agenda View' },
  ];

  return (
    <div className="space-y-6">
      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Palette className="h-5 w-5" />
            <span>Appearance</span>
          </CardTitle>
          <CardDescription>
            Customize the look and feel of the application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="text-base font-medium mb-3 block">Theme</Label>
            <div className="grid grid-cols-3 gap-3">
              {themes.map((theme) => {
                const IconComponent = theme.icon;
                return (
                  <button
                    key={theme.value}
                    className="flex flex-col items-center p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    onClick={() => logger.debug('Theme changed to:', theme.value)}
                  >
                    <IconComponent className="w-6 h-6 mb-2" />
                    <span className="text-sm font-medium">{theme.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Compact Mode</Label>
              <p className="text-sm text-muted-foreground">
                Use smaller spacing and components for more content density
              </p>
            </div>
            <Switch checked={compactMode} onCheckedChange={setCompactMode} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Animations</Label>
              <p className="text-sm text-muted-foreground">
                Enable smooth transitions and animations
              </p>
            </div>
            <Switch checked={animations} onCheckedChange={setAnimations} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium flex items-center space-x-2">
                {sounds ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                <span>Sound Effects</span>
              </Label>
              <p className="text-sm text-muted-foreground">
                Play sounds for notifications and interactions
              </p>
            </div>
            <Switch checked={sounds} onCheckedChange={setSounds} />
          </div>
        </CardContent>
      </Card>

      {/* Language & Region */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Globe className="h-5 w-5" />
            <span>Language &amp; Region</span>
          </CardTitle>
          <CardDescription>
            Set your language and regional preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="language">Display Language</Label>
            <Select value={locale} onValueChange={switchLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    <div className="flex items-center space-x-2">
                      <span>{lang.flag}</span>
                      <span>{lang.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="timezone">Timezone</Label>
            <Select defaultValue="America/New_York">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timezones.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="dateFormat">Date Format</Label>
            <Select defaultValue="MM/DD/YYYY">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (US)</SelectItem>
                <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (International)</SelectItem>
                <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (ISO)</SelectItem>
                <SelectItem value="DD MMM YYYY">DD MMM YYYY (Verbose)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="timeFormat">Time Format</Label>
            <Select defaultValue="12h">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12h">12-hour (AM/PM)</SelectItem>
                <SelectItem value="24h">24-hour</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Calendar & Scheduling */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Calendar &amp; Scheduling</span>
          </CardTitle>
          <CardDescription>
            Configure your calendar and scheduling preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="defaultView">Default Calendar View</Label>
            <Select defaultValue="week">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {calendarViews.map((view) => (
                  <SelectItem key={view.value} value={view.value}>
                    {view.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="weekStart">Week Starts On</Label>
            <Select defaultValue="sunday">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sunday">Sunday</SelectItem>
                <SelectItem value="monday">Monday</SelectItem>
                <SelectItem value="saturday">Saturday</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="workingHours">Working Hours</Label>
            <div className="grid grid-cols-2 gap-2">
              <Select defaultValue="09:00">
                <SelectTrigger>
                  <SelectValue placeholder="Start time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="08:00">8:00 AM</SelectItem>
                  <SelectItem value="09:00">9:00 AM</SelectItem>
                  <SelectItem value="10:00">10:00 AM</SelectItem>
                </SelectContent>
              </Select>
              <Select defaultValue="17:00">
                <SelectTrigger>
                  <SelectValue placeholder="End time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="16:00">4:00 PM</SelectItem>
                  <SelectItem value="17:00">5:00 PM</SelectItem>
                  <SelectItem value="18:00">6:00 PM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Show Weekend on Calendar</Label>
              <p className="text-sm text-muted-foreground">
                Display Saturday and Sunday on calendar views
              </p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      {/* Dashboard Layout */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Layout className="h-5 w-5" />
            <span>Dashboard Layout</span>
          </CardTitle>
          <CardDescription>
            Customize your dashboard and workspace layout
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="dashboardLayout">Dashboard Layout</Label>
            <Select defaultValue="default">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default Layout</SelectItem>
                <SelectItem value="minimal">Minimal Layout</SelectItem>
                <SelectItem value="detailed">Detailed Layout</SelectItem>
                <SelectItem value="custom">Custom Layout</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Show Quick Actions</Label>
              <p className="text-sm text-muted-foreground">
                Display quick action buttons on the dashboard
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Show Recent Activity</Label>
              <p className="text-sm text-muted-foreground">
                Display recent activity feed on the dashboard
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-refresh Dashboard</Label>
              <p className="text-sm text-muted-foreground">
                Automatically refresh dashboard data every 5 minutes
              </p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      {/* Accessibility */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Accessibility className="h-5 w-5" />
            <span>Accessibility</span>
          </CardTitle>
          <CardDescription>
            Configure accessibility features to improve your experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>High Contrast Mode</Label>
              <p className="text-sm text-muted-foreground">
                Increase contrast for better visibility
              </p>
            </div>
            <Switch />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Large Text Mode</Label>
              <p className="text-sm text-muted-foreground">
                Increase text size throughout the application
              </p>
            </div>
            <Switch />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Reduce Motion</Label>
              <p className="text-sm text-muted-foreground">
                Minimize animations and transitions for motion sensitivity
              </p>
            </div>
            <Switch />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Screen Reader Support</Label>
              <p className="text-sm text-muted-foreground">
                Enable enhanced screen reader compatibility
              </p>
            </div>
            <Switch />
          </div>

          <div>
            <Label htmlFor="focusIndicator">Focus Indicator Style</Label>
            <Select defaultValue="default">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="high-contrast">High Contrast</SelectItem>
                <SelectItem value="thick">Thick Border</SelectItem>
                <SelectItem value="glow">Glow Effect</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Save Settings */}
      <div className="flex justify-end">
        <Button>
          Save Preferences
        </Button>
      </div>
    </div>
  );
}