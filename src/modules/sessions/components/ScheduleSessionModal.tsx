/**
 * @fileoverview Modal for requesting or scheduling a coaching session. The
 * component reuses the shared session scheduling schemas so validation remains
 * consistent between the client and API layers. It exposes a minimal interface
 * allowing dashboards to pass available clients and react to completed
 * submissions.
 */

'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarIcon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { useCreateSessionRequest } from '@/modules/sessions/api/sessions';
import type {
  SessionMutationResult,
  SessionSchedulingRequest,
} from '@/modules/sessions/types';
import {
  sessionRequestSchema,
  type SessionRequestInput,
} from '@/modules/sessions/validators/session';

interface ClientOption {
  value: string;
  label: string;
}

export interface ScheduleSessionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actorRole: 'coach' | 'client';
  coachId?: string;
  clientOptions?: ClientOption[];
  defaultValues?: Partial<SessionSchedulingRequest>;
  onCompleted?: (result: SessionMutationResult) => void;
}

type ScheduleSessionFormValues = SessionRequestInput;

type FormSubmitHandler = (values: ScheduleSessionFormValues) => Promise<void>;

const DEFAULT_DURATION_MINUTES = 60;
const DEFAULT_TIME = '09:00';

const durationOptions = [30, 45, 60, 75, 90];

const buildInitialIso = (value?: string | null): string => {
  if (value) {
    return value;
  }

  const date = new Date();
  date.setHours(9, 0, 0, 0);
  return date.toISOString();
};

const formatDisplayDate = (value: string | null, locale: string): string => {
  if (!value) {
    return '';
  }

  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
    }).format(new Date(value));
  } catch (_error) {
    return value;
  }
};

const extractTimeValue = (value: string | null): string => {
  if (!value) {
    return DEFAULT_TIME;
  }

  try {
    const date = new Date(value);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch (_error) {
    return DEFAULT_TIME;
  }
};

export function ScheduleSessionModal({
  open,
  onOpenChange,
  actorRole,
  coachId,
  clientOptions,
  defaultValues,
  onCompleted,
}: ScheduleSessionModalProps) {
  const t = useTranslations('sessions.schedule.modal');
  const locale = useLocale();
  const { toast } = useToast();
  const [timeValue, setTimeValue] = useState<string>(() =>
    extractTimeValue(defaultValues?.scheduledAt ?? null)
  );

  const initialValues = useMemo(
    () => ({
      title: defaultValues?.title ?? '',
      clientId: defaultValues?.clientId ?? '',
      coachId: defaultValues?.coachId ?? coachId,
      scheduledAt: buildInitialIso(defaultValues?.scheduledAt ?? null),
      durationMinutes:
        defaultValues?.durationMinutes ?? DEFAULT_DURATION_MINUTES,
      meetingUrl: defaultValues?.meetingUrl ?? undefined,
      timezone:
        defaultValues?.timezone ??
        Intl.DateTimeFormat().resolvedOptions().timeZone,
      notes: defaultValues?.notes ?? undefined,
    }),
    [defaultValues, coachId]
  );

  const form = useForm<ScheduleSessionFormValues>({
    resolver: zodResolver(sessionRequestSchema, undefined, { raw: true }),
    defaultValues: initialValues,
  });

  useEffect(() => {
    form.reset(initialValues);
  }, [form, initialValues]);

  const mutation = useCreateSessionRequest({
    onSuccess(result) {
      toast({
        title: t('messages.successTitle'),
        description: t('messages.successDescription'),
      });
      onCompleted?.(result);
      onOpenChange(false);
    },
    onError(error) {
      toast({
        title: t('messages.errorTitle'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const scheduledAt = form.watch('scheduledAt');

  useEffect(() => {
    setTimeValue(extractTimeValue(scheduledAt));
  }, [scheduledAt]);

  const handleTimeChange = (value: string) => {
    setTimeValue(value);

    const date = scheduledAt ? new Date(scheduledAt) : new Date();
    const [hours, minutes] = value
      .split(':')
      .map(part => Number.parseInt(part, 10));

    if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
      date.setHours(hours, minutes, 0, 0);
      form.setValue('scheduledAt', date.toISOString(), {
        shouldValidate: true,
      });
    }
  };

  const onSubmit: FormSubmitHandler = async values => {
    const payload: SessionSchedulingRequest = {
      ...values,
      coachId: values.coachId ?? coachId,
    };

    if (!payload.coachId) {
      toast({
        title: t('messages.errorTitle'),
        description: t('messages.missingCoach'),
        variant: 'destructive',
      });
      return;
    }

    await mutation.mutateAsync(payload);
  };

  const disableSubmit = mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-label={t('title')} className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6"
            noValidate
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('fields.title.label')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t('fields.title.placeholder')}
                      disabled={disableSubmit}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {actorRole === 'coach' ? (
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('fields.client.label')}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={disableSubmit}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t('fields.client.placeholder')}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(clientOptions ?? []).map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                control={form.control}
                name="scheduledAt"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t('fields.date.label')}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            'justify-start font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                          disabled={disableSubmit}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formatDisplayDate(field.value, locale) ||
                            t('fields.date.placeholder')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={
                            field.value ? new Date(field.value) : undefined
                          }
                          onSelect={date => {
                            if (!date) {
                              return;
                            }
                            const next = field.value
                              ? new Date(field.value)
                              : new Date();
                            next.setFullYear(
                              date.getFullYear(),
                              date.getMonth(),
                              date.getDate()
                            );
                            field.onChange(next.toISOString());
                          }}
                          disabled={date => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return date < today;
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="scheduledAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('fields.time.label')}</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        value={timeValue}
                        onChange={event => handleTimeChange(event.target.value)}
                        onBlur={field.onBlur}
                        disabled={disableSubmit}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="durationMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('fields.duration.label')}</FormLabel>
                  <Select
                    onValueChange={value =>
                      field.onChange(Number.parseInt(value, 10))
                    }
                    value={String(field.value)}
                    disabled={disableSubmit}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t('fields.duration.placeholder')}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {durationOptions.map(option => (
                        <SelectItem key={option} value={String(option)}>
                          {t('fields.duration.option', { minutes: option })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('fields.timezone.label')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t('fields.timezone.placeholder')}
                      disabled={disableSubmit}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="meetingUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('fields.meetingUrl.label')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t('fields.meetingUrl.placeholder')}
                      disabled={disableSubmit}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('fields.notes.label')}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={t('fields.notes.placeholder')}
                      disabled={disableSubmit}
                      rows={4}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={disableSubmit}
              >
                {t('actions.cancel')}
              </Button>
              <Button type="submit" disabled={disableSubmit}>
                {actorRole === 'client'
                  ? t('actions.submitRequest')
                  : t('actions.scheduleSession')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
