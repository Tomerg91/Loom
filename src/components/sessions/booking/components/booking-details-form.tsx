'use client';

import { memo } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface BookingDetailsFormProps {
  title: string;
  description: string;
  duration: number;
  timezone: string;
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
  onDurationChange: (duration: number) => void;
  onTimezoneChange: (timezone: string) => void;
  errors?: {
    title?: string;
    description?: string;
    duration?: string;
    timezone?: string;
  };
  isLoading?: boolean;
}

/**
 * Presentational component for booking details form
 * Pure UI component with no business logic
 */
export const BookingDetailsForm = memo<BookingDetailsFormProps>(
  ({
    title,
    description,
    duration,
    timezone,
    onTitleChange,
    onDescriptionChange,
    onDurationChange,
    onTimezoneChange,
    errors = {},
    isLoading = false,
  }) => {
    const t = useTranslations('session');

    return (
      <fieldset className="space-y-4">
        <legend className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-4">
          Session Details
        </legend>

        {/* Duration Selection */}
        <div className="space-y-2">
          <Label htmlFor="duration">{t('duration')}</Label>
          <Select value={duration.toString()} onValueChange={(value) => onDurationChange(parseInt(value))}>
            <SelectTrigger id="duration" data-testid="session-type-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 {t('minutes')}</SelectItem>
              <SelectItem value="45">45 {t('minutes')}</SelectItem>
              <SelectItem value="60">60 {t('minutes')}</SelectItem>
              <SelectItem value="90">90 {t('minutes')}</SelectItem>
              <SelectItem value="120">120 {t('minutes')}</SelectItem>
            </SelectContent>
          </Select>
          {errors.duration && (
            <p className="text-sm text-destructive" role="alert">
              {errors.duration}
            </p>
          )}
        </div>

        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">{t('title')}</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Weekly check-in session"
            aria-describedby="title-error"
            data-testid="session-title"
            disabled={isLoading}
          />
          {errors.title && (
            <p id="title-error" className="text-sm text-destructive" role="alert">
              {errors.title}
            </p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">{t('description')} (optional)</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Brief description of what you'd like to focus on..."
            aria-describedby="description-error"
            data-testid="session-description"
            disabled={isLoading}
          />
          {errors.description && (
            <p id="description-error" className="text-sm text-destructive" role="alert">
              {errors.description}
            </p>
          )}
        </div>

        {/* Timezone */}
        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Input
            id="timezone"
            value={timezone}
            onChange={(e) => onTimezoneChange(e.target.value)}
            placeholder={Intl.DateTimeFormat().resolvedOptions().timeZone}
            disabled={isLoading}
            data-testid="timezone-input"
          />
          {errors.timezone && (
            <p className="text-sm text-destructive" role="alert">
              {errors.timezone}
            </p>
          )}
          <p className="text-xs text-muted-foreground">Your timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
        </div>
      </fieldset>
    );
  }
);

BookingDetailsForm.displayName = 'BookingDetailsForm';
