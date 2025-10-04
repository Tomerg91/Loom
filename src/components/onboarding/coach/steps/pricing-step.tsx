'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PricingStepData, Currency, SpokenLanguage } from '@/lib/types/onboarding';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const pricingSchema = z.object({
  sessionRate: z.number().min(1, 'Session rate must be at least 1').max(10000, 'Session rate seems too high'),
  currency: z.enum(['USD', 'EUR', 'ILS', 'GBP']),
  languages: z.array(z.string()).min(1, 'Please select at least one language'),
  timezone: z.string().min(1, 'Please select your timezone'),
});

interface PricingStepProps {
  data: Partial<PricingStepData>;
  onNext: (data: PricingStepData) => void;
  onBack: () => void;
}

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  ILS: '₪',
  GBP: '£',
};

const LANGUAGE_OPTIONS: { value: SpokenLanguage; labelKey: string; flag: string }[] = [
  { value: 'en', labelKey: 'english', flag: '🇬🇧' },
  { value: 'he', labelKey: 'hebrew', flag: '🇮🇱' },
  { value: 'es', labelKey: 'spanish', flag: '🇪🇸' },
  { value: 'fr', labelKey: 'french', flag: '🇫🇷' },
  { value: 'de', labelKey: 'german', flag: '🇩🇪' },
  { value: 'ar', labelKey: 'arabic', flag: '🇸🇦' },
  { value: 'ru', labelKey: 'russian', flag: '🇷🇺' },
  { value: 'pt', labelKey: 'portuguese', flag: '🇵🇹' },
];

// Common timezones grouped by region
const TIMEZONE_OPTIONS = [
  { group: 'America', zones: ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles'] },
  { group: 'Europe', zones: ['Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Athens'] },
  { group: 'Asia', zones: ['Asia/Jerusalem', 'Asia/Dubai', 'Asia/Tokyo', 'Asia/Singapore'] },
  { group: 'Australia', zones: ['Australia/Sydney', 'Australia/Melbourne'] },
];

export function PricingStep({ data, onNext, onBack }: PricingStepProps) {
  const t = useTranslations('onboarding.coach.pricing');
  const tCommon = useTranslations('common');

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PricingStepData>({
    resolver: zodResolver(pricingSchema),
    defaultValues: {
      sessionRate: data.sessionRate || 100,
      currency: data.currency || 'USD',
      languages: data.languages || [],
      timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });

  const watchedLanguages = watch('languages');
  const watchedCurrency = watch('currency');

  const toggleLanguage = (lang: SpokenLanguage) => {
    const current = watchedLanguages as string[];
    if (current.includes(lang)) {
      setValue(
        'languages',
        current.filter((l) => l !== lang)
      );
    } else {
      setValue('languages', [...current, lang]);
    }
  };

  const onSubmit = (formData: PricingStepData) => {
    onNext(formData);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Session Rate */}
      <div className="space-y-2">
        <Label htmlFor="sessionRate">
          {t('sessionRate')} <span className="text-destructive">*</span>
        </Label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sand-500 font-medium">
            {CURRENCY_SYMBOLS[watchedCurrency]}
          </span>
          <Input
            id="sessionRate"
            type="number"
            min="1"
            max="10000"
            step="1"
            {...register('sessionRate', { valueAsNumber: true })}
            className="pl-10"
            error={errors.sessionRate?.message}
            aria-describedby="rate-helper"
          />
        </div>
        <p id="rate-helper" className="text-sm text-sand-500">
          {t('sessionRateHelper')}
        </p>
      </div>

      {/* Currency */}
      <div className="space-y-2">
        <Label htmlFor="currency">
          {t('currency')} <span className="text-destructive">*</span>
        </Label>
        <Controller
          control={control}
          name="currency"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="currency" aria-describedby="currency-helper">
                <SelectValue placeholder={t('selectCurrency')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">
                  {CURRENCY_SYMBOLS.USD} USD - {t('currencyOptions.usd')}
                </SelectItem>
                <SelectItem value="EUR">
                  {CURRENCY_SYMBOLS.EUR} EUR - {t('currencyOptions.eur')}
                </SelectItem>
                <SelectItem value="ILS">
                  {CURRENCY_SYMBOLS.ILS} ILS - {t('currencyOptions.ils')}
                </SelectItem>
                <SelectItem value="GBP">
                  {CURRENCY_SYMBOLS.GBP} GBP - {t('currencyOptions.gbp')}
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        <p id="currency-helper" className="text-sm text-sand-500">
          {t('currencyHelper')}
        </p>
      </div>

      {/* Languages */}
      <div className="space-y-3">
        <Label>
          {t('languages')} <span className="text-destructive">*</span>
        </Label>
        <p className="text-sm text-sand-500">{t('languagesHelper')}</p>

        <div className="flex flex-wrap gap-2">
          {LANGUAGE_OPTIONS.map((option) => {
            const isSelected = (watchedLanguages as string[]).includes(option.value);
            return (
              <Badge
                key={option.value}
                variant={isSelected ? 'default' : 'outline'}
                className={cn(
                  'cursor-pointer transition-all hover:scale-105 text-base',
                  isSelected
                    ? 'bg-teal-400 hover:bg-teal-500 text-white'
                    : 'hover:border-teal-400 hover:text-teal-600'
                )}
                onClick={() => toggleLanguage(option.value)}
                role="checkbox"
                aria-checked={isSelected}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleLanguage(option.value);
                  }
                }}
              >
                <span className="mr-1">{option.flag}</span>
                {t(`languageOptions.${option.labelKey}`)}
                {isSelected && <X className="ml-1 h-3 w-3" />}
              </Badge>
            );
          })}
        </div>

        {errors.languages && (
          <p className="text-sm text-destructive" role="alert">
            {errors.languages.message}
          </p>
        )}
      </div>

      {/* Timezone */}
      <div className="space-y-2">
        <Label htmlFor="timezone">
          {t('timezone')} <span className="text-destructive">*</span>
        </Label>
        <Controller
          control={control}
          name="timezone"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="timezone" aria-describedby="timezone-helper">
                <SelectValue placeholder={t('selectTimezone')} />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONE_OPTIONS.map((group) => (
                  <div key={group.group}>
                    <div className="px-2 py-1.5 text-sm font-semibold text-sand-700">
                      {group.group}
                    </div>
                    {group.zones.map((zone) => (
                      <SelectItem key={zone} value={zone}>
                        {zone.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.timezone && (
          <p className="text-sm text-destructive" role="alert">
            {errors.timezone.message}
          </p>
        )}
        <p id="timezone-helper" className="text-sm text-sand-500">
          {t('timezoneHelper')}
        </p>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-6">
        <Button type="button" variant="outline" onClick={onBack}>
          {tCommon('back')}
        </Button>
        <Button type="submit">{tCommon('next')}</Button>
      </div>
    </form>
  );
}
