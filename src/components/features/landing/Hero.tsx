/**
 * @file Marketing hero section that surfaces the core value proposition and
 *       optional social proof immediately beneath the fold.
 */
import type { JSX } from 'react';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import type {
  LandingHero,
  LandingSocialProof,
} from '@/modules/platform/cms/types';

/**
 * Renders the primary hero banner, action buttons, and optional social proof.
 *
 * @param hero - Locale-specific hero copy and CTA metadata.
 * @param socialProof - Optional logo marquee configuration.
 * @param locale - Active locale string used for internal links.
 * @param className - Optional Tailwind classes for layout overrides.
 */
export function LandingHero({
  hero,
  socialProof,
  locale,
  className,
}: {
  hero: LandingHero;
  socialProof?: LandingSocialProof;
  locale: string;
  className?: string;
}): JSX.Element {
  /**
   * Resolves an internal or external href to the locale-aware link variant.
   *
   * @param href - Raw href value coming from CMS content.
   * @returns The locale string when the link is internal; otherwise undefined.
   */
  const resolveLocale = (href: string) =>
    href.startsWith('/') ? locale : undefined;
  const previewCards = hero.previewCards ?? [
    {
      label: 'Weekly progress',
      value: '+18% vs. last month',
    },
    {
      label: 'Next session',
      value: 'Wednesday · 14:30 · Cohort circle',
    },
    {
      label: 'Practice reminder',
      value: 'Share a reflection before the next meeting',
    },
  ];

  return (
    <section
      id="hero"
      className={cn(
        'relative overflow-hidden bg-gradient-to-b from-white via-purple-50/60 to-white',
        className
      )}
    >
      <div
        className="absolute inset-x-0 top-0 -z-10 h-64 bg-gradient-to-b from-purple-100/70 via-transparent to-transparent"
        aria-hidden="true"
      />
      <div className="mx-auto grid max-w-7xl items-center gap-16 px-4 pb-24 pt-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:px-8 lg:pt-24">
        <div className="space-y-7">
          {hero.chip ? (
            <span className="inline-flex items-center rounded-full bg-purple-100 px-4 py-1 text-sm font-medium text-purple-700">
              {hero.chip}
            </span>
          ) : null}
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-500">
            {hero.eyebrow}
          </p>
          <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            {hero.title}
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-slate-600 sm:text-xl">
            {hero.description}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button size="lg" variant="default" asChild>
              <Link
                href={hero.primary.href}
                locale={resolveLocale(hero.primary.href)}
              >
                {hero.primary.label}
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link
                href={hero.secondary.href}
                locale={resolveLocale(hero.secondary.href)}
              >
                {hero.secondary.label}
              </Link>
            </Button>
          </div>
          <p className="text-sm text-slate-500">
            {hero.signInPrompt}{' '}
            <Link
              href={hero.signInHref}
              locale={resolveLocale(hero.signInHref)}
              className="font-medium text-purple-600 underline-offset-4 hover:underline"
            >
              {hero.signInLabel}
            </Link>
          </p>
        </div>

        <div className="relative isolate">
          <div
            className="absolute -top-10 left-10 h-32 w-32 rounded-full bg-purple-200/70 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="absolute -bottom-12 right-0 h-36 w-36 rounded-full bg-violet-300/60 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative overflow-hidden rounded-3xl border border-purple-100 bg-white/80 shadow-xl backdrop-blur">
            <div className="flex flex-col gap-6 p-8">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">
                    Loom-app
                  </span>
                  <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700">
                    Satya method
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-slate-500">
                  {hero.visualAlt}
                </p>
              </div>
              <div className="grid gap-3">
                {previewCards.map(card => (
                  <div
                    key={card.label}
                    className="rounded-2xl border border-slate-100 bg-white/70 p-4"
                  >
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      {card.label}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">{card.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {socialProof ? (
        <div
          id="solutions"
          className="border-t border-slate-100 bg-slate-50/70 py-12"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <p className="text-center text-sm font-semibold uppercase tracking-widest text-slate-500">
              {socialProof.title}
            </p>
            <div className="mt-8 grid grid-cols-2 items-center justify-items-center gap-8 sm:grid-cols-3 lg:grid-cols-6">
              {socialProof.logos.map(logo => (
                <div
                  key={logo}
                  className="w-full rounded-xl border border-transparent bg-white/80 px-4 py-3 text-center text-sm font-semibold text-slate-500 shadow-sm ring-1 ring-slate-100"
                >
                  {logo}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
