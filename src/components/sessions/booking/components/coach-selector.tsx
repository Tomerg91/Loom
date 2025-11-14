'use client';

import { memo } from 'react';
import { User } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Coach } from '../hooks/use-booking-coaches';

interface CoachSelectorProps {
  coaches: Coach[];
  selectedCoachId: string | null;
  onCoachSelect: (coachId: string) => void;
  isLoading?: boolean;
  showOnlineStatus?: boolean;
  error?: Error | null;
}

const CoachItem = memo(({ coach, isOnline }: { coach: Coach; isOnline?: boolean }) => {
  const coachImageSrc = coach.avatar || coach.avatarUrl;
  const coachName = `${coach.firstName} ${coach.lastName}`;

  return (
    <div className="flex items-center gap-2">
      {coachImageSrc && (
        <Image
          src={coachImageSrc}
          alt={`${coachName} profile picture`}
          width={24}
          height={24}
          className="w-6 h-6 rounded-full"
        />
      )}
      <span>{coachName}</span>
      {isOnline && <div className="w-2 h-2 bg-green-500 rounded-full" title="Online" />}
    </div>
  );
});

CoachItem.displayName = 'CoachItem';

/**
 * Presentational component for coach selection
 * Pure UI component with no business logic
 */
export const CoachSelector = memo<CoachSelectorProps>(
  ({ coaches, selectedCoachId, onCoachSelect, isLoading = false, showOnlineStatus = false, error }) => {
    const t = useTranslations('session');
    const commonT = useTranslations('common');

    if (error) {
      return (
        <div className="space-y-2">
          <legend className="text-sm font-medium leading-none text-destructive">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" aria-hidden="true" />
              {t('selectCoach')}
            </div>
          </legend>
          <p className="text-sm text-destructive">Failed to load coaches: {error.message}</p>
        </div>
      );
    }

    return (
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" aria-hidden="true" />
            {t('selectCoach')}
          </div>
        </legend>
        <Select value={selectedCoachId ?? ''} onValueChange={onCoachSelect}>
          <SelectTrigger data-testid="coach-select">
            <SelectValue placeholder={t('selectCoach')} />
          </SelectTrigger>
          <SelectContent>
            {isLoading ? (
              <SelectItem value="" disabled>
                {commonT('loading')}
              </SelectItem>
            ) : coaches.length === 0 ? (
              <SelectItem value="" disabled>
                No coaches available
              </SelectItem>
            ) : (
              coaches.map((coach) => (
                <SelectItem key={coach.id} value={coach.id}>
                  <CoachItem coach={coach} isOnline={showOnlineStatus ? coach.isOnline : false} />
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </fieldset>
    );
  }
);

CoachSelector.displayName = 'CoachSelector';
