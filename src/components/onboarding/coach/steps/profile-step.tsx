'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AvatarUpload } from '@/components/ui/file-upload';
import type { ProfileStepData, Specialization } from '@/lib/types/onboarding';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const profileSchema = z.object({
  bio: z.string().min(50, 'Bio must be at least 50 characters').max(500, 'Bio must not exceed 500 characters'),
  yearsOfExperience: z.number().min(0, 'Years of experience cannot be negative').max(50, 'Years of experience seems too high'),
  specializations: z.array(z.string()).min(1, 'Please select at least one specialization'),
  profilePicture: z.instanceof(File).nullable().optional(),
  profilePictureUrl: z.string().nullable().optional(),
});

interface ProfileStepProps {
  data: Partial<ProfileStepData>;
  onNext: (data: ProfileStepData) => void;
  onBack?: () => void;
}

const SPECIALIZATION_OPTIONS: { value: Specialization; labelKey: string }[] = [
  { value: 'life_coaching', labelKey: 'lifeCoaching' },
  { value: 'career_coaching', labelKey: 'careerCoaching' },
  { value: 'health_wellness', labelKey: 'healthWellness' },
  { value: 'business_coaching', labelKey: 'businessCoaching' },
  { value: 'relationship_coaching', labelKey: 'relationshipCoaching' },
  { value: 'executive_coaching', labelKey: 'executiveCoaching' },
  { value: 'spiritual_coaching', labelKey: 'spiritualCoaching' },
  { value: 'performance_coaching', labelKey: 'performanceCoaching' },
  { value: 'mindfulness_coaching', labelKey: 'mindfulnessCoaching' },
  { value: 'other', labelKey: 'other' },
];

export function ProfileStep({ data, onNext, onBack }: ProfileStepProps) {
  const t = useTranslations('onboarding.coach.profile');
  const tCommon = useTranslations('common');

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProfileStepData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      bio: data.bio || '',
      yearsOfExperience: data.yearsOfExperience || 0,
      specializations: data.specializations || [],
      profilePicture: data.profilePicture || null,
      profilePictureUrl: data.profilePictureUrl || null,
    },
  });

  const watchedSpecializations = watch('specializations');
  const watchedBio = watch('bio');
  const profilePictureUrl = watch('profilePictureUrl');

  const toggleSpecialization = (spec: Specialization) => {
    const current = watchedSpecializations as string[];
    if (current.includes(spec)) {
      setValue(
        'specializations',
        current.filter((s) => s !== spec)
      );
    } else {
      setValue('specializations', [...current, spec]);
    }
  };

  const onSubmit = (formData: ProfileStepData) => {
    onNext(formData);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Profile Picture */}
      <div className="space-y-2">
        <Label>{t('profilePicture')}</Label>
        <p className="text-sm text-sand-500">{t('profilePictureHelper')}</p>
        <Controller
          control={control}
          name="profilePicture"
          render={({ field }) => (
            <AvatarUpload
              onFileSelect={(file) => {
                field.onChange(file);
                setValue('profilePictureUrl', URL.createObjectURL(file));
              }}
              onFileRemove={() => {
                field.onChange(null);
                setValue('profilePictureUrl', null);
              }}
              currentFile={profilePictureUrl}
            />
          )}
        />
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <Label htmlFor="bio">
          {t('bio')} <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="bio"
          {...register('bio')}
          placeholder={t('bioPlaceholder')}
          error={errors.bio?.message}
          maxLength={500}
          showCount
          textareaSize="lg"
          className="min-h-[120px]"
          aria-describedby="bio-helper"
        />
        <p id="bio-helper" className="text-sm text-sand-500">
          {t('bioHelper')} ({watchedBio?.length || 0}/500)
        </p>
      </div>

      {/* Years of Experience */}
      <div className="space-y-2">
        <Label htmlFor="yearsOfExperience">
          {t('yearsOfExperience')} <span className="text-destructive">*</span>
        </Label>
        <Input
          id="yearsOfExperience"
          type="number"
          min="0"
          max="50"
          {...register('yearsOfExperience', { valueAsNumber: true })}
          placeholder="5"
          error={errors.yearsOfExperience?.message}
          aria-describedby="experience-helper"
        />
        <p id="experience-helper" className="text-sm text-sand-500">
          {t('yearsOfExperienceHelper')}
        </p>
      </div>

      {/* Specializations */}
      <div className="space-y-3">
        <Label>
          {t('specializations')} <span className="text-destructive">*</span>
        </Label>
        <p className="text-sm text-sand-500">{t('specializationsHelper')}</p>

        <div className="flex flex-wrap gap-2">
          {SPECIALIZATION_OPTIONS.map((option) => {
            const isSelected = (watchedSpecializations as string[]).includes(option.value);
            return (
              <Badge
                key={option.value}
                variant={isSelected ? 'default' : 'outline'}
                className={cn(
                  'cursor-pointer transition-all hover:scale-105',
                  isSelected
                    ? 'bg-teal-400 hover:bg-teal-500 text-white'
                    : 'hover:border-teal-400 hover:text-teal-600'
                )}
                onClick={() => toggleSpecialization(option.value)}
                role="checkbox"
                aria-checked={isSelected}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleSpecialization(option.value);
                  }
                }}
              >
                {t(`specializationOptions.${option.labelKey}`)}
                {isSelected && <X className="ml-1 h-3 w-3" />}
              </Badge>
            );
          })}
        </div>

        {errors.specializations && (
          <p className="text-sm text-destructive" role="alert">
            {errors.specializations.message}
          </p>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-6">
        {onBack && (
          <Button type="button" variant="outline" onClick={onBack}>
            {tCommon('back')}
          </Button>
        )}
        <Button type="submit" className="ml-auto">
          {tCommon('next')}
        </Button>
      </div>
    </form>
  );
}
