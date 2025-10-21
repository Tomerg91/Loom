'use client';

import { format } from 'date-fns';
import { Loader2, Plus, CalendarIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useClients } from '@/lib/queries/users';

import { useCreateTask } from '../hooks';
import { TASK_PRIORITY_LABELS } from './task-priority-indicator';
import {
  taskPriorityValues,
  type CreateTaskInput,
  type TaskDto,
  type TaskPriority,
} from '../types/task';

interface TaskCreateDialogProps {
  onCreated?: (task: TaskDto) => void;
}

interface TaskFormState {
  title: string;
  description: string;
  clientId: string;
  priority: TaskPriority;
  dueDate: string;
  visibilityToCoach: boolean;
}

const INITIAL_FORM_STATE: TaskFormState = {
  title: '',
  description: '',
  clientId: '',
  priority: 'MEDIUM',
  dueDate: '',
  visibilityToCoach: true,
};

export function TaskCreateDialog({ onCreated }: TaskCreateDialogProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<TaskFormState>(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState<{ title?: string; clientId?: string }>(
    {}
  );

  const createTask = useCreateTask();

  const { data: clientsResult, isLoading: isClientsLoading } = useClients();
  const clients = clientsResult?.success ? clientsResult.data : [];
  const clientsError =
    clientsResult && !clientsResult.success ? clientsResult.error : null;
  const isClientSelectDisabled =
    isClientsLoading ||
    createTask.isPending ||
    !clientsResult?.success ||
    clients.length === 0;
  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  useEffect(() => {
    if (!open) {
      setForm(INITIAL_FORM_STATE);
      setErrors({});
    }
  }, [open]);

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handlePriorityChange = (priority: TaskPriority) => {
    setForm(prev => ({ ...prev, priority }));
  };

  const handleVisibilityToggle = (checked: boolean) => {
    setForm(prev => ({ ...prev, visibilityToCoach: checked }));
  };

  const handleClientChange = (value: string) => {
    setForm(prev => ({ ...prev, clientId: value }));
  };

  const validate = () => {
    const nextErrors: { title?: string; clientId?: string } = {};
    if (!form.title.trim()) {
      nextErrors.title = 'Title is required';
    }
    if (!form.clientId) {
      nextErrors.clientId = 'Select a client to assign this task';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const buildPayload = (): CreateTaskInput => {
    const payload: CreateTaskInput = {
      title: form.title.trim(),
      clientId: form.clientId,
      priority: form.priority,
      visibilityToCoach: form.visibilityToCoach,
    };

    const trimmedDescription = form.description.trim();
    if (trimmedDescription.length > 0) {
      payload.description = trimmedDescription;
    }

    if (form.dueDate) {
      const isoDate = new Date(`${form.dueDate}T12:00:00Z`).toISOString();
      payload.dueDate = isoDate;
    }

    return payload;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) {
      return;
    }

    const payload = buildPayload();

    try {
      const task = await createTask.mutateAsync(payload);
      toast.success('Action item assigned');
      setOpen(false);
      setForm(INITIAL_FORM_STATE);
      setErrors({});
      onCreated?.(task);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'object' && error !== null && 'message' in error
            ? String((error as { message?: unknown }).message ?? '')
            : '';

      toast.error(message || 'Failed to assign action item');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2" size="sm">
          <Plus className="h-4 w-4" />
          Assign action item
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Assign a new action item</DialogTitle>
          <DialogDescription>
            Create actionable homework for your client with clear expectations
            and visibility controls.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="clientId">Client</Label>
            <Select
              value={form.clientId}
              onValueChange={handleClientChange}
              disabled={isClientSelectDisabled}
            >
              <SelectTrigger id="clientId">
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {isClientsLoading ? (
                  <SelectItem value="loading" disabled>
                    Loading clients…
                  </SelectItem>
                ) : clientsResult?.success && clients.length > 0 ? (
                  clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.firstName || client.lastName
                        ? `${client.firstName ?? ''} ${client.lastName ?? ''}`.trim()
                        : client.email}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="unavailable" disabled>
                    {clientsError ?? 'No clients available'}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {errors.clientId ? (
              <p className="text-sm text-red-600">{errors.clientId}</p>
            ) : null}
            {clientsError ? (
              <p className="text-xs text-red-600">
                Unable to load clients. {clientsError}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              placeholder="e.g. Somatic grounding practice"
              value={form.title}
              onChange={handleInputChange}
              disabled={createTask.isPending}
              aria-invalid={Boolean(errors.title)}
            />
            {errors.title ? (
              <p className="text-sm text-red-600">{errors.title}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Provide context, suggested cadence, or resources."
              value={form.description}
              onChange={handleInputChange}
              disabled={createTask.isPending}
              rows={4}
            />
          </div>

          <div className="space-y-3">
            <Label>Priority</Label>
            <div className="flex flex-wrap gap-2">
              {taskPriorityValues.map(priority => {
                const isActive = form.priority === priority;
                return (
                  <Button
                    key={priority}
                    type="button"
                    variant={isActive ? 'default' : 'outline'}
                    onClick={() => handlePriorityChange(priority)}
                    disabled={createTask.isPending}
                    className={
                      isActive
                        ? 'border-teal-500 bg-teal-600 text-white'
                        : 'border-neutral-200'
                    }
                  >
                    {TASK_PRIORITY_LABELS[priority]}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">Due date (optional)</Label>
            <div className="flex items-center gap-3">
              <Input
                id="dueDate"
                name="dueDate"
                type="date"
                min={today}
                value={form.dueDate}
                onChange={handleInputChange}
                disabled={createTask.isPending}
                className="w-48"
              />
              <CalendarIcon className="h-4 w-4 text-neutral-400" aria-hidden />
            </div>
            <p className="text-xs text-neutral-500">
              Set a due date to automatically schedule reminders and progress
              expectations.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-neutral-800">
                Visible to coach
              </p>
              <p className="text-xs text-neutral-500">
                Keep this homework update in your coaching timeline.
              </p>
            </div>
            <Switch
              checked={form.visibilityToCoach}
              onCheckedChange={handleVisibilityToggle}
              disabled={createTask.isPending}
              aria-label="Toggle coach visibility"
            />
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={createTask.isPending}
              className="w-full sm:w-auto"
            >
              {createTask.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Assigning…
                </span>
              ) : (
                'Assign action item'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
