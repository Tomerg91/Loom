'use client';

/**
 * @file Final CTA section for the landing page with analytics tracking.
 */

import { TrackedCta } from '@/components/landing/tracked-cta';
import { Link } from '@/i18n/routing';
import type { LandingCta } from '@/modules/platform/cms/types';

export interface FinalCtaSectionProps {
  cta: LandingCta;
  locale: string;
}

export function FinalCtaSection({ cta, locale }: FinalCtaSectionProps) {
  return (
    <section id="cta" className="relative isolate overflow-hidden py-20">
      <div
        className="absolute inset-0 -z-10 bg-gradient-to-r from-purple-600 via-purple-500 to-violet-600 opacity-90"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.25),_transparent_60%)]"
        aria-hidden="true"
      />
      <div className="mx-auto max-w-4xl px-4 text-center text-white sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {cta.title}
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-purple-100">
          {cta.description}
        </p>
        <div className="mt-8 flex justify-center">
          <TrackedCta
            label={cta.primary.label}
            href={cta.primary.href}
            location="cta-final"
            locale={locale}
            experiment={cta.primary.experiment}
          >
            {(label) => (
              <Link
                href={cta.primary.href}
                locale={
                  cta.primary.href.startsWith('/') ? locale : undefined
                }
                className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-lg font-semibold text-purple-700 shadow-lg transition hover:bg-purple-50"
              >
                {label}
              </Link>
            )}
          </TrackedCta>
        </div>
      </div>
    </section>
  );
}
