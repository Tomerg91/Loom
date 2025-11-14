'use client';

import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { UserRole } from '@/types';

interface OnboardingProgressProps {
  role: UserRole;
  currentStep: number;
  totalSteps: number;
  status: 'pending' | 'in_progress' | 'completed';
}

interface StepConfig {
  id: number;
  labelKey: string;
  descriptionKey: string;
}

export function OnboardingProgress({
  role,
  currentStep,
  totalSteps,
  status,
}: OnboardingProgressProps) {
  const t = useTranslations('onboarding.progress');
  const roleT = useTranslations(`onboarding.${role}`);

  const steps: StepConfig[] = useMemo(() => {
    if (role === 'coach') {
      return [
        { id: 1, labelKey: 'steps.coach.profile', descriptionKey: 'steps.coach.profileDesc' },
        { id: 2, labelKey: 'steps.coach.experience', descriptionKey: 'steps.coach.experienceDesc' },
        { id: 3, labelKey: 'steps.coach.pricing', descriptionKey: 'steps.coach.pricingDesc' },
        { id: 4, labelKey: 'steps.coach.availability', descriptionKey: 'steps.coach.availabilityDesc' },
        { id: 5, labelKey: 'steps.coach.review', descriptionKey: 'steps.coach.reviewDesc' },
      ];
    }

    if (role === 'client') {
      return [
        { id: 1, labelKey: 'steps.client.goals', descriptionKey: 'steps.client.goalsDesc' },
        { id: 2, labelKey: 'steps.client.preferences', descriptionKey: 'steps.client.preferencesDesc' },
        { id: 3, labelKey: 'steps.client.review', descriptionKey: 'steps.client.reviewDesc' },
      ];
    }

    return [];
  }, [role]);

  const progressPercentage = useMemo(() => {
    if (status === 'completed') return 100;
    if (totalSteps === 0) return 0;
    return Math.round((currentStep / totalSteps) * 100);
  }, [currentStep, totalSteps, status]);

  if (role !== 'coach' && role !== 'client') {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">{t('title')}</h3>
          <p className="text-xs text-muted-foreground">
            {t('subtitle', { current: currentStep, total: totalSteps })}
          </p>
        </div>
        <Badge variant={status === 'completed' ? 'success' : 'secondary'} className="text-xs">
          {progressPercentage}% {t('complete')}
        </Badge>
      </div>

      <Progress value={progressPercentage} className="h-2" />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((step) => {
          const isCompleted = currentStep > step.id || status === 'completed';
          const isCurrent = currentStep === step.id && status !== 'completed';

          return (
            <div
              key={step.id}
              className={`
                flex items-start gap-3 rounded-lg border p-3 transition-colors
                ${isCurrent ? 'border-teal-600 bg-teal-50/50 dark:bg-teal-950/20' : ''}
                ${isCompleted ? 'border-green-600/30 bg-green-50/50 dark:bg-green-950/20' : ''}
                ${!isCurrent && !isCompleted ? 'border-sand-200 bg-muted/20' : ''}
              `}
            >
              <div
                className={`
                  flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold
                  ${isCurrent ? 'bg-teal-600 text-white' : ''}
                  ${isCompleted ? 'bg-green-600 text-white' : ''}
                  ${!isCurrent && !isCompleted ? 'bg-muted text-muted-foreground' : ''}
                `}
                aria-hidden="true"
              >
                {isCompleted ? <Check className="h-4 w-4" /> : step.id}
              </div>
              <div className="flex-1 space-y-1">
                <p className={`text-sm font-medium ${isCurrent ? 'text-teal-700 dark:text-teal-300' : ''}`}>
                  {t(step.labelKey)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t(step.descriptionKey)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {status === 'completed' && (
        <div className="rounded-lg border border-green-600/30 bg-green-50/50 p-4 dark:bg-green-950/20">
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600" aria-hidden="true" />
            <p className="text-sm font-medium text-green-700 dark:text-green-300">
              {t('completedMessage')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
