/**
 * @file Locale-aware marketing homepage that hydrates content from the
 *       platform CMS module. The page renders hero, feature, testimonial, and
 *       pricing sections sourced from structured JSON.
 */
import { LandingHero } from '@/components/features/landing/Hero';
import { LandingPricing } from '@/components/features/landing/Pricing';
import { LandingTestimonials } from '@/components/features/landing/Testimonials';
import { MarketingHeader } from '@/components/landing/marketing-header';
import { Link } from '@/i18n/routing';
import { getLandingContent } from '@/modules/platform/cms/client';
import type { LandingFeatures } from '@/modules/platform/cms/types';

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Renders the feature grid spotlighting core differentiators for the current
 * locale.
 *
 * @param features - Locale-aware feature copy pulled from the CMS layer.
 */
function renderFeatureGrid(features: LandingFeatures) {
  return (
    <section id="platform" className="py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <span id="solutions" className="sr-only" aria-hidden="true" />
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {features.title}
          </h2>
        </div>
        <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.items.map(feature => (
            <div
              key={feature.title}
              className="flex h-full flex-col gap-4 rounded-3xl border border-slate-100 bg-gradient-to-b from-white to-purple-50/40 p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  aria-hidden="true"
                >
                  <path
                    fill="currentColor"
                    d="M11 2a1 1 0 0 1 .894.553l1.618 3.236 3.57.519a1 1 0 0 1 .554 1.705l-2.584 2.52.61 3.558a1 1 0 0 1-1.451 1.054L12 13.93l-3.212 1.69a1 1 0 0 1-1.451-1.054l.61-3.558-2.584-2.52a1 1 0 0 1 .554-1.705l3.57-.52 1.618-3.235A1 1 0 0 1 11 2Z"
                  />
                </svg>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-slate-900">
                  {feature.title}
                </h3>
                <p className="text-base leading-relaxed text-slate-600">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Marketing homepage entry point. Resolves locale params and hydrates the page
 * with CMS-backed content before rendering sections.
 *
 * @param params - Deferred locale params provided by the Next.js router.
 */
export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  const content = await getLandingContent(locale);

  return (
    <div className="bg-white text-slate-900">
      <MarketingHeader locale={locale} content={content.navigation} />
      <LandingHero
        hero={content.hero}
        socialProof={content.socialProof}
        locale={locale}
      />

      {renderFeatureGrid(content.features)}

      <LandingTestimonials testimonials={content.testimonials} />

      <LandingPricing pricing={content.pricing} locale={locale} />

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
            {content.cta.title}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-purple-100">
            {content.cta.description}
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              href={content.cta.primary.href}
              locale={
                content.cta.primary.href.startsWith('/') ? locale : undefined
              }
              className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-lg font-semibold text-purple-700 shadow-lg transition hover:bg-purple-50"
            >
              {content.cta.primary.label}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
