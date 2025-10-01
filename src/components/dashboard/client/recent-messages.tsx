'use client';

import { ArrowRight, MessageSquare, UserCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/client';

import type { DashboardTranslations } from '../dashboard-types';

interface ClientRecentMessagesProps {
  userId: string;
  locale: string;
  translations: DashboardTranslations;
}

interface MessageItem {
  id: string;
  content: string | null;
  createdAt: string;
  senderId: string;
  receiverId: string;
  read: boolean | null;
}

const MESSAGE_LIMIT = 4;

export function ClientRecentMessages({ userId, locale, translations }: ClientRecentMessagesProps) {
  const { dashboard: t, common: commonT } = translations;

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  useEffect(() => {
    let isMounted = true;

    async function loadMessages() {
      if (!userId) {
        if (isMounted) {
          setMessages([]);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const supabase = createClient() as any;

        const { data, error } = await supabase
          .from('messages')
          .select('id, content, created_at, sender_id, receiver_id, read')
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
          .order('created_at', { ascending: false })
          .limit(MESSAGE_LIMIT);

        console.log('[ClientRecentMessages] Supabase response', { data, error });

        if (error) {
          throw error;
        }

        const rawMessages = Array.isArray(data) ? data : [];
        const normalizedMessages: MessageItem[] = rawMessages.map((message: any) => ({
          id: String(message.id ?? ''),
          content: typeof message.content === 'string' ? message.content : null,
          createdAt:
            typeof message.created_at === 'string' ? message.created_at : new Date().toISOString(),
          senderId: typeof message.sender_id === 'string' ? message.sender_id : userId,
          receiverId: typeof message.receiver_id === 'string' ? message.receiver_id : userId,
          read: typeof message.read === 'boolean' ? message.read : Boolean(message.read ?? false),
        }));

        if (isMounted) {
          setMessages(normalizedMessages);
        }
      } catch (error) {
        console.error('[ClientRecentMessages] Failed to load messages', error);
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : String(error));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadMessages();

    return () => {
      isMounted = false;
    };
  }, [userId]);

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
          <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/10 p-6 text-center text-sm text-muted-foreground">
            {commonT('loading')}
          </div>
        )}

        {errorMessage && !isLoading && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            <p>{t('clientSections.recentMessages.error')}</p>
            <p className="mt-2 text-xs text-destructive/80">{errorMessage}</p>
          </div>
        )}

        {!isLoading && !errorMessage && messages.length === 0 && (
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

        {!isLoading && !errorMessage && messages.length > 0 && (
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
                        {t('clientSections.recentMessages.unread', { count: 1 })}
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
