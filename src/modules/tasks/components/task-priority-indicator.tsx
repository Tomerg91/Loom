'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import type { TaskPriority } from '../types/task';

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
} as const;

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  LOW: 'bg-slate-100 text-slate-700 border-slate-200',
  MEDIUM: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  HIGH: 'bg-rose-100 text-rose-900 border-rose-200',
};

export interface TaskPriorityIndicatorProps {
  priority: TaskPriority;
  className?: string;
}

export function TaskPriorityIndicator({
  priority,
  className,
}: TaskPriorityIndicatorProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide',
        PRIORITY_STYLES[priority],
        className
      )}
    >
      {TASK_PRIORITY_LABELS[priority]}
    </Badge>
  );
}
