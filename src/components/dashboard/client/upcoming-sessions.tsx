'use client';

import { Calendar, ExternalLink } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/client';


interface ClientUpcomingSessionsProps {
  userId: string;
  locale: string;}

interface UpcomingSession {
  id: string;
  scheduledAt: string;
  status: string | null;
  meetingUrl?: string | null;
}

const UPCOMING_LIMIT = 2;

export function ClientUpcomingSessions({ userId, locale }: ClientUpcomingSessionsProps) {
  const t = useTranslations('dashboard.clientSections.upcomingSessions');
  const commonT = useTranslations('common');

  const [sessions, setSessions] = useState<UpcomingSession[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit',
        month: 'short',
        day: 'numeric',
      }),
    [locale]
  );

  useEffect(() => {
    let isMounted = true;

    async function loadSessions() {
      if (!userId) {
        if (isMounted) {
          setSessions([]);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const supabase = createClient();
        const nowIso = new Date().toISOString();

        const { data, error } = await supabase
          .from('sessions')
          .select('id, scheduled_at, status, meeting_url')
          .eq('client_id', userId)
          .gte('scheduled_at', nowIso)
          .order('scheduled_at', { ascending: true })
          .limit(UPCOMING_LIMIT);

        console.log('[ClientUpcomingSessions] Supabase response', { data, error });

        if (error) {
          throw error;
        }

        const normalizedSessions: UpcomingSession[] = (data ?? []).map((session) => ({
          id: session.id,
          scheduledAt: session.scheduled_at,
          status: session.status,
          meetingUrl: (session as { meeting_url?: string | null }).meeting_url ?? null,
        }));

        if (isMounted) {
          setSessions(normalizedSessions);
        }
      } catch (error) {
        console.error('[ClientUpcomingSessions] Failed to load sessions', error);
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : String(error));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadSessions();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
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

        {errorMessage && !isLoading && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            <p>{t('error')}</p>
            <p className="mt-2 text-xs text-destructive/80">{errorMessage}</p>
          </div>
        )}

        {!isLoading && !errorMessage && sessions.length === 0 && (
          <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
            <Calendar className="mx-auto mb-4 h-10 w-10 opacity-50" />
            <p>{t('empty')}</p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/client/book" locale={locale}>
                {t('cta')}
              </Link>
            </Button>
          </div>
        )}

        {!isLoading && !errorMessage && sessions.length > 0 && (
          <ul className="space-y-3">
            {sessions.map((session) => {
              const scheduledAt = new Date(session.scheduledAt);

              return (
                <li
                  key={session.id}
                  className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-sm text-foreground">{dateFormatter.format(scheduledAt)}</p>
                    <p className="text-xs capitalize text-muted-foreground">{session.status ?? 'scheduled'}</p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/sessions/${session.id}`} locale={locale}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        {commonT('view')}
                      </Link>
                    </Button>
                    {session.meetingUrl && (
                      <Button asChild size="sm">
                        <a href={session.meetingUrl} target="_blank" rel="noopener noreferrer">
                          {t('join')}
                        </a>
                      </Button>
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
