'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, CheckCircle2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { formatDate } from '@/lib/utils';

import type { CreateProgressUpdateInput } from '../types/progress';
import type { TaskDto, TaskInstanceDto } from '../types/task';
import { useCreateProgressUpdate } from '../hooks';
import { TaskPriorityIndicator } from './task-priority-indicator';
import { TaskStatusBadge } from './task-status-badge';

export interface TaskProgressDialogProps {
  open: boolean;
  task: TaskDto | null;
  instance: TaskInstanceDto | null;
  onOpenChange: (open: boolean) => void;
}

const MIN_PROGRESS = 0;
const MAX_PROGRESS = 100;
const SLIDER_STEP = 5;

export function TaskProgressDialog({
  open,
  task,
  instance,
  onOpenChange,
}: TaskProgressDialogProps) {
  const { toast } = useToast();
  const { mutateAsync, isPending } = useCreateProgressUpdate();

  const initialPercentage = useMemo(
    () => instance?.completionPercentage ?? 0,
    [instance?.completionPercentage]
  );

  const [progressValue, setProgressValue] = useState<number[]>([
    initialPercentage,
  ]);
  const [note, setNote] = useState('');
  const [shareWithCoach, setShareWithCoach] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const currentValue = Math.round(progressValue[0] ?? initialPercentage);

  useEffect(() => {
    if (open) {
      setProgressValue([initialPercentage]);
      setNote('');
      setShareWithCoach(true);
      setFormError(null);
    }
  }, [open, initialPercentage, instance?.id]);

  const dueDateLabel = instance?.dueDate
    ? formatDate(instance.dueDate)
    : 'No due date';

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!task || !instance) {
      return;
    }

    const trimmedNote = note.trim();

    const payload: CreateProgressUpdateInput = {};

    if (currentValue !== initialPercentage) {
      payload.percentage = currentValue;
    }

    if (trimmedNote.length > 0) {
      payload.note = trimmedNote;
    }

    if (!shareWithCoach) {
      payload.isVisibleToCoach = shareWithCoach;
    }

    const hasMeaningfulUpdate =
      payload.percentage !== undefined || Boolean(payload.note);

    if (!hasMeaningfulUpdate) {
      setFormError('Add a quick note or adjust the progress slider before saving.');
      return;
    }

    setFormError(null);

    try {
      await mutateAsync({
        taskId: task.id,
        instanceId: instance.id,
        input: payload,
      });

      toast({
        title: 'Practice update saved',
        description: shareWithCoach
          ? 'Your coach will see this update right away.'
          : 'Update recorded for your personal tracking.',
      });

      handleClose();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to record your progress. Please try again.';
      setFormError(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex flex-col gap-1 text-left">
            <span className="text-sm font-medium text-muted-foreground">
              Action item update
            </span>
            <span>{task?.title ?? 'Homework progress'}</span>
          </DialogTitle>
          <DialogDescription>
            {task?.description
              ? task.description
              : 'Celebrate each small shift and note what you observed in your body.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <div className="flex flex-wrap items-center gap-3">
              {instance ? (
                <TaskStatusBadge status={instance.status} />
              ) : null}
              {task ? <TaskPriorityIndicator priority={task.priority} /> : null}
              {task?.category ? (
                <span className="inline-flex items-center gap-2 text-xs font-medium text-neutral-600">
                  <span
                    aria-hidden
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: task.category.colorHex }}
                  />
                  {task.category.label}
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <CalendarCheck className="h-4 w-4 text-neutral-400" aria-hidden />
              <span>Due {dueDateLabel}</span>
            </div>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="task-progress-slider" className="text-sm font-medium">
                How complete does this practice feel?
              </Label>
              <div className="flex items-center gap-3">
                <Slider
                  id="task-progress-slider"
                  min={MIN_PROGRESS}
                  max={MAX_PROGRESS}
                  step={SLIDER_STEP}
                  value={progressValue}
                  onValueChange={value => setProgressValue([value[0] ?? 0])}
                  className="flex-1"
                  aria-valuetext={`${currentValue} percent complete`}
                />
                <span className="w-12 text-right text-sm font-semibold text-neutral-700">
                  {currentValue}%
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-progress-note" className="text-sm font-medium">
                What did you notice?
              </Label>
              <Textarea
                id="task-progress-note"
                value={note}
                onChange={event => setNote(event.target.value)}
                placeholder="Describe sensations, emotions, or insights from this practice."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                A few sentences are perfect. This space is for the discoveries you want to
                remember.
              </p>
            </div>

            <div className="flex items-start justify-between gap-4 rounded-lg border border-neutral-200 p-3">
              <div className="space-y-1">
                <Label
                  htmlFor="share-with-coach"
                  className="text-sm font-medium text-neutral-800"
                >
                  Share update with coach
                </Label>
                <p className="text-xs text-neutral-500">
                  {shareWithCoach
                    ? 'Your coach will see this note and progress in their dashboard.'
                    : 'Keep this reflection private for now—you can share it later if you like.'}
                </p>
              </div>
              <Switch
                id="share-with-coach"
                checked={shareWithCoach}
                onCheckedChange={setShareWithCoach}
                aria-label="Share progress update with coach"
              />
            </div>
          </div>

          {formError ? (
            <p className="text-sm font-medium text-destructive">{formError}</p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="gap-2">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              Save update
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
