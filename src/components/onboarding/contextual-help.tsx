'use client';

import { HelpCircle, Info, Lightbulb } from 'lucide-react';
import { ReactNode } from 'react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ContextualHelpProps {
  content: string | ReactNode;
  variant?: 'tooltip' | 'inline' | 'card';
  icon?: 'help' | 'info' | 'tip';
  className?: string;
}

export function ContextualHelp({
  content,
  variant = 'tooltip',
  icon = 'help',
  className = '',
}: ContextualHelpProps) {
  const IconComponent = {
    help: HelpCircle,
    info: Info,
    tip: Lightbulb,
  }[icon];

  if (variant === 'tooltip') {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={200}>
          <TooltipTrigger type="button" className={`inline-flex items-center ${className}`}>
            <IconComponent className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" aria-hidden="true" />
            <span className="sr-only">Help information</span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="text-sm">{content}</div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={`flex items-start gap-2 text-sm text-muted-foreground ${className}`}>
        <IconComponent className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div>{content}</div>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`rounded-lg border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-800 dark:bg-blue-950/20 ${className}`}>
        <div className="flex items-start gap-3">
          <IconComponent className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          <div className="flex-1 text-sm text-blue-900 dark:text-blue-100">
            {content}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
