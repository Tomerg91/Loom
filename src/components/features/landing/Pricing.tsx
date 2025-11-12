/**
 * @file Marketing pricing grid that outlines plan tiers and their
 *       corresponding calls to action.
 */
'use client';

import type { JSX } from 'react';

import { useTrackedCta } from '@/components/landing/use-tracked-cta';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/routing';
import type { LandingPricing } from '@/modules/platform/cms/types';

/**
 * Tier component that manages its own CTA tracking
 */
function PricingTier({
  tier,
  index,
  locale,
  resolveLocale,
}: {
  tier: LandingPricing['tiers'][0];
  index: number;
  locale: string;
  resolveLocale: (href: string) => string | undefined;
}) {
  const tierCta = useTrackedCta({
    label: tier.cta.label,
    href: tier.cta.href,
    location: `pricing-tier-${index + 1}`,
    locale,
    experiment: tier.cta.experiment,
  });

  return (
    <div className="flex h-full flex-col justify-between rounded-3xl border border-slate-100 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-slate-900">
            {tier.name}
          </h3>
          {tier.popular ? (
            <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold uppercase text-purple-600">
              {tier.badgeLabel ?? 'Popular'}
            </span>
          ) : null}
        </div>
        <div>
          <span className="text-4xl font-bold text-slate-900">
            {tier.price}
          </span>
          <p className="text-sm text-slate-500">{tier.priceCaption}</p>
        </div>
        <p className="text-base leading-relaxed text-slate-600">
          {tier.description}
        </p>
        <ul className="space-y-2 text-sm text-slate-600">
          {tier.features.map(feature => (
            <li key={feature} className="flex items-start gap-2">
              <span
                className="mt-1 h-2 w-2 rounded-full bg-purple-500"
                aria-hidden="true"
              />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
      <Button size="lg" className="mt-8" asChild onClick={tierCta.handleClick}>
        <Link
          href={tier.cta.href}
          locale={resolveLocale(tier.cta.href)}
        >
          {tierCta.label}
        </Link>
      </Button>
    </div>
  );
}

/**
 * Displays pricing tiers with feature lists and localized CTA links.
 *
 * @param pricing - Structured pricing copy from the CMS layer.
 * @param locale - Current locale for internal link routing.
 */
export function LandingPricing({
  pricing,
  locale,
}: {
  pricing: LandingPricing;
  locale: string;
}): JSX.Element {
  const resolveLocale = (href: string) =>
    href.startsWith('/') ? locale : undefined;

  return (
    <section id="pricing" className="py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {pricing.title}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            {pricing.description}
          </p>
        </div>
        <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {pricing.tiers.map((tier, index) => (
            <PricingTier
              key={tier.name}
              tier={tier}
              index={index}
              locale={locale}
              resolveLocale={resolveLocale}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
