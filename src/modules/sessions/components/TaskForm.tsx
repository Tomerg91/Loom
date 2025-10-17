/**
 * @fileoverview Controlled form for creating or updating session tasks. The
 * component couples localized copy with the session-scoped task mutations so
 * dashboards can embed the same experience across modals or drawer flows.
 */
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  useSessionCreateTask,
  useSessionUpdateTask,
} from '@/modules/sessions/api/tasks';
import type {
  SessionTask,
  SessionTaskPriority,
  SessionUpdateTaskInput,
} from '@/modules/sessions/types';
import { sessionCreateTaskSchema } from '@/modules/sessions/validators/task';
import { recurrenceRuleSchema } from '@/modules/tasks/types/recurrence';

interface TaskFormProps {
  /** Existing task used to populate the form when editing. */
  task?: SessionTask | null;
  /** Optional override for the default task payload. */
  defaultValues?: Partial<TaskFormValues>;
  /** Callback invoked once a task has been created or updated. */
  onSuccess?: (task: SessionTask) => void;
  /** Callback fired when the user cancels the form. */
  onCancel?: () => void;
}

type TaskFormValues = z.input<typeof sessionCreateTaskSchema>;
type TaskFormResolvedValues = z.output<typeof sessionCreateTaskSchema>;

const priorityOptions: SessionTaskPriority[] = ['LOW', 'MEDIUM', 'HIGH'];

const parseRecurrenceRule = (
  value: unknown
): TaskFormValues['recurrenceRule'] => {
  if (value === null) {
    return null;
  }

  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const result = recurrenceRuleSchema.safeParse(value);

  if (!result.success) {
    return undefined;
  }

  return result.data as TaskFormValues['recurrenceRule'];
};

const buildDefaultValues = (
  task?: SessionTask | null,
  overrides: Partial<TaskFormValues> = {}
): TaskFormValues => {
  const recurrenceRule =
    overrides.recurrenceRule !== undefined
      ? parseRecurrenceRule(overrides.recurrenceRule)
      : parseRecurrenceRule(task?.recurrenceRule);

  if (task) {
    return {
      title: overrides.title ?? task.title,
      description: overrides.description ?? task.description ?? undefined,
      clientId: overrides.clientId ?? task.clientId,
      coachId: overrides.coachId ?? task.coachId,
      categoryId: overrides.categoryId ?? task.category?.id ?? undefined,
      priority: overrides.priority ?? task.priority,
      visibilityToCoach: overrides.visibilityToCoach ?? task.visibilityToCoach,
      dueDate: overrides.dueDate ?? task.dueDate ?? undefined,
      recurrenceRule,
    };
  }

  return {
    title: overrides.title ?? '',
    description: overrides.description,
    clientId: overrides.clientId ?? '',
    coachId: overrides.coachId,
    categoryId: overrides.categoryId,
    priority: overrides.priority ?? 'MEDIUM',
    visibilityToCoach: overrides.visibilityToCoach ?? true,
    dueDate: overrides.dueDate,
    recurrenceRule,
  };
};

export function TaskForm({
  task,
  defaultValues,
  onSuccess,
  onCancel,
}: TaskFormProps) {
  const t = useTranslations('sessions.tasks.form');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isEditing = Boolean(task?.id);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(sessionCreateTaskSchema, undefined, { raw: true }),
    defaultValues: useMemo<TaskFormValues>(
      () => buildDefaultValues(task, defaultValues),
      [task, defaultValues]
    ),
  });

  const createTaskMutation = useSessionCreateTask();
  const updateTaskMutation = useSessionUpdateTask();

  const onSubmit = async (values: TaskFormValues) => {
    setSubmitError(null);

    const parsedValues: TaskFormResolvedValues =
      sessionCreateTaskSchema.parse(values);

    try {
      if (isEditing && task) {
        const payload: SessionUpdateTaskInput = {
          title: parsedValues.title,
          description: parsedValues.description,
          categoryId: parsedValues.categoryId,
          priority: parsedValues.priority,
          visibilityToCoach: parsedValues.visibilityToCoach,
          dueDate: parsedValues.dueDate,
          recurrenceRule: parsedValues.recurrenceRule,
        };

        const result = await updateTaskMutation.mutateAsync({
          taskId: task.id,
          input: payload,
        });
        onSuccess?.(result);
      } else {
        const result = await createTaskMutation.mutateAsync(parsedValues);
        onSuccess?.(result);
        form.reset(buildDefaultValues(null, defaultValues));
      }
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : t('messages.genericError')
      );
    }
  };

  const isSubmitting =
    createTaskMutation.isPending || updateTaskMutation.isPending;

  return (
    <Form {...form}>
      <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-4">
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
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fields.description.label')}</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder={t('fields.description.placeholder')}
                    rows={4}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="clientId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fields.clientId.label')}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder={t('fields.clientId.placeholder')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="coachId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fields.coachId.label')}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder={t('fields.coachId.placeholder')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fields.dueDate.label')}</FormLabel>
                <FormControl>
                  <Input {...field} type="date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fields.priority.label')}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t('fields.priority.placeholder')}
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {priorityOptions.map(option => (
                      <SelectItem key={option} value={option}>
                        {t(
                          `fields.priority.options.${option.toLowerCase() as 'low' | 'medium' | 'high'}`
                        )}
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
            name="visibilityToCoach"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                <div>
                  <FormLabel className="text-base">
                    {t('fields.visibilityToCoach.label')}
                  </FormLabel>
                  <p className="text-sm text-neutral-600">
                    {t('fields.visibilityToCoach.help')}
                  </p>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value ?? true}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {submitError ? (
          <Alert variant="destructive">
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex items-center justify-end gap-3">
          {onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel}>
              {t('actions.cancel')}
            </Button>
          ) : null}
          <Button type="submit" disabled={isSubmitting}>
            {isEditing ? t('actions.saveChanges') : t('actions.createTask')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
