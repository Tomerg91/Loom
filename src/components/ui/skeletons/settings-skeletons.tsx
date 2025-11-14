/**
 * @fileoverview Settings and preferences skeleton components
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton, SkeletonText, SkeletonAvatar, SkeletonButton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * Skeleton for settings card
 */
export function SettingsCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <SkeletonText className="h-6 w-40" />
        <SkeletonText className="h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b last:border-b-0">
            <div className="space-y-1 flex-1">
              <SkeletonText className="h-4 w-32" />
              <SkeletonText className="h-3 w-48" />
            </div>
            <Skeleton className="h-6 w-12 rounded-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton for profile settings
 */
export function ProfileSettingsSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('w-full', className)} role="status" aria-label="Loading profile settings">
      <CardHeader>
        <SkeletonText className="h-6 w-40" />
        <SkeletonText className="h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar Section */}
        <div className="flex items-center gap-4">
          <SkeletonAvatar className="h-20 w-20" />
          <div className="space-y-2 flex-1">
            <SkeletonText className="h-4 w-32" />
            <div className="flex gap-2">
              <SkeletonButton className="h-9 w-24" />
              <SkeletonButton className="h-9 w-24" />
            </div>
          </div>
        </div>

        {/* Form Fields */}
        {[
          'Full Name',
          'Email',
          'Phone',
          'Bio',
          'Location',
          'Timezone'
        ].map((field, i) => (
          <div key={i} className="space-y-2">
            <SkeletonText className="h-4 w-24" />
            <Skeleton className="h-10 w-full rounded" />
          </div>
        ))}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <SkeletonButton className="h-10 w-24" />
          <SkeletonButton className="h-10 w-32" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton for notification settings
 */
export function NotificationSettingsSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('w-full', className)} role="status" aria-label="Loading notification settings">
      <CardHeader>
        <SkeletonText className="h-6 w-48" />
        <SkeletonText className="h-4 w-72" />
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Notification Categories */}
        {['Email Notifications', 'Push Notifications', 'SMS Notifications', 'In-App Notifications'].map((_, i) => (
          <div key={i} className="space-y-4">
            <SkeletonText className="h-5 w-40" />
            <div className="space-y-3 pl-4">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex items-center justify-between py-2">
                  <div className="space-y-1 flex-1">
                    <SkeletonText className="h-4 w-48" />
                    <SkeletonText className="h-3 w-64" />
                  </div>
                  <Skeleton className="h-6 w-12 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <SkeletonButton className="h-10 w-32" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton for security settings
 */
export function SecuritySettingsSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('w-full', className)} role="status" aria-label="Loading security settings">
      <CardHeader>
        <SkeletonText className="h-6 w-40" />
        <SkeletonText className="h-4 w-72" />
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Password Section */}
        <div className="space-y-4 pb-6 border-b">
          <SkeletonText className="h-5 w-32" />
          <div className="space-y-3">
            <div className="space-y-2">
              <SkeletonText className="h-4 w-32" />
              <Skeleton className="h-10 w-full rounded" />
            </div>
            <div className="space-y-2">
              <SkeletonText className="h-4 w-32" />
              <Skeleton className="h-10 w-full rounded" />
            </div>
            <div className="space-y-2">
              <SkeletonText className="h-4 w-40" />
              <Skeleton className="h-10 w-full rounded" />
            </div>
          </div>
          <SkeletonButton className="h-9 w-36" />
        </div>

        {/* Two-Factor Authentication */}
        <div className="space-y-4 pb-6 border-b">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <SkeletonText className="h-5 w-56" />
              <SkeletonText className="h-3 w-72" />
            </div>
            <Skeleton className="h-6 w-12 rounded-full" />
          </div>
        </div>

        {/* Active Sessions */}
        <div className="space-y-4">
          <SkeletonText className="h-5 w-32" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start justify-between p-3 border rounded-lg">
                <div className="space-y-2 flex-1">
                  <SkeletonText className="h-4 w-48" />
                  <SkeletonText className="h-3 w-64" />
                  <SkeletonText className="h-3 w-40" />
                </div>
                <SkeletonButton className="h-8 w-20" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton for preferences settings
 */
export function PreferencesSettingsSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('w-full', className)} role="status" aria-label="Loading preferences">
      <CardHeader>
        <SkeletonText className="h-6 w-32" />
        <SkeletonText className="h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Theme */}
        <div className="space-y-3">
          <SkeletonText className="h-4 w-24" />
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        </div>

        {/* Language */}
        <div className="space-y-2">
          <SkeletonText className="h-4 w-24" />
          <Skeleton className="h-10 w-full rounded" />
        </div>

        {/* Time Format */}
        <div className="space-y-2">
          <SkeletonText className="h-4 w-28" />
          <div className="flex gap-4">
            <Skeleton className="h-10 w-32 rounded" />
            <Skeleton className="h-10 w-32 rounded" />
          </div>
        </div>

        {/* Timezone */}
        <div className="space-y-2">
          <SkeletonText className="h-4 w-24" />
          <Skeleton className="h-10 w-full rounded" />
        </div>

        {/* Week Start */}
        <div className="space-y-2">
          <SkeletonText className="h-4 w-32" />
          <Skeleton className="h-10 w-full rounded" />
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <SkeletonButton className="h-10 w-32" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton for full settings page
 */
export function SettingsPageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)} role="status" aria-label="Loading settings">
      {/* Header */}
      <div className="space-y-2">
        <SkeletonText className="h-8 w-40" />
        <SkeletonText className="h-4 w-72" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonButton key={i} className="h-10 w-24" />
        ))}
      </div>

      {/* Settings Cards */}
      <div className="space-y-6">
        <SettingsCardSkeleton />
        <SettingsCardSkeleton />
        <SettingsCardSkeleton />
      </div>
    </div>
  );
}

/**
 * Skeleton for language settings
 */
export function LanguageSettingsSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <SkeletonText className="h-6 w-48" />
        <SkeletonText className="h-4 w-72" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <SkeletonText className="h-4 w-32" />
          <Skeleton className="h-10 w-full rounded" />
        </div>
        <div className="space-y-2">
          <SkeletonText className="h-4 w-40" />
          <div className="flex gap-4">
            <Skeleton className="h-10 w-32 rounded" />
            <Skeleton className="h-10 w-32 rounded" />
          </div>
        </div>
        <div className="flex justify-end pt-4">
          <SkeletonButton className="h-10 w-32" />
        </div>
      </CardContent>
    </Card>
  );
}
