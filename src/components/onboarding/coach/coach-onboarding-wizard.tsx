'use client';

import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState, useCallback } from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type {
  CoachOnboardingData,
  PartialOnboardingData,
  ProfileStepData,
  PricingStepData,
  AvailabilityStepData,
  OnboardingSubmitResponse,
} from '@/lib/types/onboarding';
import { cn } from '@/lib/utils';

import { AvailabilityStep } from './steps/availability-step';
import { PricingStep } from './steps/pricing-step';
import { ProfileStep } from './steps/profile-step';
import { ReviewStep } from './steps/review-step';




interface CoachOnboardingWizardProps {
  userId: string;
  redirectTo?: string;
  userEmail?: string;
  userName?: string;
}

type WizardStep = 0 | 1 | 2 | 3;

const TOTAL_STEPS = 4;

export function CoachOnboardingWizard({
  userId,
  redirectTo = '/dashboard',
  userEmail,
  userName,
}: CoachOnboardingWizardProps) {
  const t = useTranslations('onboarding.coach');
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState<WizardStep>(0);
  const [formData, setFormData] = useState<PartialOnboardingData>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const greetingName = userName?.trim() || userEmail?.trim() || '';

  // Calculate progress percentage
  const progressPercentage = ((currentStep + 1) / TOTAL_STEPS) * 100;

  // Step titles
  const stepTitles = [
    t('profile.title'),
    t('pricing.title'),
    t('availability.title'),
    t('review.title'),
  ];

  // Step descriptions
  const stepDescriptions = [
    t('profile.description'),
    t('pricing.description'),
    t('availability.description'),
    t('review.description'),
  ];

  // Navigation handlers
  const handleNext = useCallback(
    (step: WizardStep, data: Partial<CoachOnboardingData>) => {
      setFormData(prev => ({ ...prev, ...data }));
      if (step < 3) {
        setCurrentStep((step + 1) as WizardStep);
      }
    },
    []
  );

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((currentStep - 1) as WizardStep);
    }
  }, [currentStep]);

  const handleEditStep = useCallback((step: number) => {
    setCurrentStep(step as WizardStep);
  }, []);

  // Submit handler
  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Prepare complete data
      const completeData: CoachOnboardingData = {
        profile: formData.profile as ProfileStepData,
        pricing: formData.pricing as PricingStepData,
        availability: formData.availability as AvailabilityStepData,
        review: { acceptedTerms: true },
      };

      // Upload profile picture if exists
      let profilePictureUrl = completeData.profile.profilePictureUrl;
      if (completeData.profile.profilePicture) {
        const uploadFormData = new FormData();
        uploadFormData.append('file', completeData.profile.profilePicture);
        uploadFormData.append('userId', userId);

        const uploadResponse = await fetch('/api/upload/avatar', {
          method: 'POST',
          body: uploadFormData,
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload profile picture');
        }

        const uploadResult = await uploadResponse.json();
        profilePictureUrl = uploadResult.url;
      }

      // Submit onboarding data
      const response = await fetch('/api/coach/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          onboardingData: {
            ...completeData,
            profile: {
              ...completeData.profile,
              profilePictureUrl,
              profilePicture: undefined, // Remove file object
            },
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit onboarding');
      }

      const result: OnboardingSubmitResponse = await response.json();

      if (result.success) {
        setIsComplete(true);

        // Redirect after a short delay to show success message
        setTimeout(() => {
          router.push(redirectTo);
        }, 2000);
      } else {
        throw new Error(result.message || 'Failed to complete onboarding');
      }
    } catch (error) {
      console.error('Onboarding submission error:', error);
      setSubmitError(
        error instanceof Error ? error.message : 'An unexpected error occurred'
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, userId, router, redirectTo]);

  // Success state
  if (isComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-teal-50 to-sand-50">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="rounded-full bg-teal-100 p-3">
                  <CheckCircle2 className="h-12 w-12 text-teal-600" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-sand-900">
                  {t('success.title')}
                </h2>
                <p className="text-sand-600 mt-2">{t('success.message')}</p>
              </div>
              <div className="pt-2">
                <Progress value={100} className="h-2" />
                <p className="text-sm text-sand-500 mt-2">
                  {t('success.redirecting')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-sand-50 to-orange-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-sand-900 mb-2">
            {t('wizard.title')}
          </h1>
          <p className="text-sand-600">{t('wizard.subtitle')}</p>
          {greetingName && (
            <p className="text-sm text-sand-500 mt-2">
              {t('wizard.greeting', { name: greetingName })}
            </p>
          )}
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium text-sand-700">
              {t('wizard.step')} {currentStep + 1} {t('wizard.of')}{' '}
              {TOTAL_STEPS}
            </span>
            <span className="text-sm font-medium text-teal-600">
              {Math.round(progressPercentage)}%
            </span>
          </div>
          <Progress value={progressPercentage} className="h-3" />

          {/* Step indicators */}
          <div className="flex justify-between mt-4">
            {stepTitles.map((title, index) => (
              <div
                key={index}
                className={cn(
                  'flex flex-col items-center flex-1',
                  index < stepTitles.length - 1 && 'border-r border-sand-200'
                )}
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium mb-2',
                    index < currentStep
                      ? 'bg-teal-400 text-white'
                      : index === currentStep
                        ? 'bg-teal-600 text-white'
                        : 'bg-sand-200 text-sand-500'
                  )}
                >
                  {index < currentStep ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={cn(
                    'text-xs text-center hidden sm:block',
                    index === currentStep
                      ? 'text-sand-900 font-semibold'
                      : 'text-sand-600'
                  )}
                >
                  {title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Main Card */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl">
              {stepTitles[currentStep]}
            </CardTitle>
            <CardDescription className="text-base">
              {stepDescriptions[currentStep]}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Step 0: Profile */}
            {currentStep === 0 && (
              <ProfileStep
                data={formData.profile || {}}
                onNext={data => handleNext(0, { profile: data })}
              />
            )}

            {/* Step 1: Pricing */}
            {currentStep === 1 && (
              <PricingStep
                data={formData.pricing || {}}
                onNext={data => handleNext(1, { pricing: data })}
                onBack={handleBack}
              />
            )}

            {/* Step 2: Availability */}
            {currentStep === 2 && (
              <AvailabilityStep
                data={formData.availability || {}}
                onNext={data => handleNext(2, { availability: data })}
                onBack={handleBack}
              />
            )}

            {/* Step 3: Review */}
            {currentStep === 3 && (
              <ReviewStep
                data={formData as CoachOnboardingData}
                onSubmit={handleSubmit}
                onBack={handleBack}
                onEditStep={handleEditStep}
                isSubmitting={isSubmitting}
                submitError={submitError}
              />
            )}
          </CardContent>
        </Card>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-sand-600">
            {t('wizard.helpText')}{' '}
            <Link href="/support" className="text-teal-600 hover:underline">
              {t('wizard.contactSupport')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
