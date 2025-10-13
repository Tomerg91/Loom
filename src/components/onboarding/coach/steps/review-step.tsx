'use client';

import { Edit2, AlertCircle, CheckCircle2 } from 'lucide-react';
import NextImage from 'next/image';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { CoachOnboardingData, Currency, DayOfWeek } from '@/lib/types/onboarding';
import { cn } from '@/lib/utils';


interface ReviewStepProps {
  data: CoachOnboardingData;
  onSubmit: () => void;
  onBack: () => void;
  onEditStep: (step: number) => void;
  isSubmitting?: boolean;
  submitError?: string | null;
}

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  ILS: '₪',
  GBP: '£',
};

export function ReviewStep({ data, onSubmit, onBack, onEditStep, isSubmitting, submitError }: ReviewStepProps) {
  const t = useTranslations('onboarding.coach.review');
  const tCommon = useTranslations('common');
  const tProfile = useTranslations('onboarding.coach.profile');
  const tPricing = useTranslations('onboarding.coach.pricing');
  const tAvailability = useTranslations('onboarding.coach.availability');

  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const handleSubmit = () => {
    if (!acceptedTerms) {
      return;
    }
    onSubmit();
  };

  const formatDayName = (day: DayOfWeek) => {
    const dayMap: Record<DayOfWeek, string> = {
      monday: tAvailability('days.monday'),
      tuesday: tAvailability('days.tuesday'),
      wednesday: tAvailability('days.wednesday'),
      thursday: tAvailability('days.thursday'),
      friday: tAvailability('days.friday'),
      saturday: tAvailability('days.saturday'),
      sunday: tAvailability('days.sunday'),
    };
    return dayMap[day];
  };

  const availableDays = data.availability.weeklyAvailability.filter((day) => day.isAvailable);

  return (
    <div className="space-y-6">
      {/* Profile Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl">{tProfile('title')}</CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onEditStep(0)}
            disabled={isSubmitting}
          >
            <Edit2 className="h-4 w-4 mr-1" />
            {tCommon('edit')}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Profile Picture */}
          {data.profile.profilePictureUrl && (
            <div className="flex justify-center">
              <NextImage
                src={data.profile.profilePictureUrl}
                alt="Profile picture"
                width={120}
                height={120}
                className="rounded-full object-cover border-4 border-teal-400"
              />
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-sand-700">{tProfile('bio')}</p>
            <p className="text-sand-600 mt-1">{data.profile.bio}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-sand-700">{tProfile('yearsOfExperience')}</p>
              <p className="text-sand-600 mt-1">
                {data.profile.yearsOfExperience} {t('years')}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-sand-700">{tProfile('specializations')}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {data.profile.specializations.map((spec) => (
                  <Badge key={spec} variant="outline" className="text-xs">
                    {tProfile(`specializationOptions.${spec.replace('_', '')}`)}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl">{tPricing('title')}</CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onEditStep(1)}
            disabled={isSubmitting}
          >
            <Edit2 className="h-4 w-4 mr-1" />
            {tCommon('edit')}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-sand-700">{tPricing('sessionRate')}</p>
              <p className="text-2xl font-bold text-teal-600 mt-1">
                {CURRENCY_SYMBOLS[data.pricing.currency]}
                {data.pricing.sessionRate}
              </p>
              <p className="text-xs text-sand-500">{t('perSession')}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-sand-700">{tPricing('timezone')}</p>
              <p className="text-sand-600 mt-1">{data.pricing.timezone.replace(/_/g, ' ')}</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-sand-700">{tPricing('languages')}</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {data.pricing.languages.map((lang) => (
                <Badge key={lang} className="bg-teal-400">
                  {tPricing(`languageOptions.${lang === 'en' ? 'english' : lang === 'he' ? 'hebrew' : lang}`)}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Availability Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl">{tAvailability('title')}</CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onEditStep(2)}
            disabled={isSubmitting}
          >
            <Edit2 className="h-4 w-4 mr-1" />
            {tCommon('edit')}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-sand-700">{tAvailability('defaultSessionDuration')}</p>
              <p className="text-sand-600 mt-1">
                {data.availability.defaultSessionDuration} {tAvailability('minutes')}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-sand-700">{tAvailability('bookingBuffer')}</p>
              <p className="text-sand-600 mt-1">
                {data.availability.bookingBuffer === 0
                  ? tAvailability('noBuffer')
                  : `${data.availability.bookingBuffer} ${tAvailability('minutes')}`}
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-sand-700 mb-2">{tAvailability('weeklySchedule')}</p>
            {availableDays.length === 0 ? (
              <p className="text-sm text-sand-500 italic">{t('noAvailabilitySet')}</p>
            ) : (
              <div className="space-y-2">
                {availableDays.map((day) => (
                  <div
                    key={day.day}
                    className="flex items-center justify-between p-3 bg-teal-50/30 border border-teal-200 rounded-lg"
                  >
                    <span className="font-medium text-sand-800">{formatDayName(day.day)}</span>
                    <div className="text-sm text-sand-600">
                      {day.timeSlots.length === 0 ? (
                        <span className="italic">{t('noTimeSlotsAdded')}</span>
                      ) : (
                        <div className="space-y-1">
                          {day.timeSlots.map((slot, index) => (
                            <div key={index}>
                              {slot.startTime} - {slot.endTime}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Terms and Conditions */}
      <Card className={cn('border-2', acceptedTerms ? 'border-teal-400' : 'border-sand-200')}>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Checkbox
              id="terms"
              checked={acceptedTerms}
              onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
              className="mt-1"
              disabled={isSubmitting}
            />
            <div className="flex-1">
              <Label htmlFor="terms" className="text-sm cursor-pointer">
                {t('termsAcceptance')}{' '}
                <a
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-600 hover:underline"
                >
                  {t('termsLink')}
                </a>{' '}
                {t('and')}{' '}
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-600 hover:underline"
                >
                  {t('privacyLink')}
                </a>
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit Error */}
      {submitError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      {/* Success Message (when terms accepted) */}
      {acceptedTerms && !submitError && (
        <Alert className="border-teal-400 bg-teal-50/30">
          <CheckCircle2 className="h-4 w-4 text-teal-600" />
          <AlertDescription className="text-teal-800">{t('readyToSubmit')}</AlertDescription>
        </Alert>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-6">
        <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>
          {tCommon('back')}
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!acceptedTerms || isSubmitting}
          loading={isSubmitting}
          className="min-w-[150px]"
        >
          {isSubmitting ? t('submitting') : t('submit')}
        </Button>
      </div>
    </div>
  );
}
