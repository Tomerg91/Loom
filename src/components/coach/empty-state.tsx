'use client';

import type { LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <Card className={cn('border-2 border-dashed border-sand-300 bg-sand-50/50', className)}>
      <CardContent className="flex flex-col items-center justify-center text-center py-12 px-6">
        <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center mb-4">
          <Icon className="h-8 w-8 text-teal-400" />
        </div>

        <h3 className="text-lg font-medium text-sand-900 mb-2">{title}</h3>
        <p className="text-sm text-sand-500 mb-6 max-w-md">{description}</p>

        {actionLabel && onAction && (
          <Button onClick={onAction} className="gap-2">
            <Icon className="h-4 w-4" />
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}