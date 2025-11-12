/**
 * @fileoverview Renders recent messages for the current client.
 * Displays conversations with unread indicators and quick access to messaging.
 */

'use client';

import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, MessageSquare, Users } from 'lucide-react';
import Link from 'next/link';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RecentMessage {
  id: string;
  conversationId: string;
  content: string;
  senderName: string;
  senderAvatar: string | null;
  sentAt: string;
  unreadCount: number;
  isGroup: boolean;
}

interface RecentMessagesProps {
  messages: RecentMessage[];
  locale: string;
  isLoading: boolean;
  emptyMessage: string;
  viewAllLabel: string;
  unreadLabel: string;
  groupLabel: string;
}

function formatTimeAgo(value: string, locale: string): string {
  try {
    return formatDistanceToNow(new Date(value), {
      addSuffix: true,
      locale: locale === 'he' ? undefined : undefined // Can add date-fns locales if needed
    });
  } catch (_error) {
    return value;
  }
}

export function RecentMessages({
  messages,
  locale,
  isLoading,
  emptyMessage,
  viewAllLabel,
  unreadLabel,
  groupLabel,
}: RecentMessagesProps) {
  if (isLoading) {
    return (
      <div className="space-y-3" aria-label="loading messages">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={`client-message-skeleton-${index}`}
            className="flex items-start gap-3 rounded-xl border border-sand-200 bg-white/60 p-4 shadow-sm"
          >
            <span className="block h-10 w-10 animate-pulse rounded-full bg-sand-200" />
            <div className="flex-1 space-y-2">
              <span className="block h-4 w-32 animate-pulse rounded bg-sand-200" />
              <span className="block h-3 w-full animate-pulse rounded bg-sand-100" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!messages.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <MessageCircle className="h-12 w-12 text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {messages.map(message => (
          <li key={message.id}>
            <Link
              href={`/messages/${message.conversationId}`}
              className={cn(
                "flex items-start gap-3 rounded-xl border border-sand-200 bg-white/70 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200",
                message.unreadCount > 0 && "border-teal-300 bg-teal-50/30"
              )}
            >
              <Avatar className="h-10 w-10 flex-shrink-0">
                {message.senderAvatar && (
                  <AvatarImage src={message.senderAvatar} alt={message.senderName} />
                )}
                <AvatarFallback className="bg-teal-100 text-teal-700 text-sm">
                  {message.isGroup ? (
                    <Users className="h-5 w-5" />
                  ) : (
                    message.senderName
                      .split(' ')
                      .map(n => n[0])
                      .join('')
                      .toUpperCase()
                  )}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-sand-900 truncate">
                    {message.senderName}
                  </p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {message.isGroup && (
                      <Badge variant="outline" className="text-xs">
                        {groupLabel}
                      </Badge>
                    )}
                    {message.unreadCount > 0 && (
                      <Badge variant="default" className="bg-teal-600">
                        {message.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
                <p className={cn(
                  "text-sm text-muted-foreground line-clamp-2",
                  message.unreadCount > 0 && "font-medium text-sand-700"
                )}>
                  {message.content}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatTimeAgo(message.sentAt, locale)}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <div className="pt-2">
        <Button
          asChild
          variant="outline"
          className="w-full"
        >
          <Link href="/messages">
            <MessageSquare className="h-4 w-4 mr-2" />
            {viewAllLabel}
          </Link>
        </Button>
      </div>
    </div>
  );
}
