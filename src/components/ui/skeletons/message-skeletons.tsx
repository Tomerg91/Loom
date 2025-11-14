/**
 * @fileoverview Message and notification skeleton components
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton, SkeletonText, SkeletonAvatar, SkeletonButton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * Skeleton for a single message bubble
 */
export function MessageBubbleSkeleton({
  isSent = false,
  className
}: {
  isSent?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex gap-3', isSent && 'flex-row-reverse', className)}>
      <SkeletonAvatar className="h-8 w-8" />
      <div className={cn('flex flex-col gap-1', isSent ? 'items-end' : 'items-start')}>
        <div className={cn(
          'max-w-[70%] space-y-2 rounded-lg p-3',
          isSent ? 'bg-primary/10' : 'bg-muted'
        )}>
          <SkeletonText className="h-4 w-48" />
          <SkeletonText className="h-4 w-32" />
        </div>
        <SkeletonText className="h-3 w-16" />
      </div>
    </div>
  );
}

/**
 * Skeleton for message thread/conversation
 */
export function MessageThreadSkeleton({ count = 10, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('space-y-4 p-4', className)} role="status" aria-label="Loading messages">
      {Array.from({ length: count }).map((_, i) => (
        <MessageBubbleSkeleton key={i} isSent={i % 3 === 0} />
      ))}
    </div>
  );
}

/**
 * Skeleton for conversation list item
 */
export function ConversationListItemSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-start gap-3 p-3 hover:bg-muted/50 rounded-lg cursor-pointer', className)}>
      <div className="relative">
        <SkeletonAvatar className="h-12 w-12" />
        <Skeleton className="absolute bottom-0 right-0 h-3 w-3 rounded-full" />
      </div>
      <div className="flex-1 space-y-2 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <SkeletonText className="h-4 w-32" />
          <SkeletonText className="h-3 w-16" />
        </div>
        <SkeletonText className="h-3 w-full" />
      </div>
      <Skeleton className="h-5 w-5 rounded-full" />
    </div>
  );
}

/**
 * Skeleton for conversation list
 */
export function ConversationListSkeleton({ count = 8, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('space-y-1', className)} role="status" aria-label="Loading conversations">
      {Array.from({ length: count }).map((_, i) => (
        <ConversationListItemSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton for message composer
 */
export function MessageComposerSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('w-full', className)}>
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <SkeletonText className="h-4 w-16" />
            <Skeleton className="h-10 flex-1 rounded" />
          </div>
          <Skeleton className="h-32 w-full rounded" />
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <SkeletonButton className="h-9 w-9" />
              <SkeletonButton className="h-9 w-9" />
              <SkeletonButton className="h-9 w-9" />
            </div>
            <SkeletonButton className="h-9 w-24" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton for full messages page layout
 */
export function MessagesPageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex h-[calc(100vh-4rem)] gap-4', className)} role="status" aria-label="Loading messages page">
      {/* Sidebar - Conversation List */}
      <Card className="w-80 flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <SkeletonText className="h-6 w-32" />
            <SkeletonButton className="h-8 w-8" />
          </div>
          <Skeleton className="h-10 w-full rounded mt-3" />
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-2">
          <ConversationListSkeleton count={6} />
        </CardContent>
      </Card>

      {/* Main Content - Message Thread */}
      <Card className="flex-1 flex flex-col">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SkeletonAvatar className="h-10 w-10" />
              <div className="space-y-1">
                <SkeletonText className="h-5 w-32" />
                <SkeletonText className="h-3 w-20" />
              </div>
            </div>
            <div className="flex gap-2">
              <SkeletonButton className="h-8 w-8" />
              <SkeletonButton className="h-8 w-8" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <MessageThreadSkeleton count={8} />
        </CardContent>
        <div className="p-4 border-t">
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 flex-1 rounded" />
            <SkeletonButton className="h-10 w-10" />
            <SkeletonButton className="h-10 w-10" />
          </div>
        </div>
      </Card>
    </div>
  );
}

/**
 * Skeleton for notification item
 */
export function NotificationItemSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-start gap-3 p-3 border-b last:border-b-0', className)}>
      <SkeletonAvatar className="h-10 w-10" />
      <div className="flex-1 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <SkeletonText className="h-4 w-48" />
          <SkeletonText className="h-3 w-16" />
        </div>
        <SkeletonText className="h-3 w-full" />
        <SkeletonText className="h-3 w-3/4" />
      </div>
      <Skeleton className="h-2 w-2 rounded-full" />
    </div>
  );
}

/**
 * Skeleton for notification list
 */
export function NotificationListSkeleton({ count = 10, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('divide-y', className)} role="status" aria-label="Loading notifications">
      {Array.from({ length: count }).map((_, i) => (
        <NotificationItemSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton for notification center/panel
 */
export function NotificationCenterSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('w-full max-w-md', className)} role="status" aria-label="Loading notification center">
      <CardHeader>
        <div className="flex items-center justify-between">
          <SkeletonText className="h-6 w-32" />
          <div className="flex gap-2">
            <SkeletonButton className="h-8 w-24" />
            <SkeletonButton className="h-8 w-8" />
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <SkeletonButton className="h-8 w-16" />
          <SkeletonButton className="h-8 w-20" />
          <SkeletonButton className="h-8 w-20" />
        </div>
      </CardHeader>
      <CardContent className="p-0 max-h-96 overflow-hidden">
        <NotificationListSkeleton count={6} />
      </CardContent>
    </Card>
  );
}
