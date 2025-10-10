'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import type { TaskStatus } from '../types/task';

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  OVERDUE: 'Overdue',
} as const;

const STATUS_STYLES: Record<TaskStatus, string> = {
  PENDING: 'bg-sky-100 text-sky-800 border-sky-200',
  IN_PROGRESS: 'bg-amber-100 text-amber-900 border-amber-200',
  COMPLETED: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  OVERDUE: 'bg-rose-100 text-rose-900 border-rose-200',
};

export interface TaskStatusBadgeProps {
  status: TaskStatus;
  className?: string;
}

export function TaskStatusBadge({ status, className }: TaskStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'rounded-full px-2.5 py-0.5 text-xs font-medium capitalize tracking-wide',
        STATUS_STYLES[status],
        className
      )}
    >
      {TASK_STATUS_LABELS[status]}
    </Badge>
  );
}
