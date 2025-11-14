'use client';

import { memo, useMemo } from 'react';
import { addDays, format, startOfTomorrow } from 'date-fns';
import { useTranslations } from 'next-intl';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DateSelectorProps {
  selectedDate: string | null;
  onDateSelect: (date: string) => void;
  daysAhead?: number;
}

/**
 * Presentational component for date selection
 * Pure UI component with no business logic
 */
export const DateSelector = memo<DateSelectorProps>(
  ({ selectedDate, onDateSelect, daysAhead = 30 }) => {
    const t = useTranslations('session');

    // Generate available dates
    const availableDates = useMemo(
      () =>
        Array.from({ length: daysAhead }, (_, i) => {
          const date = addDays(startOfTomorrow(), i);
          return {
            value: format(date, 'yyyy-MM-dd'),
            label: format(date, 'EEEE, MMMM d, yyyy'),
          };
        }),
      [daysAhead]
    );

    return (
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {t('selectDate')}
        </legend>
        <Select value={selectedDate ?? ''} onValueChange={onDateSelect}>
          <SelectTrigger>
            <SelectValue placeholder={t('selectDate')} />
          </SelectTrigger>
          <SelectContent>
            {availableDates.map((date) => (
              <SelectItem key={date.value} value={date.value}>
                {date.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </fieldset>
    );
  }
);

DateSelector.displayName = 'DateSelector';
