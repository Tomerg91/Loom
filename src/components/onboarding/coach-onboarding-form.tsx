'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { TagInput } from '@/components/client/tag-input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { AuthUser } from '@/lib/auth/auth';

interface CoachOnboardingResponse {
  profile: {
    title: string;
    bio: string;
    experienceYears: number;
    specialties: string[];
    credentials: string[];
    languages: string[];
    timezone: string;
    hourlyRate: number;
    currency: string;
    approach: string;
    location: string;
  };
  availability: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }[];
  onboarding: {
    status: 'pending' | 'in_progress' | 'completed';
    step: number;
    completedAt: string | null;
  };
}

type UpdateUserFn = (updates: Partial<AuthUser>) => void;

interface CoachOnboardingFormProps {
  user: AuthUser;
  onUserUpdate: UpdateUserFn;
}

interface AvailabilitySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface CoachFormState {
  step: number;
  title: string;
  bio: string;
  experienceYears: number;
  specialties: string[];
  credentials: string[];
  languages: string[];
  timezone: string;
  hourlyRate: number;
  currency: string;
  approach: string;
  location: string;
  availability: AvailabilitySlot[];
}

const DEFAULT_AVAILABILITY: AvailabilitySlot = {
  dayOfWeek: 1,
  startTime: '09:00',
  endTime: '17:00',
};

export function CoachOnboardingForm({ user, onUserUpdate }: CoachOnboardingFormProps) {
  const t = useTranslations('onboarding.coach');
  const commonT = useTranslations('onboarding');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<CoachOnboardingResponse>({
    queryKey: ['coach-onboarding'],
    queryFn: async () => {
      const response = await fetch('/api/onboarding/coach', {
        cache: 'no-store',
        credentials: 'include',
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error || commonT('error.load'));
      }
      return body.data as CoachOnboardingResponse;
    },
  });

  const [formState, setFormState] = useState<CoachFormState>({
    step: 5,
    title: '',
    bio: '',
    experienceYears: 0,
    specialties: [],
    credentials: [],
    languages: user.language ? [user.language] : [],
    timezone: user.timezone ?? 'UTC',
    hourlyRate: 100,
    currency: 'USD',
    approach: '',
    location: '',
    availability: [{ ...DEFAULT_AVAILABILITY }],
  });

  useEffect(() => {
    if (!data) return;

    setFormState({
      step: Math.max(data.onboarding.step ?? 5, 5),
      title: data.profile.title ?? '',
      bio: data.profile.bio ?? '',
      experienceYears: Number(data.profile.experienceYears ?? 0),
      specialties: data.profile.specialties ?? [],
      credentials: data.profile.credentials ?? [],
      languages: data.profile.languages ?? (user.language ? [user.language] : []),
      timezone: data.profile.timezone ?? user.timezone ?? 'UTC',
      hourlyRate: Number(data.profile.hourlyRate ?? 100),
      currency: data.profile.currency ?? 'USD',
      approach: data.profile.approach ?? '',
      location: data.profile.location ?? '',
      availability: data.availability.length > 0
        ? data.availability.map((slot) => ({ ...slot }))
        : [{ ...DEFAULT_AVAILABILITY }],
    });
  }, [data, user.language, user.timezone]);

  const mutation = useMutation({
    mutationFn: async (payload: CoachFormState) => {
      if (payload.availability.length === 0) {
        throw new Error(t('availability.required'));
      }

      const response = await fetch('/api/onboarding/coach', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...payload,
          currency: payload.currency.toUpperCase(),
          availability: payload.availability.map((slot) => ({
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
          })),
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error || commonT('error.save'));
      }
      return body;
    },
    onSuccess: (body) => {
      queryClient.invalidateQueries({ queryKey: ['coach-onboarding'] });
      const updatedUser = body?.data?.user as Partial<AuthUser> | undefined;
      if (updatedUser) {
        onUserUpdate(updatedUser);
      }
      toast.success(commonT('success'));
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : commonT('error.save');
      toast.error(message);
    },
  });

  const dayOptions = useMemo(() => (
    [
      { value: 0, label: t('availability.days.sunday') },
      { value: 1, label: t('availability.days.monday') },
      { value: 2, label: t('availability.days.tuesday') },
      { value: 3, label: t('availability.days.wednesday') },
      { value: 4, label: t('availability.days.thursday') },
      { value: 5, label: t('availability.days.friday') },
      { value: 6, label: t('availability.days.saturday') },
    ] as const
  ), [t]);

  const updateAvailability = (index: number, field: keyof AvailabilitySlot, value: string | number) => {
    setFormState((prev) => {
      const nextSlots = [...prev.availability];
      nextSlots[index] = {
        ...nextSlots[index],
        [field]: value,
      } as AvailabilitySlot;
      return { ...prev, availability: nextSlots };
    });
  };

  const addAvailabilitySlot = () => {
    setFormState((prev) => ({
      ...prev,
      availability: [...prev.availability, { ...DEFAULT_AVAILABILITY }],
    }));
  };

  const removeAvailabilitySlot = (index: number) => {
    setFormState((prev) => ({
      ...prev,
      availability: prev.availability.filter((_, slotIndex) => slotIndex !== index),
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    mutation.mutate({
      ...formState,
      step: Math.max(formState.step, 5),
      title: formState.title.trim(),
      bio: formState.bio.trim(),
      approach: formState.approach.trim(),
      location: formState.location.trim(),
      currency: formState.currency.trim() || 'USD',
      languages: formState.languages.map((language) => language.trim()).filter(Boolean),
      specialties: formState.specialties.map((item) => item.trim()).filter(Boolean),
      credentials: formState.credentials.map((item) => item.trim()).filter(Boolean),
      availability: formState.availability.map((slot) => ({
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
      })),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid gap-6 md:grid-cols-2">
            <Input
              label={t('fields.title.label')}
              placeholder={t('fields.title.placeholder')}
              value={formState.title}
              onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))}
              required
            />
            <Input
              label={t('fields.location.label')}
              placeholder={t('fields.location.placeholder')}
              value={formState.location}
              onChange={(event) => setFormState((prev) => ({ ...prev, location: event.target.value }))}
              required
            />
          </div>

          <Textarea
            label={t('fields.bio.label')}
            placeholder={t('fields.bio.placeholder')}
            value={formState.bio}
            onChange={(event) => setFormState((prev) => ({ ...prev, bio: event.target.value }))}
            textareaSize="lg"
            maxLength={1200}
            autoResize
            showCount
            required
          />

          <div className="grid gap-6 md:grid-cols-2">
            <Input
              label={t('fields.experienceYears.label')}
              type="number"
              min={0}
              max={60}
              value={formState.experienceYears}
              onChange={(event) => setFormState((prev) => ({ ...prev, experienceYears: Number(event.target.value || 0) }))}
              required
            />
            <Input
              label={t('fields.timezone.label')}
              value={formState.timezone}
              onChange={(event) => setFormState((prev) => ({ ...prev, timezone: event.target.value }))}
              placeholder={t('fields.timezone.placeholder')}
              required
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Input
              label={t('fields.hourlyRate.label')}
              type="number"
              min={0}
              max={2000}
              step="10"
              value={formState.hourlyRate}
              onChange={(event) => setFormState((prev) => ({ ...prev, hourlyRate: Number(event.target.value || 0) }))}
              required
            />
            <Input
              label={t('fields.currency.label')}
              value={formState.currency}
              onChange={(event) => setFormState((prev) => ({ ...prev, currency: event.target.value.toUpperCase() }))}
              maxLength={3}
              required
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">{t('fields.specialties.label')}</label>
              <TagInput
                value={formState.specialties}
                onChange={(specialties) => setFormState((prev) => ({ ...prev, specialties }))}
                placeholder={t('fields.specialties.placeholder')}
              />
              <p className="mt-2 text-xs text-muted-foreground">{t('fields.specialties.helper')}</p>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">{t('fields.credentials.label')}</label>
              <TagInput
                value={formState.credentials}
                onChange={(credentials) => setFormState((prev) => ({ ...prev, credentials }))}
                placeholder={t('fields.credentials.placeholder')}
              />
              <p className="mt-2 text-xs text-muted-foreground">{t('fields.credentials.helper')}</p>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">{t('fields.languages.label')}</label>
            <TagInput
              value={formState.languages}
              onChange={(languages) => setFormState((prev) => ({ ...prev, languages }))}
              placeholder={t('fields.languages.placeholder')}
            />
            <p className="mt-2 text-xs text-muted-foreground">{t('fields.languages.helper')}</p>
          </div>

          <Textarea
            label={t('fields.approach.label')}
            placeholder={t('fields.approach.placeholder')}
            value={formState.approach}
            onChange={(event) => setFormState((prev) => ({ ...prev, approach: event.target.value }))}
            textareaSize="lg"
            maxLength={1200}
            autoResize
            showCount
            required
          />

          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{t('availability.title')}</h3>
                <p className="text-sm text-muted-foreground">{t('availability.description')}</p>
              </div>
              <Button type="button" variant="secondary" onClick={addAvailabilitySlot}>
                {t('availability.addSlot')}
              </Button>
            </div>

            <div className="space-y-4">
              {formState.availability.map((slot, index) => (
                <div key={`${slot.dayOfWeek}-${index}`} className="rounded-xl border border-sand-200 bg-muted/20 p-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-1 flex-col gap-4 md:flex-row">
                      <div className="md:w-44">
                        <label className="mb-2 block text-sm font-medium text-foreground">{t('availability.day')}</label>
                        <Select
                          value={String(slot.dayOfWeek)}
                          onValueChange={(value) => updateAvailability(index, 'dayOfWeek', Number(value))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('availability.dayPlaceholder')} />
                          </SelectTrigger>
                          <SelectContent>
                            {dayOptions.map((option) => (
                              <SelectItem key={option.value} value={String(option.value)}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="md:w-36">
                        <Input
                          label={t('availability.startTime')}
                          type="time"
                          value={slot.startTime}
                          onChange={(event) => updateAvailability(index, 'startTime', event.target.value)}
                          required
                        />
                      </div>
                      <div className="md:w-36">
                        <Input
                          label={t('availability.endTime')}
                          type="time"
                          value={slot.endTime}
                          onChange={(event) => updateAvailability(index, 'endTime', event.target.value)}
                          required
                        />
                      </div>
                    </div>
                    {formState.availability.length > 1 && (
                      <Button type="button" variant="ghost" onClick={() => removeAvailabilitySlot(index)}>
                        {t('availability.removeSlot')}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {formState.availability.length === 0 && (
              <Badge variant="destructive" className="inline-flex items-center gap-2">
                {t('availability.required')}
              </Badge>
            )}
          </section>

          <div className="flex flex-col gap-3 border-t border-dashed border-sand-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">{t('footer.helpText')}</p>
            <Button type="submit" loading={mutation.isPending} loadingText={commonT('actions.saving')}>
              {commonT('actions.save')}
            </Button>
          </div>
        </form>
      </CardContent>
      {isLoading && (
        <div className="pb-6 text-sm text-muted-foreground">{commonT('loading')}</div>
      )}
    </Card>
  );
}
