/**
 * @file Marketing testimonials section that highlights qualitative feedback
 *       from Satya practitioners.
 */
import type { JSX } from 'react';

import type { LandingTestimonials } from '@/modules/platform/cms/types';

/**
 * Displays customer testimonial content, including a highlighted quote and
 * supporting social proof statements that reinforce Loom-app's value.
 *
 * @param testimonials - Locale-aware testimonial content bundle.
 */
export function LandingTestimonials({
  testimonials,
}: {
  testimonials: LandingTestimonials;
}): JSX.Element {
  const { title, highlight, items } = testimonials;

  return (
    <section id="testimonials" className="bg-slate-50/80 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {title}
          </h2>
        </div>
        <div className="mt-12 grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="relative mx-auto flex h-64 w-64 items-center justify-center rounded-full bg-gradient-to-br from-purple-200 via-white to-purple-100 shadow-xl lg:mx-0">
            <span
              className="text-6xl font-serif text-purple-400"
              aria-hidden="true"
            >
              “
            </span>
          </div>
          <blockquote className="space-y-6">
            <p className="text-2xl leading-relaxed text-slate-700 lg:text-3xl">
              {highlight.quote}
            </p>
            <footer>
              <p className="text-lg font-semibold text-slate-900">
                {highlight.name}
              </p>
              <p className="text-sm text-slate-500">{highlight.role}</p>
            </footer>
          </blockquote>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {items.map(testimonial => (
            <div
              key={`${testimonial.name}-${testimonial.role}`}
              className="flex h-full flex-col justify-between gap-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm"
            >
              <p className="text-base leading-relaxed text-slate-600">
                {testimonial.quote}
              </p>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {testimonial.name}
                </p>
                <p className="text-xs text-slate-500">{testimonial.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
