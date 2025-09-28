'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from '@/i18n/routing';

interface PersonaContent {
  id: PersonaKey;
  label: string;
  tagline: string;
  description: string;
  highlights: string[];
  walkthrough: string[];
  ctaLabel: string;
}

type PersonaKey = 'coach' | 'client' | 'admin';

const personaRouteMap: Record<PersonaKey, '/coach' | '/client' | '/admin/analytics'> = {
  coach: '/coach',
  client: '/client',
  admin: '/admin/analytics',
};

export function PersonaShowcase() {
  const t = useTranslations('landing.personas');
  const locale = useLocale();

  const personas = useMemo<PersonaContent[]>(() => {
    const keys: PersonaKey[] = ['coach', 'client', 'admin'];

    return keys.map((key) => {
      const rawHighlights = t.raw(`${key}.highlights`);
      const highlights = Array.isArray(rawHighlights) ? rawHighlights.map(String) : [];

      const rawWalkthrough = t.raw(`${key}.walkthrough`);
      const walkthrough = Array.isArray(rawWalkthrough) ? rawWalkthrough.map(String) : [];

      const cta = t.raw(`${key}.cta`) as { label?: string } | undefined;

      return {
        id: key,
        label: t(`${key}.label`),
        tagline: t(`${key}.tagline`),
        description: t(`${key}.description`),
        highlights,
        walkthrough,
        ctaLabel: cta?.label ?? t('title'),
      };
    });
  }, [t]);

  if (!personas.length) {
    return null;
  }

  return (
    <section className="py-16 md:py-20" aria-labelledby="persona-showcase-title">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <Badge variant="outline" className="mb-4 inline-flex items-center gap-2 px-4 py-1.5 text-xs uppercase tracking-wide">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          {t('title')}
        </Badge>
        <h2 id="persona-showcase-title" className="text-3xl md:text-4xl font-light text-foreground">
          {t('subtitle')}
        </h2>
      </div>

      <div className="max-w-6xl mx-auto mt-10">
        <Tabs defaultValue={personas[0].id} className="w-full">
          <TabsList className="mx-auto flex-wrap gap-2 bg-muted/60 p-1.5" aria-label={t('title')}>
            {personas.map((persona) => (
              <TabsTrigger
                key={persona.id}
                value={persona.id}
                className="data-[state=active]:bg-background data-[state=active]:text-foreground"
              >
                {persona.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {personas.map((persona) => (
            <TabsContent key={persona.id} value={persona.id} className="mt-8">
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr),minmax(0,1fr)]">
                <div className="relative overflow-hidden rounded-3xl border bg-card p-8 shadow-sm">
                  <div className="absolute -top-20 -right-16 h-40 w-40 rounded-full bg-orange-200 opacity-20 blur-3xl" aria-hidden="true" />
                  <div className="absolute -bottom-24 -left-10 h-36 w-36 rounded-full bg-red-200 opacity-20 blur-3xl" aria-hidden="true" />

                  <div className="relative z-10 text-start">
                    <p className="text-sm font-medium text-orange-600 mb-2">
                      {persona.tagline}
                    </p>
                    <p className="text-lg text-muted-foreground">
                      {persona.description}
                    </p>

                    <ul className="mt-6 space-y-3">
                      {persona.highlights.map((highlight, index) => (
                        <li key={index} className="flex items-start gap-3 text-start text-sm text-muted-foreground">
                          <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange-500" aria-hidden="true" />
                          <span>{highlight}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-8 flex flex-wrap gap-3">
                      <Link href={personaRouteMap[persona.id]} locale={locale} className="inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-light tracking-wide bg-orange-600 text-white hover:bg-orange-700 shadow-md hover:shadow-lg hover:-translate-y-0.5 font-normal h-13 px-8 py-3 text-base gap-2">
                        {persona.ctaLabel}
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border bg-background p-6 shadow-sm">
                  <h3 className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
                    {persona.label}
                  </h3>
                  <ol className="mt-4 space-y-4">
                    {persona.walkthrough.map((step, index) => (
                      <li key={index} className="flex gap-3 text-start">
                        <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-medium text-orange-700">
                          {index + 1}
                        </span>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {step}
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}
