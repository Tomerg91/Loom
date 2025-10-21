'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { TagInput } from '@/components/client/tag-input';
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

type UpdateUserFn = (updates: Partial<AuthUser>) => void;

interface ClientOnboardingResponse {
  preferences: {
    goals: string[];
    focusAreas: string[];
    supportPreferences: string[];
    preferredCommunication: 'video' | 'phone' | 'in_person' | 'hybrid';
    sessionFrequency: 'weekly' | 'biweekly' | 'monthly' | 'flexible';
    timezone?: string;
    notes?: string;
  };
  onboarding: {
    status: 'pending' | 'in_progress' | 'completed';
    step: number;
    completedAt: string | null;
  };
}

interface ClientOnboardingFormProps {
  user: AuthUser;
  onUserUpdate: UpdateUserFn;
}

interface ClientFormState {
  step: number;
  goals: string[];
  focusAreas: string[];
  supportPreferences: string[];
  preferredCommunication: 'video' | 'phone' | 'in_person' | 'hybrid';
  sessionFrequency: 'weekly' | 'biweekly' | 'monthly' | 'flexible';
  timezone: string;
  notes: string;
}

export function ClientOnboardingForm({ user, onUserUpdate }: ClientOnboardingFormProps) {
  const t = useTranslations('onboarding.client');
  const commonT = useTranslations('onboarding');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<ClientOnboardingResponse>({
    queryKey: ['client-onboarding'],
    queryFn: async () => {
      const response = await fetch('/api/onboarding/client', { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error || commonT('error.load'));
      }
      return body.data as ClientOnboardingResponse;
    },
  });

  const [formState, setFormState] = useState<ClientFormState>({
    step: 3,
    goals: [],
    focusAreas: [],
    supportPreferences: [],
    preferredCommunication: 'video',
    sessionFrequency: 'weekly',
    timezone: user.timezone ?? 'UTC',
    notes: '',
  });

  useEffect(() => {
    if (!data) return;

    setFormState({
      step: Math.max(data.onboarding.step ?? 3, 3),
      goals: data.preferences.goals ?? [],
      focusAreas: data.preferences.focusAreas ?? [],
      supportPreferences: data.preferences.supportPreferences ?? [],
      preferredCommunication: data.preferences.preferredCommunication ?? 'video',
      sessionFrequency: data.preferences.sessionFrequency ?? 'weekly',
      timezone: data.preferences.timezone ?? user.timezone ?? 'UTC',
      notes: data.preferences.notes ?? '',
    });
  }, [data, user.timezone]);

  const mutation = useMutation({
    mutationFn: async (payload: ClientFormState) => {
      const response = await fetch('/api/onboarding/client', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          supportPreferences: payload.supportPreferences,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error || commonT('error.save'));
      }
      return body;
    },
    onSuccess: (body) => {
      queryClient.invalidateQueries({ queryKey: ['client-onboarding'] });
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

  const communicationOptions = useMemo(() => (
    [
      { value: 'video', label: t('communicationOptions.video') },
      { value: 'phone', label: t('communicationOptions.phone') },
      { value: 'in_person', label: t('communicationOptions.in_person') },
      { value: 'hybrid', label: t('communicationOptions.hybrid') },
    ] as const
  ), [t]);

  const frequencyOptions = useMemo(() => (
    [
      { value: 'weekly', label: t('frequencyOptions.weekly') },
      { value: 'biweekly', label: t('frequencyOptions.biweekly') },
      { value: 'monthly', label: t('frequencyOptions.monthly') },
      { value: 'flexible', label: t('frequencyOptions.flexible') },
    ] as const
  ), [t]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    mutation.mutate({
      ...formState,
      step: Math.max(formState.step, 3),
      goals: formState.goals.map((goal) => goal.trim()).filter(Boolean),
      focusAreas: formState.focusAreas.map((area) => area.trim()).filter(Boolean),
      supportPreferences: formState.supportPreferences.map((pref) => pref.trim()).filter(Boolean),
      notes: formState.notes.trim(),
      timezone: formState.timezone.trim() || 'UTC',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">{t('fields.goals.label')}</label>
              <TagInput
                value={formState.goals}
                onChange={(goals) => setFormState((prev) => ({ ...prev, goals }))}
                placeholder={t('fields.goals.placeholder')}
              />
              <p className="mt-2 text-xs text-muted-foreground">{t('fields.goals.helper')}</p>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">{t('fields.focusAreas.label')}</label>
              <TagInput
                value={formState.focusAreas}
                onChange={(focusAreas) => setFormState((prev) => ({ ...prev, focusAreas }))}
                placeholder={t('fields.focusAreas.placeholder')}
              />
              <p className="mt-2 text-xs text-muted-foreground">{t('fields.focusAreas.helper')}</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">{t('fields.supportPreferences.label')}</label>
              <TagInput
                value={formState.supportPreferences}
                onChange={(supportPreferences) => setFormState((prev) => ({ ...prev, supportPreferences }))}
                placeholder={t('fields.supportPreferences.placeholder')}
              />
              <p className="mt-2 text-xs text-muted-foreground">{t('fields.supportPreferences.helper')}</p>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">{t('fields.preferredCommunication.label')}</label>
              <Select
                value={formState.preferredCommunication}
                onValueChange={(preferredCommunication: ClientFormState['preferredCommunication']) =>
                  setFormState((prev) => ({ ...prev, preferredCommunication }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('fields.preferredCommunication.placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  {communicationOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">{t('fields.sessionFrequency.label')}</label>
              <Select
                value={formState.sessionFrequency}
                onValueChange={(sessionFrequency: ClientFormState['sessionFrequency']) =>
                  setFormState((prev) => ({ ...prev, sessionFrequency }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('fields.sessionFrequency.placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  {frequencyOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Input
                label={t('fields.timezone.label')}
                value={formState.timezone}
                onChange={(event) => setFormState((prev) => ({ ...prev, timezone: event.target.value }))}
                placeholder={t('fields.timezone.placeholder')}
                required
              />
            </div>
          </div>

          <Textarea
            label={t('fields.notes.label')}
            value={formState.notes}
            onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
            placeholder={t('fields.notes.placeholder')}
            textareaSize="lg"
            maxLength={1200}
            showCount
            autoResize
          />

          <div className="flex flex-col gap-3 border-t border-dashed border-sand-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">{t('footer.helpText')}</p>
            <Button type="submit" loading={mutation.isPending} loadingText={commonT('actions.saving')}>
              {commonT('actions.save')}
            </Button>
          </div>
        </form>
      </CardContent>
      {isLoading && (
        <div className="pb-6 text-sm text-muted-foreground">
          {commonT('loading')}
        </div>
      )}
    </Card>
  );
}
