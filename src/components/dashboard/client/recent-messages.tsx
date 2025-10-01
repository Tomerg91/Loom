'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowRight, MessageSquare, UserCircle } from 'lucide-react';
import { useMemo } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/routing';
import type { Conversation, Message, User } from '@/types';

import type { DashboardTranslations } from '../dashboard-types';

interface ClientRecentMessagesProps {
  locale: string;
  translations: DashboardTranslations;
  userName: string;
}

interface MessagesResponse {
  data?: Conversation[];
}

const MESSAGE_LIMIT = 4;

function buildParticipantName(participants: User[]): string {
  if (!participants || participants.length === 0) {
    return '—';
  }
  const [firstParticipant] = participants;
  const segments = [firstParticipant.firstName, firstParticipant.lastName].filter(Boolean);
  return segments.length > 0 ? segments.join(' ') : firstParticipant.email;
}

function buildAvatarFallback(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((segment) => segment.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function buildPreview(lastMessage?: Message): string {
  if (!lastMessage) {
    return '';
  }
  const preview = lastMessage.content || '';
  return preview.length > 120 ? `${preview.slice(0, 117)}…` : preview;
}

async function fetchRecentMessages(): Promise<Conversation[]> {
  const params = new URLSearchParams({ limit: String(MESSAGE_LIMIT) });
  const response = await fetch(`/api/messages?${params.toString()}`, {
    cache: 'no-store',
    credentials: 'same-origin',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch messages');
  }

  const payload: MessagesResponse = await response.json();
  return payload.data ?? [];
}

export function ClientRecentMessages({ locale, translations, userName }: ClientRecentMessagesProps) {
  const { dashboard: t, common: commonT } = translations;

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        hour: '2-digit',
        minute: '2-digit',
        month: 'short',
        day: 'numeric',
      }),
    [locale]
  );

  const { data, isLoading, isError, refetch } = useQuery<Conversation[]>({
    queryKey: ['client-recent-messages', userName],
    queryFn: fetchRecentMessages,
    staleTime: 30_000,
  });

  const messages = data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          {t('clientSections.recentMessages.title')}
        </CardTitle>
        <CardDescription>{t('clientSections.recentMessages.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={`message-skeleton-${index}`} className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {isError && !isLoading && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            <p>{t('clientSections.recentMessages.error')}</p>
            <Button onClick={() => refetch()} size="sm" variant="outline" className="mt-3">
              {commonT('retry')}
            </Button>
          </div>
        )}

        {!isLoading && !isError && messages.length === 0 && (
          <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            <UserCircle className="mx-auto mb-3 h-10 w-10 opacity-50" />
            <p>{t('clientSections.recentMessages.empty')}</p>
            <Button asChild className="mt-4" variant="secondary">
              <Link href="/messages">
                <ArrowRight className="mr-2 h-4 w-4" />
                {t('clientSections.recentMessages.cta')}
              </Link>
            </Button>
          </div>
        )}

        {!isLoading && !isError && messages.length > 0 && (
          <div className="space-y-4">
            {messages.map((conversation) => {
              const participantName = buildParticipantName(conversation.participants || []);
              const lastMessageTime = conversation.lastMessage?.createdAt
                ? dateFormatter.format(new Date(conversation.lastMessage.createdAt))
                : '';
              const unreadCount = conversation.unreadCount ?? 0;

              return (
                <div key={conversation.id} className="flex items-start gap-3 rounded-lg border border-border/60 bg-background p-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={conversation.participants?.[0]?.avatarUrl || undefined} alt={participantName} />
                    <AvatarFallback>{buildAvatarFallback(participantName)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm text-foreground">{participantName}</p>
                      {lastMessageTime && (
                        <span className="text-xs text-muted-foreground">{lastMessageTime}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {buildPreview(conversation.lastMessage)}
                    </p>
                    <div className="flex items-center justify-between pt-2">
                      <Button asChild size="sm" variant="ghost" className="px-0 text-primary">
                        <Link href={`/messages/${conversation.id}`}>
                          {commonT('view')}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                      {unreadCount > 0 && (
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                          {t('clientSections.recentMessages.unread', { count: unreadCount })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
