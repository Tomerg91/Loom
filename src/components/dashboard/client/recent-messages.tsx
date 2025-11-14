'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowRight, MessageSquare, UserCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/client';


interface ClientRecentMessagesProps {
  userId: string;
  locale: string;}

interface MessageItem {
  id: string;
  content: string | null;
  createdAt: string;
  senderId: string;
  receiverId: string | null;
  read: boolean;
}

const MESSAGE_LIMIT = 4;

async function fetchRecentMessages(userId: string): Promise<MessageItem[]> {
  if (!userId) {
    return [];
  }

  const supabase = createClient() as unknown;

  const { data, error } = await supabase
    .from('messages')
    .select(
      `
        id,
        content,
        created_at,
        sender_id,
        conversation_id,
        conversations!inner (
          conversation_participants!inner (
            user_id,
            last_read_at
          )
        ),
        message_read_receipts (
          user_id,
          read_at
        )
      `
    )
    .eq('conversations.conversation_participants.user_id', userId)
    .order('created_at', { ascending: false })
    .limit(MESSAGE_LIMIT);

  if (error) {
    throw error;
  }

  const rawMessages = Array.isArray(data) ? data : [];
  const uniqueMessages = new Map<string, MessageItem>();

  rawMessages.forEach((message: unknown) => {
    const messageId = typeof message.id === 'string' ? message.id : String(message.id ?? '');
    if (!messageId || uniqueMessages.has(messageId)) {
      return;
    }

    const participants = Array.isArray(message?.conversations?.conversation_participants)
      ? message.conversations.conversation_participants
      : [];

    const currentParticipant = participants.find(
      (participant: unknown) => typeof participant?.user_id === 'string' && participant.user_id === userId
    );
    const otherParticipant = participants.find(
      (participant: unknown) => typeof participant?.user_id === 'string' && participant.user_id !== userId
    );

    const messageReceipts = Array.isArray(message?.message_read_receipts)
      ? message.message_read_receipts
      : [];

    const createdAt =
      typeof message.created_at === 'string'
        ? message.created_at
        : new Date().toISOString();
    const senderId = typeof message.sender_id === 'string' ? message.sender_id : userId;

    const hasReadReceipt = messageReceipts.some(
      (receipt: unknown) => typeof receipt?.user_id === 'string' && receipt.user_id === userId
    );

    const lastReadAt =
      typeof currentParticipant?.last_read_at === 'string'
        ? currentParticipant.last_read_at
        : null;

    const read =
      senderId === userId ||
      hasReadReceipt ||
      (lastReadAt ? new Date(lastReadAt).getTime() >= new Date(createdAt).getTime() : false);

    uniqueMessages.set(messageId, {
      id: messageId,
      content: typeof message.content === 'string' ? message.content : null,
      createdAt,
      senderId,
      receiverId: typeof otherParticipant?.user_id === 'string' ? otherParticipant.user_id : null,
      read,
    });
  });

  return Array.from(uniqueMessages.values());
}

export function ClientRecentMessages({ userId, locale }: ClientRecentMessagesProps) {
  const t = useTranslations('dashboard.clientSections.recentMessages');
  const commonT = useTranslations('common');

  const { data: messages, isLoading, error, refetch } = useQuery({
    queryKey: ['client-recent-messages', userId],
    queryFn: () => fetchRecentMessages(userId),
    enabled: !!userId,
    staleTime: 30_000, // 30 seconds
    refetchInterval: 60_000, // Refetch every minute for new messages
  });

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          {t('title')}
        </CardTitle>
        <CardDescription>{t('subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/10 p-6 text-center text-sm text-muted-foreground">
            {commonT('loading')}
          </div>
        )}

        {error && !isLoading && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            <p>{t('error')}</p>
            <p className="mt-2 text-xs text-destructive/80">{error instanceof Error ? error.message : String(error)}</p>
            <Button onClick={() => refetch()} size="sm" variant="outline" className="mt-3">
              {commonT('retry')}
            </Button>
          </div>
        )}

        {!isLoading && !error && (!messages || messages.length === 0) && (
          <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            <UserCircle className="mx-auto mb-3 h-10 w-10 opacity-50" />
            <p>{t('empty')}</p>
            <Button asChild className="mt-4" variant="secondary">
              <Link href="/messages">
                <ArrowRight className="mr-2 h-4 w-4" />
                {t('cta')}
              </Link>
            </Button>
          </div>
        )}

        {!isLoading && !error && messages && messages.length > 0 && (
          <ul className="space-y-3">
            {messages.map((message) => {
              const messageDate = dateFormatter.format(new Date(message.createdAt));
              const directionLabel = message.senderId === userId ? 'Sent' : 'Received';

              return (
                <li
                  key={message.id}
                  className="rounded-lg border border-border/60 bg-background p-4 text-sm text-foreground"
                >
                  <p className="font-medium">{message.content ?? '—'}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {directionLabel} • {messageDate}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <Button asChild size="sm" variant="ghost" className="px-0 text-primary">
                      <Link href="/messages">
                        {commonT('view')}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    {!message.read && (
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        {t('unread', { count: 1 })}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
