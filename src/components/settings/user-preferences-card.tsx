'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';

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
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useUserPreferences, useUpdateUserPreferences } from '@/lib/queries/settings';
import type { UserPreferences } from '@/types';

export function UserPreferencesCard() {
  const t = useTranslations('settings');
  const { toast } = useToast();
  const { data: preferences, isLoading } = useUserPreferences();
  const updatePreferences = useUpdateUserPreferences();

  const [localPreferences, setLocalPreferences] = useState<Partial<UserPreferences>>(preferences || {});

  // Sync local state when data loads
  if (preferences && Object.keys(localPreferences).length === 0) {
    setLocalPreferences(preferences);
  }

  const handleSave = async () => {
    try {
      await updatePreferences.mutateAsync(localPreferences);
      toast({
        title: t('saved'),
        description: t('preferences.title'),
      });
    } catch (error) {
      toast({
        title: t('error'),
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const updatePreference = <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    setLocalPreferences((prev) => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('preferences.title')}</CardTitle>
        <CardDescription>{t('preferences.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Display Preferences */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">{t('preferences.display.title')}</h3>

          <div className="space-y-2">
            <Label htmlFor="theme">{t('preferences.display.theme')}</Label>
            <Select
              value={localPreferences.theme || 'system'}
              onValueChange={(value) => updatePreference('theme', value as UserPreferences['theme'])}
            >
              <SelectTrigger id="theme">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">{t('preferences.display.themeLight')}</SelectItem>
                <SelectItem value="dark">{t('preferences.display.themeDark')}</SelectItem>
                <SelectItem value="system">{t('preferences.display.themeSystem')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fontSize">{t('preferences.display.fontSize')}</Label>
            <Select
              value={localPreferences.fontSize || 'medium'}
              onValueChange={(value) => updatePreference('fontSize', value as UserPreferences['fontSize'])}
            >
              <SelectTrigger id="fontSize">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">{t('preferences.display.fontSizeSmall')}</SelectItem>
                <SelectItem value="medium">{t('preferences.display.fontSizeMedium')}</SelectItem>
                <SelectItem value="large">{t('preferences.display.fontSizeLarge')}</SelectItem>
                <SelectItem value="x-large">{t('preferences.display.fontSizeXLarge')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="sidebar-collapsed">{t('preferences.display.sidebarCollapsed')}</Label>
            <Switch
              id="sidebar-collapsed"
              checked={localPreferences.sidebarCollapsed || false}
              onCheckedChange={(checked) => updatePreference('sidebarCollapsed', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="compact-mode">{t('preferences.display.compactMode')}</Label>
            <Switch
              id="compact-mode"
              checked={localPreferences.compactMode || false}
              onCheckedChange={(checked) => updatePreference('compactMode', checked)}
            />
          </div>
        </div>

        <Separator />

        {/* Localization Preferences */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">{t('preferences.localization.title')}</h3>

          <div className="space-y-2">
            <Label htmlFor="language">{t('preferences.localization.language')}</Label>
            <Select
              value={localPreferences.language || 'en'}
              onValueChange={(value) => updatePreference('language', value as UserPreferences['language'])}
            >
              <SelectTrigger id="language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{t('preferences.localization.languageEn')}</SelectItem>
                <SelectItem value="he">{t('preferences.localization.languageHe')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">{t('preferences.localization.timezone')}</Label>
            <Select
              value={localPreferences.timezone || 'UTC'}
              onValueChange={(value) => updatePreference('timezone', value)}
            >
              <SelectTrigger id="timezone">
                <SelectValue />
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateFormat">{t('preferences.localization.dateFormat')}</Label>
            <Select
              value={localPreferences.dateFormat || 'MM/DD/YYYY'}
              onValueChange={(value) => updatePreference('dateFormat', value as UserPreferences['dateFormat'])}
            >
              <SelectTrigger id="dateFormat">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeFormat">{t('preferences.localization.timeFormat')}</Label>
            <Select
              value={localPreferences.timeFormat || '12h'}
              onValueChange={(value) => updatePreference('timeFormat', value as UserPreferences['timeFormat'])}
            >
              <SelectTrigger id="timeFormat">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12h">{t('preferences.localization.timeFormat12')}</SelectItem>
                <SelectItem value="24h">{t('preferences.localization.timeFormat24')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        {/* Session Preferences */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">{t('preferences.session.title')}</h3>

          <div className="flex items-center justify-between">
            <Label htmlFor="auto-join-video">{t('preferences.session.autoJoinVideo')}</Label>
            <Switch
              id="auto-join-video"
              checked={localPreferences.autoJoinVideo !== false}
              onCheckedChange={(checked) => updatePreference('autoJoinVideo', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="auto-start-audio">{t('preferences.session.autoStartAudio')}</Label>
            <Switch
              id="auto-start-audio"
              checked={localPreferences.autoStartAudio !== false}
              onCheckedChange={(checked) => updatePreference('autoStartAudio', checked)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="videoQuality">{t('preferences.session.videoQuality')}</Label>
            <Select
              value={localPreferences.videoQuality || 'auto'}
              onValueChange={(value) => updatePreference('videoQuality', value as UserPreferences['videoQuality'])}
            >
              <SelectTrigger id="videoQuality">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">{t('preferences.session.videoQualityAuto')}</SelectItem>
                <SelectItem value="low">{t('preferences.session.videoQualityLow')}</SelectItem>
                <SelectItem value="medium">{t('preferences.session.videoQualityMedium')}</SelectItem>
                <SelectItem value="high">{t('preferences.session.videoQualityHigh')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        {/* Privacy Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">{t('privacy.title')}</h3>

          <div className="space-y-2">
            <Label htmlFor="profileVisibility">{t('privacy.profileVisibility')}</Label>
            <Select
              value={localPreferences.profileVisibility || 'private'}
              onValueChange={(value) => updatePreference('profileVisibility', value as UserPreferences['profileVisibility'])}
            >
              <SelectTrigger id="profileVisibility">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">{t('privacy.visibilityPublic')}</SelectItem>
                <SelectItem value="private">{t('privacy.visibilityPrivate')}</SelectItem>
                <SelectItem value="contacts">{t('privacy.visibilityContacts')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="show-online-status">{t('privacy.showOnlineStatus')}</Label>
            <Switch
              id="show-online-status"
              checked={localPreferences.showOnlineStatus !== false}
              onCheckedChange={(checked) => updatePreference('showOnlineStatus', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="allow-search-indexing">{t('privacy.allowSearchIndexing')}</Label>
            <Switch
              id="allow-search-indexing"
              checked={localPreferences.allowSearchIndexing || false}
              onCheckedChange={(checked) => updatePreference('allowSearchIndexing', checked)}
            />
          </div>
        </div>

        <Separator />

        {/* Accessibility Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">{t('accessibility.title')}</h3>
          <p className="text-sm text-muted-foreground">{t('accessibility.description')}</p>

          <div className="flex items-center justify-between">
            <Label htmlFor="reduced-motion">{t('accessibility.reducedMotion')}</Label>
            <Switch
              id="reduced-motion"
              checked={localPreferences.reducedMotion || false}
              onCheckedChange={(checked) => updatePreference('reducedMotion', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="high-contrast">{t('accessibility.highContrast')}</Label>
            <Switch
              id="high-contrast"
              checked={localPreferences.highContrast || false}
              onCheckedChange={(checked) => updatePreference('highContrast', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="screen-reader-optimized">{t('accessibility.screenReaderOptimized')}</Label>
            <Switch
              id="screen-reader-optimized"
              checked={localPreferences.screenReaderOptimized || false}
              onCheckedChange={(checked) => updatePreference('screenReaderOptimized', checked)}
            />
          </div>
        </div>

        <Separator />

        {/* Data & Analytics */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">{t('preferences.data.title')}</h3>

          <div className="flex items-center justify-between">
            <Label htmlFor="analytics-enabled">{t('preferences.data.analyticsEnabled')}</Label>
            <Switch
              id="analytics-enabled"
              checked={localPreferences.analyticsEnabled !== false}
              onCheckedChange={(checked) => updatePreference('analyticsEnabled', checked)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dataExportFrequency">{t('preferences.data.dataExportFrequency')}</Label>
            <Select
              value={localPreferences.dataExportFrequency || 'never'}
              onValueChange={(value) => updatePreference('dataExportFrequency', value as UserPreferences['dataExportFrequency'])}
            >
              <SelectTrigger id="dataExportFrequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="never">{t('preferences.data.exportNever')}</SelectItem>
                <SelectItem value="weekly">{t('preferences.data.exportWeekly')}</SelectItem>
                <SelectItem value="monthly">{t('preferences.data.exportMonthly')}</SelectItem>
                <SelectItem value="quarterly">{t('preferences.data.exportQuarterly')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setLocalPreferences(preferences || {})}
            disabled={updatePreferences.isPending}
          >
            {t('actions.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={updatePreferences.isPending}>
            {updatePreferences.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {updatePreferences.isPending ? t('actions.saving') : t('actions.save')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
